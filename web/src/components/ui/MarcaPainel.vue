<script setup>
defineProps({ tamanho: { type: Number, default: 30 } });
</script>

<template>
  <svg :width="tamanho" :height="tamanho" viewBox="0 0 100 100" aria-hidden="true" class="marca">
    <defs>
      <linearGradient id="marca-g" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stop-color="#4f6bed" />
        <stop offset="1" stop-color="#7c4ddb" />
      </linearGradient>
    </defs>
    <rect width="100" height="100" rx="24" fill="url(#marca-g)" />
    <path d="M30 52l13 13 28-30" stroke="white" stroke-width="10" fill="none" stroke-linecap="round" stroke-linejoin="round" />
  </svg>
</template>

<style scoped>
.marca { flex: none; display: block; }
</style>
