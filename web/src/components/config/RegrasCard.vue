<script setup>
import { computed, reactive } from "vue";
import { Plus, Tags, Trash2, TriangleAlert } from "lucide-vue-next";
import PainelCard from "@/components/ui/PainelCard.vue";
import EstadoVazio from "@/components/ui/EstadoVazio.vue";
import { useDadosStore } from "@/stores/dados";
import { useUiStore } from "@/stores/ui";

const dados = useDadosStore();
const ui = useUiStore();

const form = reactive({ tipo: "prefixo", padrao: "", produto_id: "", time: "" });

async function adicionar() {
  const regra = {
    tipo: form.tipo,
    padrao: form.padrao.trim(),
    produto_id: form.produto_id || null,
    time: form.time ? Number(form.time) : null,
  };
  if (!regra.padrao) return;
  if (!regra.produto_id && !regra.time) {
    ui.toast("Escolha um produto ou um time");
    return;
  }
  if (await dados.addRegra(regra)) form.padrao = "";
}

// Prefixos de pendências abertas que nenhuma regra conseguiu classificar
const prefixosSemRegra = computed(() =>
  [...new Set(dados.pendenciasAbertas.filter((p) => !p.produto_id).map((p) => p.prefixo).filter(Boolean))]);

function usarPrefixo(p) {
  Object.assign(form, { tipo: "prefixo", padrao: p });
}
</script>

<template>
  <PainelCard titulo="Regras de classificação" :icone="Tags" :contador="dados.regras.length">
    <p class="help">
      Como o painel descobre o produto/time de cada card.
      <strong>Prefixo</strong>: o texto entre parênteses no início do título começa com o padrão
      (<code>IC+</code> casa com <code>(IC+ Situação Fiscal) …</code>).
      <strong>Sprint</strong>: o nome da sprint/quadro contém o padrão.
    </p>

    <div v-if="prefixosSemRegra.length" class="sugestao">
      <TriangleAlert />
      <div>
        Prefixos em cards sem produto — clique para usar:
        <button v-for="p in prefixosSemRegra" :key="p" type="button" class="badge warn chip" @click="usarPrefixo(p)">{{ p }}</button>
      </div>
    </div>

    <div v-if="dados.regras.length" class="table-wrap">
      <table>
        <thead><tr><th>Tipo</th><th>Padrão</th><th>Produto</th><th>Time</th><th></th></tr></thead>
        <tbody>
          <tr v-for="r in dados.regras" :key="r.id">
            <td><span class="badge">{{ r.tipo === "prefixo" ? "Prefixo" : "Sprint" }}</span></td>
            <td><code>{{ r.padrao }}</code></td>
            <td>{{ dados.prodPorId.get(r.produto_id)?.nome ?? "—" }}</td>
            <td>
              <span v-if="r.time" class="badge" :class="`t${r.time}`">{{ dados.nomeTime(r.time) }}</span>
              <span v-else class="muted">—</span>
            </td>
            <td class="acao"><button class="btn ghost icon sm danger" type="button" aria-label="Remover regra" @click="dados.delRegra(r.id)"><Trash2 /></button></td>
          </tr>
        </tbody>
      </table>
    </div>
    <EstadoVazio v-else texto="Nenhuma regra ainda." compacto />

    <form class="form-row" autocomplete="off" @submit.prevent="adicionar">
      <select v-model="form.tipo" aria-label="Tipo">
        <option value="prefixo">Prefixo</option>
        <option value="sprint">Sprint</option>
      </select>
      <input v-model="form.padrao" type="text" placeholder="Padrão" aria-label="Padrão" required>
      <select v-model="form.produto_id" aria-label="Produto">
        <option value="">Produto</option>
        <option v-for="p in dados.produtos" :key="p.id" :value="p.id">{{ p.nome }}</option>
      </select>
      <select v-model="form.time" aria-label="Time">
        <option value="">Time</option>
        <option v-for="t in dados.times" :key="t.time" :value="t.time">{{ t.nome }}</option>
      </select>
      <button class="btn primary" type="submit"><Plus /> Adicionar</button>
    </form>
    <p class="help nota">Ao adicionar ou remover uma regra, as pendências abertas (não classificadas à mão) são reclassificadas.</p>
  </PainelCard>
</template>

<style scoped>
.sugestao {
  display: flex; gap: 8px; align-items: flex-start; padding: 9px 11px; margin-bottom: 12px;
  background: var(--warn-soft); color: var(--warn); border-radius: 10px; font-size: 12.5px;
}
.sugestao svg { width: 15px; height: 15px; flex: none; margin-top: 2px; }
.chip { cursor: pointer; margin: 2px 4px 0 0; font: inherit; font-size: 11.5px; font-weight: 600; }
.chip:hover { filter: brightness(.95); }
.nota { margin: 10px 0 0; }
</style>
