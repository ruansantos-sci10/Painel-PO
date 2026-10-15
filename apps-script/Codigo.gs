/**
 * =====================================================================
 * Painel do PO — Google Apps Script (gratuito, sem cartão)
 *
 * Faz o papel de "servidor" do painel:
 *   doPost              recebe o webhook do Kanboard e abre/resolve pendências no Firestore
 *   sincronizarAgenda   a cada 15 min copia a agenda dos próximos dias para o Firestore
 *   instalar            roda uma vez: cria o gatilho da agenda e faz a 1ª sincronização
 *   testarWebhook       simula um card entrando na coluna do PO (para conferir o acesso)
 *
 * Propriedades do script (Configurações do projeto > Propriedades do script):
 *   FIREBASE_PROJECT_ID  ID do projeto Firebase (ex.: painel-po-12345)
 *   WEBHOOK_TOKEN        senha longa inventada por você; vai na URL do Kanboard
 *   AGENDA_ID            (opcional) ID da agenda; padrão "primary" = sua agenda principal
 *
 * O script grava no Firestore com a sua própria conta Google (dona do projeto Firebase),
 * por isso não depende das regras de segurança nem de Cloud Functions.
 * =====================================================================
 */

const FUSO = "America/Sao_Paulo";
const OFFSET = "-03:00"; // Brasília não tem horário de verão desde 2019
const DIAS_AGENDA = 7; // hoje + 6 dias ficam disponíveis no painel
const MANTER_AGENDA_DIAS = 3; // dias passados que continuam guardados

// ---------------------------------------------------------------------
// Configuração
// ---------------------------------------------------------------------
function config_() {
  const p = PropertiesService.getScriptProperties();
  const projeto = (p.getProperty("FIREBASE_PROJECT_ID") || "").trim();
  if (!projeto) throw new Error("Propriedade do script FIREBASE_PROJECT_ID não configurada.");
  return {
    projeto,
    token: (p.getProperty("WEBHOOK_TOKEN") || "").trim(),
    agendaId: (p.getProperty("AGENDA_ID") || "primary").trim(),
  };
}

// ---------------------------------------------------------------------
// Firestore (API REST) — conversão de valores
// ---------------------------------------------------------------------
function paraValor_(v) {
  if (v === null || v === undefined) return { nullValue: null };
  if (v instanceof Date) return { timestampValue: v.toISOString() };
  if (typeof v === "boolean") return { booleanValue: v };
  if (typeof v === "number") return Number.isInteger(v) ? { integerValue: String(v) } : { doubleValue: v };
  if (typeof v === "string") return { stringValue: v };
  if (Array.isArray(v)) return { arrayValue: { values: v.map(paraValor_) } };
  return { mapValue: { fields: paraCampos_(v) } };
}

function paraCampos_(obj) {
  const campos = {};
  Object.keys(obj).forEach((k) => { campos[k] = paraValor_(obj[k]); });
  return campos;
}

function deValor_(v) {
  if ("stringValue" in v) return v.stringValue;
  if ("integerValue" in v) return Number(v.integerValue);
  if ("doubleValue" in v) return v.doubleValue;
  if ("booleanValue" in v) return v.booleanValue;
  if ("timestampValue" in v) return v.timestampValue;
  if ("arrayValue" in v) return (v.arrayValue.values || []).map(deValor_);
  if ("mapValue" in v) return deCampos_(v.mapValue.fields || {});
  return null;
}

function deCampos_(campos) {
  const obj = {};
  Object.keys(campos).forEach((k) => { obj[k] = deValor_(campos[k]); });
  return obj;
}

function deDocumento_(doc) {
  const caminho = doc.name.split("/documents/")[1];
  return Object.assign({ id: caminho.split("/").pop(), _caminho: caminho }, deCampos_(doc.fields || {}));
}

function filtroIgual_(campo, valor) {
  return { fieldFilter: { field: { fieldPath: campo }, op: "EQUAL", value: paraValor_(valor) } };
}

