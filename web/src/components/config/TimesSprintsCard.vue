<script setup>
import { Users } from "lucide-vue-next";
import PainelCard from "@/components/ui/PainelCard.vue";
import { useDadosStore } from "@/stores/dados";

const dados = useDadosStore();

// Salva o nome ao sair do campo ou apertar Enter; se ficar vazio, volta ao nome atual.
function salvarNome(time, evento) {
  const nome = evento.target.value.trim();
  if (!nome) {
    evento.target.value = dados.nomeTime(time);
    return;
  }
  if (nome !== dados.nomeTime(time)) dados.renomearTime(time, nome);
}

function mudarDuracao(time, valor) {
  const dias = Number(valor);
  if (dias >= 5 && dias <= 35) dados.setSprint(time, { duracao_dias: dias });
}
</script>

<template>
  <PainelCard
    titulo="Times e sprints"
    :icone="Users"
    tom="accent"
    descricao="O nome aparece em todo o painel. Basta uma data de início de qualquer sprint."
  >
    <div class="times">
      <div v-for="s in dados.sprints" :key="s.time" class="time" :class="`t${s.time}`">
        <label class="campo nome">
          <span>Nome do time</span>
          <div class="com-dot">
            <span class="dot" :class="`t${s.time}`"></span>
            <input
              type="text"
              :value="dados.nomeTime(s.time)"
              maxlength="40"
              :aria-label="`Nome do time ${s.time}`"
              @change="salvarNome(s.time, $event)"
              @keydown.enter.prevent="$event.target.blur()"
            >
          </div>
        </label>
        <label class="campo">
          <span>Início de referência</span>
          <input
            type="date"
            :value="s.inicio_referencia"
            @change="$event.target.value && dados.setSprint(s.time, { inicio_referencia: $event.target.value })"
          >
        </label>
        <label class="campo dur">
          <span>Duração (dias)</span>
          <input
            type="number" min="5" max="35"
            :value="s.duracao_dias"
            @change="mudarDuracao(s.time, $event.target.value)"
          >
        </label>
      </div>
    </div>
    <p class="help rodape">Feriados e fins de semana não contam como dia útil da sprint.</p>
  </PainelCard>
</template>

<style scoped>
.times { display: grid; gap: 10px; margin-top: 6px; }
.time {
  display: grid; grid-template-columns: 1fr 120px; gap: 10px; padding: 12px;
  border: 1px solid var(--border); border-radius: 12px; background: var(--surface-2);
}
.nome { grid-column: 1 / -1; }
.campo { display: grid; gap: 4px; min-width: 0; }
.campo > span { font-size: 11.5px; font-weight: 500; color: var(--muted); }
.com-dot { position: relative; }
.com-dot .dot { position: absolute; left: 12px; top: 50%; transform: translateY(-50%); width: 9px; height: 9px; }
.com-dot input { padding-left: 28px; font-weight: 600; }
.rodape { margin: 12px 0 0; }
</style>
