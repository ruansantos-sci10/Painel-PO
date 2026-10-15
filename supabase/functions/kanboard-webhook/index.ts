// Edge Function: kanboard-webhook
// Recebe a mensagem de "Movimentação de solicitação" do Kanboard, extrai os campos
// e abre/resolve a pendência no banco.
//
// URL a configurar no Kanboard:
//   https://<PROJETO>.supabase.co/functions/v1/kanboard-webhook?token=<WEBHOOK_TOKEN>
//
// Segredo necessário (Edge Functions > Secrets): WEBHOOK_TOKEN
// Esta função deve ficar com "Verify JWT" DESLIGADO (o Kanboard não envia token do Supabase).

import { createClient } from "npm:@supabase/supabase-js@2.45.4";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);

// Extrai o texto da mensagem, seja qual for o formato do corpo:
// JSON (ex.: {"content": "..."} estilo Discord), formulário ou texto puro.
function extrairTexto(corpo: string): string {
  const t = corpo.trim();
  if (t.startsWith("{") || t.startsWith("[")) {
    try {
      const partes: string[] = [];
      const coletar = (v: unknown) => {
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

export type Movimentacao = {
  solicitacao_id: number;
  titulo: string;
  prefixo: string | null;
  sprint: string | null;
  atribuido: string | null;
  de: string | null;
  para: string | null;
  movido_por: string | null;
  link: string | null;
};

export function interpretar(texto: string): Movimentacao | null {
  const limpo = texto.replace(/\*\*/g, "").replace(/\r/g, "");
  const campo = (rotulo: string) => {
    const m = limpo.match(new RegExp(`^\\s*(?:>>>\\s*)?${rotulo}\\s*:[ \\t]*(.*)$`, "im"));
    const v = m?.[1]?.trim();
    return v ? v : null;
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

Deno.serve(async (req) => {
  const token = new URL(req.url).searchParams.get("token")?.trim();
  const esperado = Deno.env.get("WEBHOOK_TOKEN")?.trim();
  if (!esperado) {
    return new Response("não autorizado: segredo WEBHOOK_TOKEN não está configurado no Supabase", { status: 401 });
  }
  if (!token) {
    return new Response("não autorizado: a URL chegou sem ?token=", { status: 401 });
  }
  if (token !== esperado) {
    console.log(`Token recebido com ${token.length} caracteres; esperado ${esperado.length}`);
    return new Response(
      `não autorizado: token diferente (recebido ${token.length} caracteres, esperado ${esperado.length})`,
      { status: 401 },
    );
  }
  if (req.method !== "POST") {
    return new Response("use POST", { status: 405 });
  }

  const corpo = await req.text();
  const mov = interpretar(extrairTexto(corpo));

  let resultado: string | null = null;
  let erro: string | null = null;

  if (!mov) {
    erro = "Mensagem fora do formato esperado (campo 'Solicitação' não encontrado)";
  } else {
    const { data, error } = await supabase.rpc("processar_movimentacao", {
      p_solicitacao_id: mov.solicitacao_id,
      p_titulo: mov.titulo,
      p_prefixo: mov.prefixo,
      p_sprint: mov.sprint,
      p_atribuido: mov.atribuido,
      p_de: mov.de,
      p_para: mov.para,
      p_movido_por: mov.movido_por,
      p_link: mov.link,
    });
    if (error) erro = error.message;
    else resultado = data as string;
  }

  // Guarda sempre o texto bruto: se o formato mudar, dá para reprocessar.
  await supabase.from("eventos_kanboard").insert({
    corpo_bruto: corpo,
    solicitacao_id: mov?.solicitacao_id ?? null,
    de_coluna: mov?.de ?? null,
    para_coluna: mov?.para ?? null,
    resultado,
    erro,
  });

  // Responde 200 mesmo com erro de interpretação para o Kanboard não ficar reenviando;
  // o erro fica visível no painel (Configurações > Eventos recebidos).
  return Response.json({ ok: !erro, resultado, erro });
});