// ---------------------------------------------------------------------
// Firestore (API REST) — cliente mínimo
// ---------------------------------------------------------------------
function firestore_() {
  const projeto = config_().projeto;
  const base = "https://firestore.googleapis.com/v1/projects/" + projeto + "/databases/(default)/documents";

  function chamar(metodo, caminho, corpo) {
    const opcoes = {
      method: metodo,
      contentType: "application/json",
      // x-goog-user-project: a cota da API é contada no projeto Firebase (e não no projeto oculto do script)
      headers: { Authorization: "Bearer " + ScriptApp.getOAuthToken(), "x-goog-user-project": projeto },
      muteHttpExceptions: true,
    };
    if (corpo) opcoes.payload = JSON.stringify(corpo);
    const resp = UrlFetchApp.fetch(base + caminho, opcoes);
    const codigo = resp.getResponseCode();
    if (codigo === 404 && metodo === "get") return null;
    const texto = resp.getContentText();
    if (codigo >= 300) throw new Error("Firestore respondeu " + codigo + ": " + texto.slice(0, 400));
    return texto ? JSON.parse(texto) : {};
  }

  return {
    obter(caminho) {
      const d = chamar("get", "/" + caminho);
      return d ? deDocumento_(d) : null;
    },
    // filtros: [["campo", valor], ...] — todos de igualdade
    consultar(colecao, filtros) {
      const where = filtros.length === 1
        ? filtroIgual_(filtros[0][0], filtros[0][1])
        : { compositeFilter: { op: "AND", filters: filtros.map((f) => filtroIgual_(f[0], f[1])) } };
      const r = chamar("post", ":runQuery", { structuredQuery: { from: [{ collectionId: colecao }], where } });
      return r.filter((x) => x.document).map((x) => deDocumento_(x.document));
    },
    listarIds(colecao) {
      const r = chamar("get", "/" + colecao + "?pageSize=300");
      return (r.documents || []).map((d) => d.name.split("/").pop());
    },
    criar(colecao, dados) {
      return deDocumento_(chamar("post", "/" + colecao, { fields: paraCampos_(dados) }));
    },
    // Substitui o documento inteiro (cria se não existir)
    gravar(caminho, dados) {
      chamar("patch", "/" + caminho, { fields: paraCampos_(dados) });
    },
    // Altera só os campos informados de um documento existente
    atualizar(caminho, dados) {
      const mascara = Object.keys(dados).map((k) => "updateMask.fieldPaths=" + encodeURIComponent(k)).join("&");
      chamar("patch", "/" + caminho + "?" + mascara + "&currentDocument.exists=true", { fields: paraCampos_(dados) });
    },
    apagar(caminho) {
      chamar("delete", "/" + caminho);
    },
  };
}

// ---------------------------------------------------------------------
// Kanboard: leitura da mensagem
// ---------------------------------------------------------------------

// Extrai o texto da mensagem, seja qual for o formato do corpo:
// JSON (ex.: {"content": "..."} estilo Discord), formulário ou texto puro.
function extrairTexto_(corpo) {
  const t = String(corpo || "").trim();
  if (t.charAt(0) === "{" || t.charAt(0) === "[") {
    try {
      const partes = [];
      const coletar = (v) => {
        if (typeof v === "string") partes.push(v);
        else if (Array.isArray(v)) v.forEach(coletar);
        else if (v && typeof v === "object") Object.keys(v).forEach((k) => coletar(v[k]));
      };
      coletar(JSON.parse(t));
      return partes.join("\n");
    } catch (e) { /* não era JSON válido: segue como texto */ }
  }
  if (/^[\w.-]+=/.test(t) && t.indexOf("%") >= 0) {
    try {
      return t.split("&").map((par) => decodeURIComponent((par.split("=")[1] || "").replace(/\+/g, " "))).join("\n");
    } catch (e) { /* segue como texto */ }
  }
  return t;
}

function interpretar_(texto) {
  const limpo = texto.replace(/\*\*/g, "").replace(/\r/g, "");
  const campo = (rotulo) => {
    const m = limpo.match(new RegExp("^\\s*(?:>>>\\s*)?" + rotulo + "\\s*:[ \\t]*(.*)$", "im"));
    const v = m && m[1] ? m[1].trim() : "";
    return v || null;
  };

  const sol = campo("Solicitação");
  const m = sol && sol.match(/^(\d+)\s*-\s*(.*)$/);
  if (!m) return null;

  const titulo = m[2].trim();
  const pref = titulo.match(/^\(([^)]+)\)/);

  // "Sprint: ➙ SCI WEB - REFINAMENTO" -> fica com o que vem depois da seta
  let sprint = campo("Sprint");
  if (sprint) {
    const partes = sprint.split(/➙|->|→/);
    sprint = partes[partes.length - 1].trim() || null;
  }

  const linkCampo = campo("Link da solicitação no Kanboard");
  const link = linkCampo && linkCampo.match(/https?:\/\/\S+/);

  return {
    solicitacao_id: Number(m[1]),
    titulo,
    prefixo: pref ? pref[1].trim() : null,
    sprint,
    atribuido: campo("Atribuído à"),
    de: campo("Movido da coluna"),
    para: campo("Movido para a coluna"),
    movido_por: campo("Movido por"),
    link: link ? link[0] : null,
  };
}

const coluna_ = (s) => String(s || "").trim().toUpperCase();

