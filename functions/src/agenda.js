// Agenda: lê o "endereço secreto no formato iCal" do Google Agenda e devolve os eventos de um dia,
// já expandindo eventos recorrentes (dailies, plannings etc.).
//
// Segredo necessário: ICAL_URL  (firebase functions:secrets:set ICAL_URL)
// Função "callable": só o painel logado e autorizado consegue chamar.
//
// Para não ser bloqueada pelo Google (erro 429), guarda os eventos dos próximos dias em
// cache/agenda e só consulta o Google de novo depois de CACHE_MIN minutos.

import ICAL from "ical.js";
import { onCall, HttpsError } from "firebase-functions/v2/https";
import { defineSecret } from "firebase-functions/params";
import { Timestamp } from "firebase-admin/firestore";
import { db, exigirAutorizado } from "./base.js";

const ICAL_URL = defineSecret("ICAL_URL");

// Brasília não tem horário de verão desde 2019: UTC-3 fixo.
const OFFSET_HORAS = 3;

// Consulta o Google no máximo a cada 15 min; depois de uma recusa, espera 15 min para tentar de novo.
const CACHE_MIN = 15;
const ESPERA_ERRO_MIN = 15;

// Quantos dias a partir de hoje ficam guardados no cache (servem de reserva se o Google falhar).
const DIAS_NO_CACHE = 7;

const ymd = (d) => d.toISOString().slice(0, 10);

function hojeEmBrasilia() {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" }).format(new Date());
}

function proximosDias(inicio, n) {
  const [a, m, d] = inicio.split("-").map(Number);
  return Array.from({ length: n }, (_, i) => ymd(new Date(Date.UTC(a, m - 1, d + i))));
}

function linkReuniao(...textos) {
  for (const t of textos) {
    const m = t?.match(/https:\/\/(?:meet\.google\.com|[\w.-]*zoom\.us|teams\.microsoft\.com|discord\.(?:gg|com))\/[^\s"<>)]+/);
    if (m) return m[0];
  }
  return null;
}

// Lê o arquivo iCal uma vez, separando eventos-mestre de exceções
// (ocorrências remarcadas de um evento recorrente).
export function lerCalendario(ics) {
  const comp = new ICAL.Component(ICAL.parse(ics));
  for (const tz of comp.getAllSubcomponents("vtimezone")) {
    ICAL.TimezoneService.register(tz);
  }
  const mestres = new Map();
  const excecoes = [];
  for (const v of comp.getAllSubcomponents("vevent")) {
    const ev = new ICAL.Event(v);
    if (v.hasProperty("recurrence-id")) excecoes.push(ev);
    else mestres.set(ev.uid, ev);
  }
  for (const exc of excecoes) {
    mestres.get(exc.uid)?.relateException(exc);
  }
  return { mestres, excecoes };
}

export function eventosDoDia({ mestres, excecoes }, data) {
  const [a, m, d] = data.split("-").map(Number);
  const inicioDia = new Date(Date.UTC(a, m - 1, d, OFFSET_HORAS));
  const fimDia = new Date(inicioDia.getTime() + 24 * 3600 * 1000);
  const eventos = [];

  const adicionar = (ev, ini, fim) => {
    if (ev.component.getFirstPropertyValue("status") === "CANCELLED") return;
    const jsIni = ini.toJSDate();
    const jsFim = fim.toJSDate();
    if (ini.isDate) {
      // Dia inteiro: compara datas (o fim é exclusivo no iCal)
      const dIni = ini.toString().slice(0, 10);
      const dFim = fim.isDate && fim.compare(ini) > 0 ? fim.toString().slice(0, 10) : null;
      if (data < dIni || (dFim ? data >= dFim : data !== dIni)) return;
    } else if (jsFim <= inicioDia || jsIni >= fimDia) {
      return;
    }
    eventos.push({
      titulo: ev.summary || "(sem título)",
      inicio: jsIni.toISOString(),
      fim: jsFim.toISOString(),
      dia_inteiro: ini.isDate,
      local: ev.location || null,
      link: linkReuniao(ev.location, ev.description),
    });
  };

  for (const ev of mestres.values()) {
    if (!ev.isRecurring()) {
      adicionar(ev, ev.startDate, ev.endDate ?? ev.startDate);
      continue;
    }
    const it = ev.iterator();
    let prox;
    let guarda = 0;
    while ((prox = it.next()) && guarda++ < 5000) {
      if (prox.toJSDate() >= fimDia) break;
      const det = ev.getOccurrenceDetails(prox);
      adicionar(det.item, det.startDate, det.endDate);
    }
  }

  // Exceções cujo mestre não está no arquivo
  for (const exc of excecoes) {
    if (!mestres.has(exc.uid)) adicionar(exc, exc.startDate, exc.endDate ?? exc.startDate);
  }

  return eventos.sort((x, y) =>
    Number(y.dia_inteiro) - Number(x.dia_inteiro) || x.inicio.localeCompare(y.inicio));
}

async function agendaDoDia(icalUrl, data) {
  const ref = db.doc("cache/agenda");
  const c = (await ref.get()).data() ?? null;
  const salvo = c?.dias?.[data];
  const minutosDesde = (t) => (t ? (Date.now() - t.toMillis()) / 60000 : Infinity);
  const usarCache = (aviso) => ({ eventos: salvo, atualizado_em: c.buscado_em.toDate().toISOString(), aviso });

  if (salvo && minutosDesde(c.buscado_em) < CACHE_MIN) return usarCache(null);

  if (c?.ultimo_erro && minutosDesde(c.tentado_em) < ESPERA_ERRO_MIN) {
    if (salvo) return usarCache(`O Google recusou a última consulta (${c.ultimo_erro}). Mostrando a versão salva.`);
    throw new HttpsError("unavailable", `Google Agenda recusou a consulta (${c.ultimo_erro}). Nova tentativa em até ${ESPERA_ERRO_MIN} min.`);
  }

  const agora = Timestamp.now();
  try {
    const resp = await fetch(icalUrl, { headers: { "User-Agent": "PainelPO/1.0" } });
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    const cal = lerCalendario(await resp.text());
    const datas = new Set([data, ...proximosDias(hojeEmBrasilia(), DIAS_NO_CACHE)]);
    const dias = Object.fromEntries([...datas].map((d) => [d, eventosDoDia(cal, d)]));
    await ref.set({ dias, buscado_em: agora, tentado_em: agora, ultimo_erro: null });
    return { eventos: dias[data], atualizado_em: agora.toDate().toISOString(), aviso: null };
  } catch (e) {
    await ref.set({ tentado_em: agora, ultimo_erro: e.message }, { merge: true });
    if (salvo) return usarCache(`O Google recusou a consulta (${e.message}). Mostrando a versão salva.`);
    throw new HttpsError("unavailable", `Google Agenda respondeu ${e.message}. Nova tentativa em até ${ESPERA_ERRO_MIN} min.`);
  }
}

// Chamada pelo painel: httpsCallable(functions, "agenda")({ data: "AAAA-MM-DD" })  (sem data = hoje)
export const agenda = onCall({ secrets: [ICAL_URL] }, async (request) => {
  await exigirAutorizado(request);
  const icalUrl = ICAL_URL.value()?.trim();
  if (!icalUrl) throw new HttpsError("failed-precondition", "Segredo ICAL_URL não configurado");

  const pedida = request.data?.data;
  const data = /^\d{4}-\d{2}-\d{2}$/.test(pedida ?? "") ? pedida : hojeEmBrasilia();
  return { data, ...(await agendaDoDia(icalUrl, data)) };
});
