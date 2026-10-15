// Edge Function: agenda
// Lê o "endereço secreto no formato iCal" do Google Agenda e devolve os eventos de um dia,
// já expandindo eventos recorrentes (dailies, plannings etc.).
//
// Segredo necessário (Edge Functions > Secrets): ICAL_URL
// Esta função fica com "Verify JWT" LIGADO: só o painel logado consegue chamar.
//
// Para não ser bloqueada pelo Google (erro 429), guarda o arquivo da agenda na tabela
// cache_agenda e só consulta o Google de novo depois de CACHE_MIN minutos.
//
// Chamada: GET /functions/v1/agenda?data=AAAA-MM-DD   (sem data = hoje)

import ICAL from "npm:ical.js@1.5.0";
import { createClient } from "npm:@supabase/supabase-js@2.45.4";

// Brasília não tem horário de verão desde 2019: UTC-3 fixo.
const OFFSET_HORAS = 3;

// Consulta o Google no máximo a cada 15 min; depois de uma recusa, espera 15 min para tentar de novo.
const CACHE_MIN = 15;
const ESPERA_ERRO_MIN = 15;

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);

type Agenda = { ics: string; atualizado_em: string; aviso: string | null };

async function obterIcs(icalUrl: string): Promise<Agenda> {
  const { data: c } = await supabase.from("cache_agenda").select("*").eq("id", 1).maybeSingle();
  const minutosDesde = (t?: string | null) => (t ? (Date.now() - new Date(t).getTime()) / 60000 : Infinity);
  const usarCache = (aviso: string | null): Agenda => ({ ics: c!.ics, atualizado_em: c!.buscado_em, aviso });

  if (c?.ics && minutosDesde(c.buscado_em) < CACHE_MIN) return usarCache(null);

  if (c?.ultimo_erro && minutosDesde(c.tentado_em) < ESPERA_ERRO_MIN) {
    if (c.ics) return usarCache(`O Google recusou a última consulta (${c.ultimo_erro}). Mostrando a versão salva.`);
    throw new Error(`Google Agenda recusou a consulta (${c.ultimo_erro}). Nova tentativa em até ${ESPERA_ERRO_MIN} min.`);
  }

  const tentado_em = new Date().toISOString();
  try {
    const resp = await fetch(icalUrl, { headers: { "User-Agent": "PainelPO/1.0" } });
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    const ics = await resp.text();
    await supabase.from("cache_agenda").upsert({ id: 1, ics, buscado_em: tentado_em, tentado_em, ultimo_erro: null });
    return { ics, atualizado_em: tentado_em, aviso: null };
  } catch (e) {
    const msg = (e as Error).message;
    await supabase.from("cache_agenda").upsert({
      id: 1, ics: c?.ics ?? null, buscado_em: c?.buscado_em ?? null, tentado_em, ultimo_erro: msg,
    });
    if (c?.ics) return usarCache(`O Google recusou a consulta (${msg}). Mostrando a versão salva.`);
    throw new Error(`Google Agenda respondeu ${msg}. Nova tentativa em até ${ESPERA_ERRO_MIN} min.`);
  }
}

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function hojeEmBrasilia(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" }).format(new Date());
}

function linkReuniao(...textos: (string | null | undefined)[]): string | null {
  for (const t of textos) {
    const m = t?.match(/https:\/\/(?:meet\.google\.com|[\w.-]*zoom\.us|teams\.microsoft\.com|discord\.(?:gg|com))\/[^\s"<>)]+/);
    if (m) return m[0];
  }
  return null;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });

  try {
    const icalUrl = Deno.env.get("ICAL_URL");
    if (!icalUrl) throw new Error("Segredo ICAL_URL não configurado");

    const data = new URL(req.url).searchParams.get("data") ?? hojeEmBrasilia();
    const [a, m, d] = data.split("-").map(Number);
    const inicioDia = new Date(Date.UTC(a, m - 1, d, OFFSET_HORAS));
    const fimDia = new Date(inicioDia.getTime() + 24 * 3600 * 1000);

    const agenda = await obterIcs(icalUrl);
    const comp = new ICAL.Component(ICAL.parse(agenda.ics));

    for (const tz of comp.getAllSubcomponents("vtimezone")) {
      ICAL.TimezoneService.register(tz);
    }

    // Separa eventos-mestre de exceções (ocorrências remarcadas de um evento recorrente)
    // deno-lint-ignore no-explicit-any
    const mestres = new Map<string, any>();
    // deno-lint-ignore no-explicit-any
    const excecoes: any[] = [];
    for (const v of comp.getAllSubcomponents("vevent")) {
      const ev = new ICAL.Event(v);
      if (v.hasProperty("recurrence-id")) excecoes.push(ev);
      else mestres.set(ev.uid, ev);
    }
    for (const exc of excecoes) {
      const mestre = mestres.get(exc.uid);
      if (mestre) mestre.relateException(exc);
    }

    const eventos: Record<string, unknown>[] = [];
    // deno-lint-ignore no-explicit-any
    const adicionar = (ev: any, ini: any, fim: any) => {
      if (ev.component.getFirstPropertyValue("status") === "CANCELLED") return;
      const jsIni: Date = ini.toJSDate();
      const jsFim: Date = fim.toJSDate();
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
      // deno-lint-ignore no-explicit-any
      let prox: any;
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

    eventos.sort((x, y) =>
      Number(y.dia_inteiro) - Number(x.dia_inteiro) ||
      String(x.inicio).localeCompare(String(y.inicio))
    );

    return Response.json(
      { data, eventos, atualizado_em: agenda.atualizado_em, aviso: agenda.aviso },
      { headers: cors },
    );
  } catch (e) {
    return Response.json({ erro: (e as Error).message }, { status: 500, headers: cors });
  }
});
