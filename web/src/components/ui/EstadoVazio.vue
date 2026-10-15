<script setup>
defineProps({
  icone: { type: [Object, Function], default: null },
  texto: { type: String, required: true },
  compacto: { type: Boolean, default: false },
  tom: { type: String, default: "" },
});
</script>

<template>
  <div class="vazio" :class="[{ compacto }, tom]">
    <span v-if="icone" class="ic"><component :is="icone" /></span>
    <span>{{ texto }}</span>
  </div>
</template>

<style scoped>
.vazio {
  display: flex; flex-direction: column; align-items: center; gap: 8px; text-align: center;
  padding: 26px 12px 18px; color: var(--muted); font-size: 13px;
}
.vazio.compacto { flex-direction: row; justify-content: center; padding: 12px; font-size: 12.5px; }
.ic { width: 40px; height: 40px; border-radius: 12px; display: grid; place-items: center; background: var(--surface-2); color: var(--faint); }
.compacto .ic { width: auto; height: auto; background: none; }
.ic :deep(svg) { width: 18px; height: 18px; }
.compacto .ic :deep(svg) { width: 15px; height: 15px; }
.ok .ic { background: var(--ok-soft); color: var(--ok); }
.danger { color: var(--danger); }
.danger .ic { background: var(--danger-soft); color: var(--danger); }
</style>
