<script setup>
// Abertura da tela Hoje: saudação, data, um resumo em uma frase e os links rápidos.
import { computed } from "vue";
import LinksRapidos from "./LinksRapidos.vue";
import { useRelogio } from "@/composables/useRelogio";
import { useAgendaStore } from "@/stores/agenda";
import { useDadosStore } from "@/stores/dados";
import { dataPorExtenso, saudacao } from "@/utils/datas";

const dados = useDadosStore();
const agenda = useAgendaStore();
const { agora, hoje } = useRelogio();

const plural = (n, um, varios) => `${n} ${n === 1 ? um : varios}`;

const resumo = computed(() => {
  const partes = [];
  const pend = dados.pendenciasAbertas.length;
  partes.push(pend ? plural(pend, "card aguardando você", "cards aguardando você") : "nenhum card aguardando você");

  const eventos = agenda.res?.eventos;
  if (eventos) {
    const ms = agora.value.getTime();
    const restantes = eventos.filter((e) => !e.dia_inteiro && new Date(e.fim).getTime() > ms).length;
    partes.push(restantes ? plural(restantes, "reunião pela frente", "reuniões pela frente") : "nenhuma reunião pela frente");
  }

  const vencendo = dados.combinados.filter((c) => c.status !== "feito" && c.prazo && c.prazo <= hoje.value).length;
  if (vencendo) partes.push(plural(vencendo, "combinado para hoje", "combinados para hoje"));

  const texto = partes.length > 1 ? `${partes.slice(0, -1).join(", ")} e ${partes.at(-1)}` : partes[0];
  return `Você tem ${texto}.`;
});
</script>

<template>
  <section class="resumo">
    <div class="texto">
      <p class="data">{{ dataPorExtenso(agora) }}</p>
      <h1>{{ saudacao(agora) }}</h1>
      <p class="frase">{{ dados.carregando ? "Carregando seu dia…" : resumo }}</p>
    </div>
    <LinksRapidos />
  </section>
</template>

<style scoped>
.resumo { display: flex; align-items: flex-end; justify-content: space-between; gap: 18px; flex-wrap: wrap; margin-bottom: 22px; }
.texto { min-width: 0; }
.data { margin: 0; font-size: 12.5px; font-weight: 500; color: var(--muted); }
h1 { margin: 2px 0 4px; font-size: 28px; font-weight: 700; letter-spacing: -.03em; line-height: 1.2; }
.frase { margin: 0; color: var(--text-2); font-size: 14.5px; }
@media (max-width: 560px) { h1 { font-size: 24px; } }
</style>
