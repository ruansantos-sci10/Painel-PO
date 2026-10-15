<script setup>
// Cartão padrão do painel: ícone, título, contador opcional, descrição e conteúdo à direita.
defineProps({
  titulo: { type: String, required: true },
  icone: { type: [Object, Function], default: null },
  descricao: { type: String, default: "" },
  contador: { type: [Number, String], default: null },
  destacar: { type: Boolean, default: false },
});
</script>

<template>
  <section class="card">
    <header class="hd">
      <div class="titulo">
        <span v-if="icone" class="icone"><component :is="icone" /></span>
        <div>
          <h2>
            {{ titulo }}
            <span v-if="contador !== null" class="count" :class="{ on: destacar }">{{ contador }}</span>
          </h2>
          <p v-if="descricao" class="desc">{{ descricao }}</p>
        </div>
      </div>
      <div v-if="$slots.extra" class="extra"><slot name="extra" /></div>
    </header>
    <div class="bd"><slot /></div>
  </section>
</template>

<style scoped>
.card {
  background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius-lg);
  box-shadow: var(--shadow); min-width: 0;
}
.hd { display: flex; align-items: flex-start; justify-content: space-between; gap: 12px; padding: 16px 18px 4px; }
.titulo { display: flex; align-items: flex-start; gap: 11px; min-width: 0; }
.icone {
  width: 32px; height: 32px; border-radius: 9px; flex: none;
  display: grid; place-items: center; background: var(--surface-2); color: var(--text-2);
  border: 1px solid var(--border);
}
.icone :deep(svg) { width: 16px; height: 16px; }
h2 { margin: 0; font-size: 15px; font-weight: 600; letter-spacing: -.01em; display: flex; align-items: center; gap: 8px; line-height: 32px; }
.desc { margin: -4px 0 0; font-size: 12.5px; color: var(--muted); }
.count {
  min-width: 22px; height: 20px; padding: 0 7px; border-radius: 99px; display: inline-grid; place-items: center;
  font-size: 11.5px; font-weight: 600; line-height: 1; background: var(--surface-2); color: var(--muted);
}
.count.on { background: var(--accent); color: var(--on-accent); }
.extra { display: flex; align-items: center; gap: 6px; color: var(--muted); font-size: 12.5px; min-height: 32px; white-space: nowrap; }
.bd { padding: 8px 18px 16px; container-type: inline-size; }
</style>
