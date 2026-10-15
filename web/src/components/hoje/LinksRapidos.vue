<script setup>
import { ArrowUpRight } from "lucide-vue-next";
import { useDadosStore } from "@/stores/dados";

const dados = useDadosStore();

// Inicial colorida para reconhecer o atalho de relance (sem buscar ícones em serviços externos)
const CORES = ["#4f6bed", "#9b51e0", "#0ea5e9", "#10b981", "#f59e0b", "#ef4444", "#ec4899", "#64748b"];
const cor = (nome) => CORES[[...nome].reduce((s, c) => s + c.charCodeAt(0), 0) % CORES.length];
</script>

<template>
  <nav v-if="dados.links.length" class="links" aria-label="Links rápidos">
    <a v-for="l in dados.links" :key="l.id" :href="l.url" target="_blank" rel="noopener">
      <span class="inicial" :style="{ background: cor(l.nome) }" aria-hidden="true">{{ l.nome.charAt(0).toUpperCase() }}</span>
      {{ l.nome }}
      <ArrowUpRight class="seta" />
    </a>
  </nav>
</template>

<style scoped>
.links { display: flex; gap: 6px; flex-wrap: wrap; }
.links a {
  display: inline-flex; align-items: center; gap: 7px; height: 32px; padding: 0 9px 0 6px;
  background: var(--surface); border: 1px solid var(--border); border-radius: 10px;
  color: var(--text-2); font-size: 13px; font-weight: 500; box-shadow: var(--shadow-sm);
  transition: border-color .15s, color .15s, transform .15s;
}
.links a:hover { border-color: var(--border-strong); color: var(--text); text-decoration: none; transform: translateY(-1px); }
.inicial { width: 20px; height: 20px; border-radius: 6px; display: grid; place-items: center; color: #fff; font-size: 11px; font-weight: 700; }
.seta { width: 13px; height: 13px; color: var(--faint); }
</style>
