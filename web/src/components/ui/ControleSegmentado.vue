<script setup>
// Grupo de opções exclusivas (como abas pequenas): [{ valor, rotulo, icone? }]
defineProps({
  modelValue: { type: [String, Number], required: true },
  opcoes: { type: Array, required: true },
  rotulo: { type: String, required: true },
});
defineEmits(["update:modelValue"]);
</script>

<template>
  <div class="segmentado" role="radiogroup" :aria-label="rotulo">
    <button
      v-for="o in opcoes"
      :key="o.valor"
      type="button"
      role="radio"
      :aria-checked="modelValue === o.valor"
      :class="{ on: modelValue === o.valor }"
      @click="$emit('update:modelValue', o.valor)"
    >
      <component :is="o.icone" v-if="o.icone" />
      {{ o.rotulo }}
    </button>
  </div>
</template>

<style scoped>
.segmentado { display: flex; gap: 2px; padding: 3px; background: var(--surface-2); border: 1px solid var(--border); border-radius: 11px; }
button {
  flex: 1; display: inline-flex; align-items: center; justify-content: center; gap: 6px; height: 32px; padding: 0 10px;
  border: 0; border-radius: 8px; background: none; color: var(--muted); font-size: 13px; font-weight: 600; cursor: pointer;
  transition: background .15s, color .15s;
}
button:hover { color: var(--text); }
button.on { background: var(--surface); color: var(--text); box-shadow: var(--shadow-sm), 0 0 0 1px var(--border); }
button svg { width: 15px; height: 15px; }
</style>
