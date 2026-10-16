<script setup>
// Cartão padrão do painel: ícone (com cor por tipo), título, contador opcional, descrição e conteúdo à direita.
defineProps({
  titulo: { type: String, required: true },
  icone: { type: [Object, Function], default: null },
  // Cor do ícone: accent (cor de destaque), sky, amber, green, rose, violet ou slate
  tom: { type: String, default: "slate" },
  descricao: { type: String, default: "" },
  contador: { type: [Number, String], default: null },
  destacar: { type: Boolean, default: false },
});
</script>

<template>
  <section class="card">
    <header class="hd">
      <div class="titulo">
        <span v-if="icone" class="icone" :class="`tom-${tom}`"><component :is="icone" /></span>
        <div class="textos">
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
  box-shadow: var(--shadow); min-width: 0; scroll-margin-top: 80px;
  transition: box-shadow .2s, border-color .2s;
}
.card:hover { box-shadow: var(--shadow-hover); }
.hd { display: flex; align-items: flex-start; justify-content: space-between; gap: 12px; padding: var(--pad-card) var(--pad-card) 4px; }
.titulo { display: flex; align-items: flex-start; gap: 12px; min-width: 0; }
.textos { min-width: 0; }
.icone {
  --h: var(--hue-slate);
  width: 36px; height: 36px; border-radius: 11px; flex: none; display: grid; place-items: center;
  color: var(--h); background: color-mix(in srgb, var(--h) 13%, var(--surface));
  box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--h) 18%, transparent);
}
.icone :deep(svg) { width: 18px; height: 18px; }
.tom-accent { --h: var(--accent); }
.tom-sky { --h: var(--hue-sky); }
.tom-amber { --h: var(--hue-amber); }
.tom-green { --h: var(--hue-green); }
.tom-rose { --h: var(--hue-rose); }
.tom-violet { --h: var(--hue-violet); }
h2 { margin: 0; font-size: 16px; font-weight: 700; letter-spacing: -.01em; display: flex; align-items: center; gap: 8px; line-height: 36px; }
.desc { margin: -6px 0 0; font-size: 12.5px; color: var(--muted); }
.count {
  min-width: 22px; height: 21px; padding: 0 7px; border-radius: 99px; display: inline-grid; place-items: center;
  font-size: 12px; font-weight: 700; line-height: 1; background: var(--surface-2); color: var(--muted);
}
.count.on { background: var(--accent); color: var(--on-accent); }
.extra { display: flex; align-items: center; gap: 6px; color: var(--muted); font-size: 12.5px; min-height: 36px; white-space: nowrap; }
.bd { padding: 8px var(--pad-card) var(--pad-card); container-type: inline-size; }
</style>
