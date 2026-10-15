<script setup>
import { onMounted } from "vue";
import ResumoDia from "@/components/hoje/ResumoDia.vue";
import SprintsResumo from "@/components/hoje/SprintsResumo.vue";
import PendenciasCard from "@/components/hoje/PendenciasCard.vue";
import AgendaCard from "@/components/hoje/AgendaCard.vue";
import CombinadosCard from "@/components/hoje/CombinadosCard.vue";
import { useAgendaStore } from "@/stores/agenda";

const agenda = useAgendaStore();
onMounted(() => agenda.carregar());
</script>

<template>
  <div class="hoje">
    <ResumoDia />
    <SprintsResumo />
    <div class="grid">
      <PendenciasCard />
      <div class="coluna">
        <AgendaCard />
        <CombinadosCard />
      </div>
    </div>
  </div>
</template>

<style scoped>
.grid { display: grid; grid-template-columns: minmax(0, 1.5fr) minmax(0, 1fr); gap: 18px; align-items: start; }
.coluna { display: grid; gap: 18px; min-width: 0; }
@media (max-width: 940px) { .grid { grid-template-columns: 1fr; } }
</style>
