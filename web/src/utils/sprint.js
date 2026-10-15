// Cálculo da sprint atual (dias úteis, pulando fins de semana e feriados).
// Basta uma data de início de qualquer sprint: as seguintes são deduzidas pela duração.

import { addDias, parseYmd, ymd } from "./datas";

const ehUtil = (d, feriados) => d.getDay() !== 0 && d.getDay() !== 6 && !feriados.has(ymd(d));

export function sprintAtual(cfg, hoje, feriados) {
  const ref = parseYmd(cfg.inicio_referencia);
  const dur = cfg.duracao_dias || 14;
  const diff = Math.round((hoje - ref) / 86400000);
  const ini = addDias(ref, Math.floor(diff / dur) * dur);

  const uteis = [];
  for (let i = 0; i < dur; i++) {
    const d = addDias(ini, i);
    if (ehUtil(d, feriados)) uteis.push(d);
  }

  const hs = ymd(hoje);
  const hojeUtil = uteis.some((d) => ymd(d) === hs);
  const dia = uteis.filter((d) => ymd(d) <= hs).length;

  // 1º dia útil da próxima sprint
  let proxInicio = addDias(ini, dur);
  for (let i = dur; i < dur * 2; i++) {
    const d = addDias(ini, i);
    if (ehUtil(d, feriados)) { proxInicio = d; break; }
  }

  return {
    inicio: uteis[0] ?? ini,
    fim: uteis[uteis.length - 1] ?? addDias(ini, dur - 1),
    dia,
    total: uteis.length,
    hojeUtil,
    primeiro: hojeUtil && dia === 1,
    ultimo: hojeUtil && dia === uteis.length,
    proxInicio,
  };
}
