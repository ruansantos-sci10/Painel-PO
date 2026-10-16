<script setup>
import { computed } from "vue";
import ResumoDia from "@/components/hoje/ResumoDia.vue";
import SprintsResumo from "@/components/hoje/SprintsResumo.vue";
import PendenciasCard from "@/components/hoje/PendenciasCard.vue";
import AgendaCard from "@/components/hoje/AgendaCard.vue";
import CombinadosCard from "@/components/hoje/CombinadosCard.vue";
import { useDadosStore } from "@/stores/dados";

const dados = useDadosStore();

// Blocos e posição da coluna de pendências vêm de Personalizar → Tela Hoje
const blocos = computed(() => dados.aparencia.blocos);
const temLateral = computed(() => blocos.value.agenda || blocos.value.combinados);
const direita = computed(() => dados.aparencia.pendencias_lado === "direita");
</script>

<template>
  <div class="hoje">
    <ResumoDia />
    <SprintsResumo v-if="blocos.sprints" />
    <div class="grid" :class="{ direita, unica: !temLateral }">
      <PendenciasCard class="principal" />
      <div v-if="temLateral" class="coluna">
        <AgendaCard v-if="blocos.agenda" />
        <CombinadosCard v-if="blocos.combinados" />
      </div>
    </div>
  </div>
</template>

<style scoped>
.grid { display: grid; grid-template-columns: minmax(0, 1.5fr) minmax(0, 1fr); gap: var(--gap); align-items: start; }
.grid.direita { grid-template-columns: minmax(0, 1fr) minmax(0, 1.5fr); }
.grid.direita .principal { order: 2; }
.grid.unica { grid-template-columns: minmax(0, 1fr); }
.coluna { display: grid; gap: var(--gap); min-width: 0; }
@media (max-width: 940px) {
  .grid, .grid.direita { grid-template-columns: 1fr; }
  .grid.direita .principal { order: 0; }
}
</style>
