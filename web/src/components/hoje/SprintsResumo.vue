<script setup>
import { computed } from "vue";
import { useRelogio } from "@/composables/useRelogio";
import { useDadosStore } from "@/stores/dados";
import { fmtCurta, parseYmd } from "@/utils/datas";
import { sprintAtual } from "@/utils/sprint";

const dados = useDadosStore();
const { hoje } = useRelogio();

const cartoes = computed(() => {
  const feriados = new Set(dados.feriados.map((f) => f.data));
  const dia = parseYmd(hoje.value);
  return dados.sprints.map((cfg) => {
    const s = sprintAtual(cfg, dia, feriados);
    let flag = null;
    if (s.primeiro) flag = { txt: "1º dia útil", tom: "accent" };
    else if (s.ultimo) flag = { txt: "Último dia útil", tom: "warn" };
    else if (!s.hojeUtil) flag = { txt: "Hoje não é dia útil", tom: "" };
    return {
      time: cfg.time,
      nome: dados.nomeTime(cfg.time),
      flag,
      dia: s.dia,
      total: s.total,
      hojeUtil: s.hojeUtil,
      periodo: `${fmtCurta(s.inicio)} → ${fmtCurta(s.fim)}`,
      proxima: fmtCurta(s.proxInicio),
    };
  });
});
</script>

<template>
  <div class="sprints">
    <article v-for="c in cartoes" :key="c.time" class="sprint" :class="`t${c.time}`">
      <header>
        <h3><span class="dot" :class="`t${c.time}`"></span>{{ c.nome }}</h3>
        <span v-if="c.flag" class="badge" :class="c.flag.tom">{{ c.flag.txt }}</span>
      </header>
      <div class="numero">
        <strong>Dia {{ c.dia }}</strong><span> de {{ c.total }} úteis</span>
      </div>
      <div class="dias" :aria-label="`Dia ${c.dia} de ${c.total}`">
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
    </article>
  </div>
</template>

<style scoped>
.sprints { display: grid; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); gap: 14px; margin-bottom: 18px; }
.sprint {
  --cor: var(--t1);
  background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius-lg);
  padding: 15px 18px 14px; box-shadow: var(--shadow);
}
.sprint.t2 { --cor: var(--t2); }
header { display: flex; justify-content: space-between; align-items: center; gap: 8px; }
h3 { margin: 0; font-size: 13.5px; font-weight: 600; display: flex; align-items: center; gap: 8px; color: var(--text-2); }
.numero { margin: 10px 0 10px; font-size: 13px; color: var(--muted); }
.numero strong { font-size: 22px; font-weight: 700; letter-spacing: -.02em; color: var(--text); }
.dias { display: flex; gap: 4px; }
.dias i { flex: 1; height: 6px; border-radius: 99px; background: var(--surface-3); }
.dias i.feito { background: var(--cor); opacity: .85; }
.dias i.atual { background: var(--cor); box-shadow: 0 0 0 3px color-mix(in srgb, var(--cor) 25%, transparent); }
footer { display: flex; justify-content: space-between; gap: 8px; margin-top: 10px; font-size: 12px; color: var(--muted); font-variant-numeric: tabular-nums; }
</style>
