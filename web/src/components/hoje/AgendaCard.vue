<script setup>
import { computed } from "vue";
import { CalendarClock, CalendarDays, CalendarX2, TriangleAlert, Video } from "lucide-vue-next";
import PainelCard from "@/components/ui/PainelCard.vue";
import EstadoVazio from "@/components/ui/EstadoVazio.vue";
import { useRelogio } from "@/composables/useRelogio";
import { DEMO } from "@/services/backend";
import { useDadosStore } from "@/stores/dados";
import { fmtHora } from "@/utils/datas";

// O Apps Script atualiza a agenda a cada 15 min; acima disso avisamos que algo parou.
const ATRASO_MAX_MIN = 45;

const dados = useDadosStore();
const { agora } = useRelogio();

const res = computed(() => dados.agenda);

const eventos = computed(() => {
  const ms = agora.value.getTime();
  return (res.value?.eventos ?? []).map((e) => {
    const ini = new Date(e.inicio).getTime();
    const fim = new Date(e.fim).getTime();
    return {
      ...e,
      estado: e.dia_inteiro ? "dia" : fim < ms ? "past" : ini <= ms ? "now" : "",
      inicioTxt: e.dia_inteiro ? "Dia todo" : fmtHora(e.inicio),
      fimTxt: e.dia_inteiro ? "" : fmtHora(e.fim),
    };
  });
});

const aviso = computed(() => {
  const em = res.value?.atualizado_em;
  if (DEMO || !em || agora.value.getTime() - new Date(em).getTime() < ATRASO_MAX_MIN * 60000) return "";
  return `Sem atualização desde as ${fmtHora(em)}. Confira o gatilho do Apps Script.`;
});

const contador = computed(() => (res.value?.eventos ? res.value.eventos.length : "–"));
// "Próxima em 25 min" quando a reunião começa em até 2 horas
const proxima = computed(() => {
  const ms = agora.value.getTime();
  const e = (res.value?.eventos ?? []).find((x) => !x.dia_inteiro && new Date(x.inicio).getTime() > ms);
  if (!e) return "";
  const min = Math.round((new Date(e.inicio).getTime() - ms) / 60000);
  if (min > 120) return "";
  return min < 60 ? `próxima em ${min} min` : `próxima em ${Math.floor(min / 60)}h${String(min % 60).padStart(2, "0")}`;
});

const subtitulo = computed(() =>
  res.value?.atualizado_em ? `atualizada às ${fmtHora(res.value.atualizado_em)}` : "Google Agenda");
</script>

<template>
  <PainelCard id="agenda" titulo="Agenda de hoje" :icone="CalendarDays" tom="sky" :contador="contador">
    <template #extra>
      <span v-if="proxima" class="badge accent">{{ proxima }}</span>
      <span v-else>{{ subtitulo }}</span>
    </template>

    <EstadoVazio v-if="dados.agendaFalha" :icone="TriangleAlert" :texto="dados.agendaFalha" tom="danger" />
    <div v-else-if="res === undefined" class="esqueleto" aria-label="Carregando agenda">
      <i v-for="n in 3" :key="n"></i>
    </div>
    <EstadoVazio
      v-else-if="res === null"
      :icone="CalendarClock"
      texto="A agenda de hoje ainda não foi sincronizada. Confira se o Apps Script está instalado (README, passo 5)."
    />
    <template v-else>
      <div v-if="aviso" class="aviso"><TriangleAlert /> {{ aviso }}</div>
      <EstadoVazio v-if="!eventos.length" :icone="CalendarX2" texto="Sem reuniões hoje." />
      <ol v-else class="linha">
        <li v-for="(e, i) in eventos" :key="i" class="ev" :class="e.estado">
          <div class="hora">
            <span>{{ e.inicioTxt }}</span>
            <small v-if="e.fimTxt">{{ e.fimTxt }}</small>
          </div>
          <span class="marco" aria-hidden="true"></span>
          <div class="corpo">
            <div class="tt">
              {{ e.titulo }}
              <span v-if="e.estado === 'now'" class="badge accent">agora</span>
            </div>
            <a v-if="e.link" class="entrar" :href="e.link" target="_blank" rel="noopener"><Video /> Entrar na reunião</a>
          </div>
        </li>
      </ol>
    </template>
  </PainelCard>
</template>

<style scoped>
.linha { list-style: none; margin: 4px 0 0; padding: 0; }
.ev { position: relative; display: grid; grid-template-columns: 52px 14px 1fr; gap: 10px; padding: calc(var(--pad-item) - 3px) 0; }
.hora { text-align: right; font-variant-numeric: tabular-nums; font-weight: 600; font-size: 13px; line-height: 1.3; }
.hora small { display: block; font-weight: 400; color: var(--faint); font-size: 11.5px; }
.marco { position: relative; display: block; }
.marco::before {
  content: ""; position: absolute; left: 50%; top: 5px; width: 9px; height: 9px; transform: translateX(-50%);
  border-radius: 50%; background: var(--surface); border: 2px solid var(--border-strong); z-index: 1;
}
.marco::after {
  content: ""; position: absolute; left: 50%; top: 0; bottom: -16px; width: 2px; transform: translateX(-50%); background: var(--border);
}
.ev:first-child .marco::after { top: 8px; }
.ev:last-child .marco::after { display: none; }
.corpo { min-width: 0; }
.tt { overflow-wrap: anywhere; font-weight: 500; display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
.entrar { display: inline-flex; align-items: center; gap: 5px; margin-top: 3px; font-size: 12.5px; font-weight: 500; }
.entrar svg { width: 14px; height: 14px; }

.ev.past { opacity: .5; }
.ev.past .marco::before { background: var(--border-strong); }
.ev.now .hora { color: var(--accent-text); }
.ev.now .corpo { background: var(--accent-soft); margin: -4px 0; padding: 4px 10px; border-radius: 10px; }
.ev.now .marco::before { background: var(--accent); border-color: var(--accent); box-shadow: 0 0 0 4px var(--accent-soft); }
.ev.dia .hora { color: var(--muted); font-size: 12px; }
.ev.dia .marco::before { border-radius: 3px; border-color: var(--t2); }

.aviso { display: flex; gap: 6px; align-items: flex-start; font-size: 12.5px; color: var(--warn); background: var(--warn-soft); border-radius: 9px; padding: 8px 10px; margin: 4px 0 8px; }
.aviso svg { width: 14px; height: 14px; flex: none; margin-top: 2px; }

.esqueleto { display: grid; gap: 10px; padding: 10px 0; }
.esqueleto i { height: 34px; border-radius: 9px; background: linear-gradient(90deg, var(--surface-2), var(--surface-3), var(--surface-2)); background-size: 200% 100%; animation: brilho 1.2s ease-in-out infinite; }
@keyframes brilho { from { background-position: 100% 0; } to { background-position: -100% 0; } }
</style>
