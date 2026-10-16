<script setup>
import { computed } from "vue";
import { Check, Trash2 } from "lucide-vue-next";
import { useRelogio } from "@/composables/useRelogio";
import { useDadosStore } from "@/stores/dados";
import { fmtCurta, parseYmd } from "@/utils/datas";

const props = defineProps({ combinado: { type: Object, required: true } });

const dados = useDadosStore();
const { hoje } = useRelogio();

const c = computed(() => props.combinado);
const feito = computed(() => c.value.status === "feito");

const chip = computed(() => {
  if (feito.value || !c.value.prazo) return null;
  const data = fmtCurta(parseYmd(c.value.prazo));
  if (c.value.prazo < hoje.value) return { tom: "danger", txt: `atrasado · ${data}` };
  if (c.value.prazo === hoje.value) return { tom: "warn", txt: "hoje" };
  return { tom: "", txt: data };
});

const detalhes = computed(() =>
  [c.value.com_quem, c.value.canal, c.value.produto_id ? dados.prodPorId.get(c.value.produto_id)?.nome : null]
    .filter(Boolean).join(" · "));
</script>

<template>
  <div class="todo" :class="{ done: feito }">
    <button
      type="button"
      class="check"
      role="checkbox"
      :aria-checked="feito"
      :aria-label="feito ? 'Marcar como aberto' : 'Marcar como feito'"
      @click="dados.setCombinado(c.id, !feito)"
    >
      <Check />
    </button>
    <div class="main">
      <div class="desc">
        <span>{{ c.descricao }}</span>
        <span v-if="chip" class="badge" :class="chip.tom">{{ chip.txt }}</span>
      </div>
      <div v-if="detalhes" class="detalhes">{{ detalhes }}</div>
    </div>
    <button class="btn ghost icon sm excluir" type="button" title="Excluir" aria-label="Excluir" @click="dados.delCombinado(c.id)">
      <Trash2 />
    </button>
  </div>
</template>

<style scoped>
.todo { display: flex; gap: 11px; align-items: flex-start; padding: calc(var(--pad-item) - 2px) 10px; margin: 0 -10px; border-radius: 10px; transition: background .15s; }
.todo:hover { background: var(--surface-2); }
.check {
  width: 20px; height: 20px; margin-top: 1px; flex: none; border-radius: 50%; cursor: pointer; padding: 0;
  border: 1.5px solid var(--border-strong); background: var(--surface); color: transparent;
  display: grid; place-items: center; transition: background .15s, border-color .15s, color .15s;
}
.check:hover { border-color: var(--accent); color: var(--accent); }
.check svg { width: 12px; height: 12px; stroke-width: 3; }
.done .check { background: var(--ok); border-color: var(--ok); color: #fff; animation: marcar .35s cubic-bezier(.3, 1.6, .5, 1); }
@keyframes marcar { 0% { transform: scale(.6); } 100% { transform: scale(1); } }
.desc > span:first-child { font-weight: 500; }
.main { flex: 1; min-width: 0; }
.desc { display: flex; flex-wrap: wrap; align-items: center; gap: 4px 8px; overflow-wrap: anywhere; }
.detalhes { font-size: 12px; color: var(--muted); margin-top: 2px; }
.done .desc > span:first-child { text-decoration: line-through; color: var(--muted); }
.excluir { opacity: 0; margin: -4px -4px 0 0; }
.todo:hover .excluir, .excluir:focus-visible { opacity: 1; }
.excluir:hover { color: var(--danger); background: var(--danger-soft); }
@media (hover: none) { .excluir { opacity: .7; } }
</style>
