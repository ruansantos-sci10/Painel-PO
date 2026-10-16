<script setup>
import RegrasCard from "@/components/config/RegrasCard.vue";
import ProdutosCard from "@/components/config/ProdutosCard.vue";
import TimesSprintsCard from "@/components/config/TimesSprintsCard.vue";
import FeriadosCard from "@/components/config/FeriadosCard.vue";
import KanboardCard from "@/components/config/KanboardCard.vue";
import AtalhosCard from "@/components/config/AtalhosCard.vue";
import EventosCard from "@/components/config/EventosCard.vue";
</script>

<template>
  <div class="config">
    <header class="topo">
      <h1>Configurações</h1>
      <p>Times, produtos, regras de classificação e integrações do painel. Tudo é salvo na hora.</p>
    </header>

    <section class="secao">
      <h2>Times e calendário</h2>
      <div class="grade">
        <TimesSprintsCard />
        <FeriadosCard />
      </div>
    </section>

    <section class="secao">
      <h2>Classificação</h2>
      <div class="grade">
        <RegrasCard />
        <ProdutosCard />
      </div>
    </section>

    <section class="secao">
      <h2>Integrações</h2>
      <div class="grade">
        <KanboardCard />
        <AtalhosCard />
      </div>
    </section>

    <section class="secao">
      <h2>Diagnóstico</h2>
      <EventosCard />
    </section>
  </div>
</template>

<style scoped>
.topo { margin-bottom: 8px; }
h1 { margin: 0 0 4px; font-size: 32px; font-weight: 800; letter-spacing: -.025em; }
.topo p { margin: 0; color: var(--text-2); font-size: 14.5px; }
.secao { margin-top: 26px; }
h2 { margin: 0 0 12px; font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: .07em; color: var(--muted); }
.grade { display: grid; grid-template-columns: repeat(auto-fit, minmax(min(380px, 100%), 1fr)); gap: var(--gap); align-items: start; }
@media (max-width: 560px) { h1 { font-size: 24px; } }
</style>