// Entrou na coluna do PO -> abre (ou atualiza) a pendência
// Saiu da coluna do PO   -> resolve a pendência
// A classificação por produto/time é feita pelo próprio painel, a partir das regras.
function processarMovimentacao_(db, mov) {
  const config = db.obter("config/geral");
  const colunaPo = coluna_(config && config.coluna_po);
  if (!colunaPo) return "ignorado";

  const abertas = () => db.consultar("pendencias", [["solicitacao_id", mov.solicitacao_id], ["status", "aberta"]]);

  if (coluna_(mov.para) === colunaPo) {
    const dados = {
      titulo: mov.titulo, prefixo: mov.prefixo, sprint: mov.sprint,
      atribuido: mov.atribuido, movido_por: mov.movido_por, link: mov.link,
    };
    const existentes = abertas();
    if (existentes.length) {
      db.atualizar(existentes[0]._caminho, dados);
      return "pendencia_atualizada";
    }
    db.criar("pendencias", Object.assign(dados, {
      solicitacao_id: mov.solicitacao_id,
      produto_id: null, time: null, classificacao_manual: false,
      status: "aberta", entrou_em: new Date(),
      resolvida_em: null, resolvida_por: null, coluna_destino: null,
    }));
    return "pendencia_aberta";
  }

  if (coluna_(mov.de) === colunaPo) {
    const existentes = abertas();
    existentes.forEach((p) => db.atualizar(p._caminho, {
      status: "resolvida", resolvida_em: new Date(), resolvida_por: mov.movido_por, coluna_destino: mov.para,
    }));
    return existentes.length ? "pendencia_resolvida" : "saida_sem_pendencia";
  }

  return "ignorado";
}

// Processa o corpo recebido e guarda o evento (com o texto bruto) em eventos_kanboard.
function receberMensagem_(db, corpo) {
  const mov = interpretar_(extrairTexto_(corpo));
  let resultado = null;
  let erro = null;
  if (!mov) {
    erro = "Mensagem fora do formato esperado (campo 'Solicitação' não encontrado)";
  } else {
    try {
      resultado = processarMovimentacao_(db, mov);
    } catch (e) {
      erro = e.message;
    }
  }
  // Guarda sempre o texto bruto: se o formato mudar, dá para reprocessar.
  db.criar("eventos_kanboard", {
    recebido_em: new Date(),
    corpo_bruto: corpo,
    solicitacao_id: mov ? mov.solicitacao_id : null,
    de_coluna: mov ? mov.de : null,
    para_coluna: mov ? mov.para : null,
    resultado,
    erro,
  });
  return { ok: !erro, resultado, erro };
}

// ---------------------------------------------------------------------
// Web app: URL do webhook do Kanboard  (.../exec?token=WEBHOOK_TOKEN)
// ---------------------------------------------------------------------
function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

function doPost(e) {
  const cfg = config_();
  const token = String((e && e.parameter && e.parameter.token) || "").trim();
  if (!cfg.token) return json_({ ok: false, erro: "não autorizado: propriedade WEBHOOK_TOKEN não configurada no script" });
  if (!token) return json_({ ok: false, erro: "não autorizado: a URL chegou sem ?token=" });
  if (token !== cfg.token) {
    return json_({ ok: false, erro: "não autorizado: token diferente (recebido " + token.length + " caracteres, esperado " + cfg.token.length + ")" });
  }

  const corpo = e.postData ? e.postData.contents : "";
  // Uma mensagem por vez: evita abrir duas pendências para o mesmo card.
  const trava = LockService.getScriptLock();
  trava.waitLock(30000);
  try {
    // Sempre responde 200 (o Apps Script não permite outro código); o erro fica no painel.
    return json_(receberMensagem_(firestore_(), corpo));
  } finally {
    trava.releaseLock();
  }
}

function doGet() {
  return ContentService.createTextOutput("Painel do PO: webhook ativo. Envie as movimentações do Kanboard via POST.");
}

// ---------------------------------------------------------------------
// Agenda: copia os eventos dos próximos dias para agenda/{AAAA-MM-DD}
// ---------------------------------------------------------------------
function inicioDoDia_(data) {
  return new Date(data + "T00:00:00" + OFFSET);
}

function proximosDias_(inicio, n) {
  const base = inicioDoDia_(inicio).getTime();
  const dias = [];
  for (let i = 0; i < n; i++) {
    // +12h evita qualquer borda de fuso ao formatar
    dias.push(Utilities.formatDate(new Date(base + i * 86400000 + 12 * 3600000), FUSO, "yyyy-MM-dd"));
  }
  return dias;
}

