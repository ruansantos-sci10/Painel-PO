<script setup>
import { computed } from "vue";
import { useRelogio } from "@/composables/useRelogio";
import { useDadosStore } from "@/stores/dados";
import { fmtCurta, parseYmd } from "@/utils/datas";
import { sprintAtual } from "@/utils/sprint";

const dados = useDadosStore();
const { hoje } = useRelogio();

const RAIO = 26;
const CIRCUNFERENCIA = 2 * Math.PI * RAIO;

const cartoes = computed(() => {
  const feriados = new Set(dados.feriados.map((f) => f.data));
  const dia = parseYmd(hoje.value);
  return dados.sprints.map((cfg) => {
    const s = sprintAtual(cfg, dia, feriados);
    let flag = null;
    if (s.primeiro) flag = { txt: "1º dia útil", tom: "accent" };
    else if (s.ultimo) flag = { txt: "Último dia útil", tom: "warn" };
    else if (!s.hojeUtil) flag = { txt: "Hoje não é dia útil", tom: "" };
    const restam = s.total - s.dia; // dias úteis depois de hoje
    return {
      time: cfg.time,
      nome: dados.nomeTime(cfg.time),
      flag,
      dia: s.dia,
      total: s.total,
      hojeUtil: s.hojeUtil,
      progresso: s.total ? s.dia / s.total : 0,
      restam: restam === 0 ? "a sprint termina hoje" : `${restam} ${restam === 1 ? "dia útil" : "dias úteis"} depois de hoje`,
      periodo: `${fmtCurta(s.inicio)} → ${fmtCurta(s.fim)}`,
      proxima: fmtCurta(s.proxInicio),
    };
  });
});
</script>

<template>
  <div class="sprints">
    <article v-for="c in cartoes" :key="c.time" class="sprint" :class="`t${c.time}`">
      <div class="anel" role="img" :aria-label="`Dia ${c.dia} de ${c.total} dias úteis`">
        <svg viewBox="0 0 64 64">
          <circle class="trilho" cx="32" cy="32" :r="RAIO" />
          <circle
            class="progresso"
            cx="32" cy="32" :r="RAIO"
            :stroke-dasharray="CIRCUNFERENCIA"
            :stroke-dashoffset="CIRCUNFERENCIA * (1 - c.progresso)"
          />
        </svg>
        <span class="centro"><strong>{{ c.dia }}</strong><small>/{{ c.total }}</small></span>
      </div>

      <div class="info">
        <header>
          <h3><span class="dot" :class="`t${c.time}`"></span>{{ c.nome }}</h3>
          <span v-if="c.flag" class="badge" :class="c.flag.tom">{{ c.flag.txt }}</span>
        </header>
        <p class="restam">{{ c.restam }}</p>
        <div class="dias" aria-hidden="true">
          <i
            v-for="n in c.total"
            :key="n"
            :class="{ feito: n < c.dia || (n === c.dia && !c.hojeUtil), atual: n === c.dia && c.hojeUtil }"
          ></i>
        </div>
        <footer>
          <span>{{ c.periodo }}</span>
          <span>próxima {{ c.proxima }}</span>
        </footer>
      </div>
    </article>
  </div>
</template>

<style scoped>
.sprints { display: grid; grid-template-columns: repeat(auto-fit, minmax(min(300px, 100%), 1fr)); gap: var(--gap); margin-bottom: var(--gap); }
.sprint {
  --cor: var(--t1);
  position: relative; overflow: hidden; display: flex; align-items: center; gap: 18px;
  background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius-lg);
  padding: calc(var(--pad-card) - 4px) var(--pad-card); box-shadow: var(--shadow);
  transition: box-shadow .2s;
}
.sprint:hover { box-shadow: var(--shadow-hover); }
.sprint.t2 { --cor: var(--t2); }
/* Faixa com a cor do time */
.sprint::before { content: ""; position: absolute; inset: 0 auto 0 0; width: 4px; background: var(--cor); }

.anel { position: relative; width: 68px; height: 68px; flex: none; }
.anel svg { width: 100%; height: 100%; transform: rotate(-90deg); }
.anel circle { fill: none; stroke-width: 7; }
.trilho { stroke: var(--surface-3); }
.progresso { stroke: var(--cor); stroke-linecap: round; transition: stroke-dashoffset .6s ease; }
.centro { position: absolute; inset: 0; display: grid; place-content: center; text-align: center; line-height: 1; }
.centro strong { font-size: 21px; font-weight: 800; letter-spacing: -.02em; }
.centro small { font-size: 11px; color: var(--muted); font-weight: 600; margin-top: 2px; }

.info { flex: 1; min-width: 0; }
header { display: flex; justify-content: space-between; align-items: center; gap: 8px; flex-wrap: wrap; }
h3 { margin: 0; font-size: 15px; font-weight: 700; display: flex; align-items: center; gap: 8px; }
.restam { margin: 2px 0 8px; font-size: 12.5px; color: var(--muted); }
.dias { display: flex; gap: 3px; }
.dias i { flex: 1; height: 5px; border-radius: 99px; background: var(--surface-3); }
.dias i.feito { background: color-mix(in srgb, var(--cor) 55%, var(--surface-3)); }
.dias i.atual { background: var(--cor); box-shadow: 0 0 0 2px color-mix(in srgb, var(--cor) 28%, transparent); }
footer { display: flex; justify-content: space-between; gap: 8px; margin-top: 8px; font-size: 12px; color: var(--muted); }
</style>
