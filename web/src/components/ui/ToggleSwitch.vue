<script setup>
defineProps({
  modelValue: { type: Boolean, default: false },
  rotulo: { type: String, required: true },
});
defineEmits(["update:modelValue"]);
</script>

<template>
  <button
    type="button"
    role="switch"
    class="switch"
    :class="{ on: modelValue }"
    :aria-checked="modelValue"
    :aria-label="rotulo"
    @click="$emit('update:modelValue', !modelValue)"
  >
    <span class="knob"></span>
  </button>
</template>

<style scoped>
.switch {
  width: 34px; height: 20px; border-radius: 99px; border: 0; padding: 2px; cursor: pointer; flex: none;
  background: var(--border-strong); transition: background .18s; display: inline-flex;
}
.switch.on { background: var(--accent); }
.knob { width: 16px; height: 16px; border-radius: 50%; background: #fff; box-shadow: 0 1px 2px rgba(0, 0, 0, .25); transition: transform .18s; }
.switch.on .knob { transform: translateX(14px); }
</style>