function linkReuniao_(ev) {
  if (ev.hangoutLink) return ev.hangoutLink;
  const pontos = (ev.conferenceData && ev.conferenceData.entryPoints) || [];
  const video = pontos.filter((p) => p.entryPointType === "video")[0];
  if (video) return video.uri;
  const textos = [ev.location, ev.description];
  for (let i = 0; i < textos.length; i++) {
    const m = textos[i] && textos[i].match(/https:\/\/(?:meet\.google\.com|[\w.-]*zoom\.us|teams\.microsoft\.com|discord\.(?:gg|com))\/[^\s"<>)]+/);
    if (m) return m[0];
  }
  return null;
}

// Converte os eventos da API do Google Agenda no formato do painel, separados por dia.
function eventosPorDia_(itens, datas) {
  const validos = itens.filter((ev) => {
    if (ev.status === "cancelled") return false;
    const eu = (ev.attendees || []).filter((a) => a.self)[0];
    return !(eu && eu.responseStatus === "declined"); // convites recusados não aparecem
  });

  const dias = {};
  datas.forEach((data) => {
    const iniDia = inicioDoDia_(data).getTime();
    const fimDia = iniDia + 86400000;
    dias[data] = validos.filter((ev) => {
      if (ev.start.date) return data >= ev.start.date && data < (ev.end && ev.end.date ? ev.end.date : ev.start.date + "~");
      const ini = new Date(ev.start.dateTime).getTime();
      const fim = new Date(ev.end.dateTime).getTime();
      return fim > iniDia && ini < fimDia;
    }).map((ev) => {
      const diaInteiro = !!ev.start.date;
      return {
        titulo: ev.summary || "(sem título)",
        inicio: diaInteiro ? inicioDoDia_(ev.start.date).toISOString() : new Date(ev.start.dateTime).toISOString(),
        fim: diaInteiro ? inicioDoDia_(ev.end.date).toISOString() : new Date(ev.end.dateTime).toISOString(),
        dia_inteiro: diaInteiro,
        local: ev.location || null,
        link: linkReuniao_(ev),
      };
    }).sort((x, y) => Number(y.dia_inteiro) - Number(x.dia_inteiro) || x.inicio.localeCompare(y.inicio));
  });
  return dias;
}

function sincronizarAgenda() {
  const cfg = config_();
  const db = firestore_();
  const hoje = Utilities.formatDate(new Date(), FUSO, "yyyy-MM-dd");
  const datas = proximosDias_(hoje, DIAS_AGENDA);
  const timeMin = inicioDoDia_(datas[0]).toISOString();
  const timeMax = new Date(inicioDoDia_(datas[datas.length - 1]).getTime() + 86400000).toISOString();

  let itens = [];
  let pagina;
  do {
    const opcoes = { timeMin, timeMax, singleEvents: true, orderBy: "startTime", maxResults: 250 };
    if (pagina) opcoes.pageToken = pagina;
    const r = Calendar.Events.list(cfg.agendaId, opcoes);
    itens = itens.concat(r.items || []);
    pagina = r.nextPageToken;
  } while (pagina);

  const dias = eventosPorDia_(itens, datas);
  const agora = new Date();
  datas.forEach((data) => db.gravar("agenda/" + data, { data, eventos: dias[data], atualizado_em: agora }));

  // Limpa dias antigos
  const limite = Utilities.formatDate(new Date(agora.getTime() - MANTER_AGENDA_DIAS * 86400000), FUSO, "yyyy-MM-dd");
  db.listarIds("agenda").filter((id) => id < limite).forEach((id) => db.apagar("agenda/" + id));

  return dias[hoje].length;
}

// ---------------------------------------------------------------------
// Instalação e testes (rode pelo editor: selecione a função e clique em Executar)
// ---------------------------------------------------------------------
function instalar() {
  config_();
  ScriptApp.getProjectTriggers()
    .filter((t) => t.getHandlerFunction() === "sincronizarAgenda")
    .forEach((t) => ScriptApp.deleteTrigger(t));
  ScriptApp.newTrigger("sincronizarAgenda").timeBased().everyMinutes(15).create();
  const n = sincronizarAgenda();
  Logger.log("Pronto! Agenda sincronizada (" + n + " evento(s) hoje) e gatilho de 15 em 15 minutos criado.");
}

function testarWebhook() {
  const msg = [
    "**Solicitação**: 999999 - (TESTE) Card de teste do painel",
    "**Sprint**: ➙ TESTE",
    "**Movido da coluna**: NOVOS",
    "**Movido para a coluna**: AGUARDANDO PO",
    "**Movido por**: Teste",
  ].join("\n");
  Logger.log(JSON.stringify(receberMensagem_(firestore_(), msg)));
}
