<script setup>
// Marca do painel (ligadura "PO" com check). Geometria em services/logo.js;
// as cores seguem a cor de destaque escolhida em Personalizar.
import { useId } from "vue";
import { LOGO } from "@/services/logo";

defineProps({ tamanho: { type: Number, default: 30 } });

// ids únicos: a marca pode aparecer mais de uma vez na página
const id = useId();
</script>

<template>
  <svg :width="tamanho" :height="tamanho" viewBox="0 0 100 100" aria-hidden="true" class="marca">
    <defs>
      <linearGradient :id="`${id}-g`" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" class="claro" />
        <stop offset="1" class="escuro" />
      </linearGradient>
      <linearGradient :id="`${id}-b`" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="#fff" stop-opacity=".22" />
        <stop offset=".55" stop-color="#fff" stop-opacity="0" />
      </linearGradient>
    </defs>
    <rect width="100" height="100" :rx="LOGO.raio" :fill="`url(#${id}-g)`" />
    <rect width="100" height="100" :rx="LOGO.raio" :fill="`url(#${id}-b)`" />
    <g fill="none" stroke="#fff" stroke-linecap="round" stroke-linejoin="round">
      <path :d="LOGO.haste" :stroke-width="LOGO.traco" />
      <circle :cx="LOGO.anel.cx" :cy="LOGO.anel.cy" :r="LOGO.anel.r" :stroke-width="LOGO.traco" />
      <path :d="LOGO.check" :stroke-width="LOGO.tracoCheck" stroke-opacity=".9" />
    </g>
  </svg>
</template>

<style scoped>
.marca { flex: none; display: block; filter: drop-shadow(0 2px 6px color-mix(in srgb, var(--accent-base) 35%, transparent)); }
/* Mesma regra de coresLogo() em services/logo.js */
.claro { stop-color: color-mix(in srgb, var(--accent-base) 80%, #ffffff); }
.escuro { stop-color: color-mix(in srgb, var(--accent-base) 60%, #1e1b4b); }
</style>
