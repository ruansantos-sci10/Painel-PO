// Webhook do Kanboard: recebe a mensagem de "Movimentação de solicitação", extrai os campos
// e abre/resolve a pendência no Firestore.
//
// URL a configurar no Kanboard:
//   https://southamerica-east1-<PROJETO>.cloudfunctions.net/kanboardWebhook?token=<WEBHOOK_TOKEN>
//
// Segredo necessário: WEBHOOK_TOKEN  (firebase functions:secrets:set WEBHOOK_TOKEN)

import { onRequest } from "firebase-functions/v2/https";
import { defineSecret } from "firebase-functions/params";
import { FieldValue } from "firebase-admin/firestore";
import { db } from "./base.js";
import { carregarContexto, classificar } from "./classificacao.js";

const WEBHOOK_TOKEN = defineSecret("WEBHOOK_TOKEN");

// Extrai o texto da mensagem, seja qual for o formato do corpo:
// JSON (ex.: {"content": "..."} estilo Discord), formulário ou texto puro.
export function extrairTexto(corpo) {
  const t = corpo.trim();
  if (t.startsWith("{") || t.startsWith("[")) {
    try {
      const partes = [];
      const coletar = (v) => {
        if (typeof v === "string") partes.push(v);
        else if (Array.isArray(v)) v.forEach(coletar);
        else if (v && typeof v === "object") Object.values(v).forEach(coletar);
      };
      coletar(JSON.parse(t));
      return partes.join("\n");
    } catch { /* não era JSON válido: segue como texto */ }
  }
  if (/^[\w.-]+=/.test(t) && t.includes("%")) {
    try {
      return [...new URLSearchParams(t).values()].join("\n");
    } catch { /* segue como texto */ }
  }
  return t;
}

export function interpretar(texto) {
  const limpo = texto.replace(/\*\*/g, "").replace(/\r/g, "");
  const campo = (rotulo) => {
    const m = limpo.match(new RegExp(`^\\s*(?:>>>\\s*)?${rotulo}\\s*:[ \\t]*(.*)$`, "im"));
    const v = m?.[1]?.trim();
    return v || null;
  };

  const sol = campo("Solicitação");
  const m = sol?.match(/^(\d+)\s*-\s*(.*)$/);
  if (!m) return null;

  const titulo = m[2].trim();
  const prefixo = titulo.match(/^\(([^)]+)\)/)?.[1]?.trim() ?? null;

  // "Sprint: ➙ SCI WEB - REFINAMENTO" -> fica com o que vem depois da seta
  let sprint = campo("Sprint");
  if (sprint) {
    const partes = sprint.split(/➙|->|→/);
    sprint = partes[partes.length - 1].trim() || null;
  }

  const link = campo("Link da solicitação no Kanboard")?.match(/https?:\/\/\S+/)?.[0] ?? null;

  return {
    solicitacao_id: Number(m[1]),
    titulo,
    prefixo,
    sprint,
    atribuido: campo("Atribuído à"),
    de: campo("Movido da coluna"),
    para: campo("Movido para a coluna"),
    movido_por: campo("Movido por"),
    link,
  };
}

const coluna = (s) => String(s ?? "").trim().toUpperCase();

const abertaDa = (solicitacaoId) =>
  db.collection("pendencias").where("solicitacao_id", "==", solicitacaoId).where("status", "==", "aberta");

// Entrou na coluna do PO -> abre (ou atualiza) a pendência
// Saiu da coluna do PO   -> resolve a pendência
export async function processarMovimentacao(mov) {
  const config = await db.doc("config/geral").get();
  const colunaPo = coluna(config.get("coluna_po"));
  if (!colunaPo) return "ignorado";

  if (coluna(mov.para) === colunaPo) {
    const c = classificar(await carregarContexto(), mov.prefixo, mov.sprint);
    const dados = {
      titulo: mov.titulo, prefixo: mov.prefixo, sprint: mov.sprint,
      atribuido: mov.atribuido, movido_por: mov.movido_por, link: mov.link,
    };
    return db.runTransaction(async (t) => {
      const existentes = await t.get(abertaDa(mov.solicitacao_id).limit(1));
      if (!existentes.empty) {
        const atual = existentes.docs[0];
        t.update(atual.ref, atual.get("classificacao_manual") ? dados : { ...dados, ...c });
        return "pendencia_atualizada";
      }
      t.create(db.collection("pendencias").doc(), {
        ...dados, ...c,
        solicitacao_id: mov.solicitacao_id,
        classificacao_manual: false,
        status: "aberta",
        entrou_em: FieldValue.serverTimestamp(),
        resolvida_em: null, resolvida_por: null, coluna_destino: null,
      });
      return "pendencia_aberta";
    });
  }

  if (coluna(mov.de) === colunaPo) {
    return db.runTransaction(async (t) => {
      const existentes = await t.get(abertaDa(mov.solicitacao_id));
      existentes.docs.forEach((d) => t.update(d.ref, {
        status: "resolvida",
        resolvida_em: FieldValue.serverTimestamp(),
        resolvida_por: mov.movido_por,
        coluna_destino: mov.para,
      }));
      return existentes.empty ? "saida_sem_pendencia" : "pendencia_resolvida";
    });
  }

  return "ignorado";
}

export const kanboardWebhook = onRequest({ secrets: [WEBHOOK_TOKEN] }, async (req, res) => {
  const token = String(req.query.token ?? "").trim();
  const esperado = WEBHOOK_TOKEN.value()?.trim();
  if (!esperado) {
    res.status(401).send("não autorizado: segredo WEBHOOK_TOKEN não está configurado no Firebase");
    return;
  }
  if (!token) {
    res.status(401).send("não autorizado: a URL chegou sem ?token=");
    return;
  }
  if (token !== esperado) {
    console.log(`Token recebido com ${token.length} caracteres; esperado ${esperado.length}`);
    res.status(401).send(`não autorizado: token diferente (recebido ${token.length} caracteres, esperado ${esperado.length})`);
    return;
  }
  if (req.method !== "POST") {
    res.status(405).send("use POST");
    return;
  }

  const corpo = req.rawBody ? req.rawBody.toString("utf8") : String(req.body ?? "");
  const mov = interpretar(extrairTexto(corpo));

  let resultado = null;
  let erro = null;
  if (!mov) {
    erro = "Mensagem fora do formato esperado (campo 'Solicitação' não encontrado)";
  } else {
    try {
      resultado = await processarMovimentacao(mov);
    } catch (e) {
      erro = e.message;
    }
  }

  // Guarda sempre o texto bruto: se o formato mudar, dá para reprocessar.
  await db.collection("eventos_kanboard").add({
    recebido_em: FieldValue.serverTimestamp(),
    corpo_bruto: corpo,
    solicitacao_id: mov?.solicitacao_id ?? null,
    de_coluna: mov?.de ?? null,
    para_coluna: mov?.para ?? null,
    resultado,
    erro,
  });

  // Responde 200 mesmo com erro de interpretação para o Kanboard não ficar reenviando;
  // o erro fica visível no painel (Configurações > Eventos recebidos).
  res.json({ ok: !erro, resultado, erro });
});
