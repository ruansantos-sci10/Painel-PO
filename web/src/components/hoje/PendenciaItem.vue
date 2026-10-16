<script setup>
import { computed } from "vue";
import { Check, Clock, RotateCcw, UserRound } from "lucide-vue-next";
import { useRelogio } from "@/composables/useRelogio";
import { useDadosStore } from "@/stores/dados";
import { idade } from "@/utils/datas";

const props = defineProps({
  pendencia: { type: Object, required: true },
  resolvida: { type: Boolean, default: false },
});

const dados = useDadosStore();
const { agora } = useRelogio();

const p = computed(() => props.pendencia);
const espera = computed(() => idade(p.value.entrou_em, agora.value.getTime()));
const tomIdade = computed(() => (espera.value.dias >= 5 ? "danger" : espera.value.dias >= 2 ? "warn" : ""));
const resolvidaHa = computed(() => idade(p.value.resolvida_em, agora.value.getTime()).txt);

// Produtos ativos por time; o produto atual entra mesmo se estiver inativo.
const gruposProduto = computed(() => dados.times.map((t) => ({
  ...t,
  produtos: dados.produtos.filter((x) => x.time === t.time && (x.ativo || x.id === p.value.produto_id)),
})));
</script>

<template>
  <div class="item" :class="[{ resolvida }, resolvida ? '' : tomIdade]">
    <div class="main">
      <div class="tt">
        <a v-if="p.link" class="num" :href="p.link" target="_blank" rel="noopener">#{{ p.solicitacao_id }}</a>
        <span v-else class="num">#{{ p.solicitacao_id }}</span>
        <span class="titulo">{{ p.titulo }}</span>
      </div>
      <div v-if="resolvida" class="meta">
        <span><Check /> Resolvida {{ resolvidaHa }}</span>
        <span v-if="p.coluna_destino">→ {{ p.coluna_destino }}</span>
        <span v-if="p.resolvida_por">por {{ p.resolvida_por }}</span>
      </div>
      <div v-else class="meta">
        <span class="badge" :class="tomIdade"><Clock /> {{ espera.txt }}</span>
        <span v-if="p.sprint">{{ p.sprint }}</span>
        <span v-if="p.movido_por"><UserRound /> {{ p.movido_por }}</span>
      </div>
    </div>
    <div class="acts">
      <button v-if="resolvida" class="btn ghost sm" type="button" @click="dados.reabrirPendencia(p)">
        <RotateCcw /> Reabrir
      </button>
      <template v-else>
        <select
          class="sm"
          :class="{ vazio: !p.produto_id }"
          :value="p.produto_id ?? ''"
          title="Produto"
          aria-label="Produto"
          @change="dados.classificarPendencia(p.id, $event.target.value || null)"
        >
          <option value="">Classificar…</option>
          <optgroup v-for="g in gruposProduto" :key="g.time" :label="g.nome">
            <option v-for="x in g.produtos" :key="x.id" :value="x.id">{{ x.nome }}</option>
          </optgroup>
        </select>
        <button class="btn sm concluir" type="button" title="Marcar como resolvida" @click="dados.concluirPendencia(p.id)">
          <Check /> Concluir
        </button>
      </template>
    </div>
  </div>
</template>

<style scoped>
.item {
  position: relative; display: flex; gap: 14px; align-items: center;
  padding: var(--pad-item) 12px var(--pad-item) 14px; margin: 0 -12px;
  border-radius: 12px; transition: background .15s;
}
.item:hover { background: var(--surface-2); }
/* Marca lateral: amarela com 2+ dias de espera, vermelha com 5+ */
.item::before {
  content: ""; position: absolute; left: 3px; top: 10px; bottom: 10px; width: 3px; border-radius: 3px;
  background: transparent; transition: background .2s;
}
.item.warn::before { background: var(--warn); }
.item.danger::before { background: var(--danger); }
.main { flex: 1; min-width: 0; }
.tt { display: flex; gap: 8px; align-items: baseline; }
.num {
  font-size: 12px; font-weight: 700; color: var(--muted); flex: none;
  padding: 1px 7px; border-radius: 7px; background: var(--surface-2); border: 1px solid var(--border);
}
a.num { color: var(--accent-text); background: var(--accent-soft); border-color: transparent; }
a.num:hover { text-decoration: none; filter: brightness(.97); }
.item:hover .num:not(a) { background: var(--surface); }
.titulo { font-weight: 600; color: var(--text); overflow-wrap: anywhere; line-height: 1.45; }
.meta { color: var(--muted); font-size: 12px; margin-top: 6px; display: flex; flex-wrap: wrap; align-items: center; gap: 4px 12px; }
.meta > span { display: inline-flex; align-items: center; gap: 4px; }
.meta svg { width: 12px; height: 12px; }
.acts { display: flex; gap: 6px; align-items: center; flex: none; }
select { width: 180px; }
select.vazio { color: var(--warn); border-style: dashed; }
.concluir:hover { color: var(--ok); border-color: var(--ok); background: var(--ok-soft); }
.resolvida .titulo { font-weight: 500; color: var(--muted); }
/* Card estreito: ações vão para baixo do texto */
@container (max-width: 520px) {
  .item { flex-direction: column; align-items: stretch; gap: 8px; }
  .acts select { flex: 1; width: auto; }
}
</style>
