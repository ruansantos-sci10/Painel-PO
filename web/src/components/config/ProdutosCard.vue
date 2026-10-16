<script setup>
import { reactive } from "vue";
import { Package, Plus } from "lucide-vue-next";
import PainelCard from "@/components/ui/PainelCard.vue";
import ToggleSwitch from "@/components/ui/ToggleSwitch.vue";
import { useDadosStore } from "@/stores/dados";
import { TAMANHOS } from "@/services/dadosIniciais";

const dados = useDadosStore();

const form = reactive({ nome: "", tamanho: "M", time: 1 });

async function adicionar() {
  const nome = form.nome.trim();
  if (!nome) return;
  if (await dados.addProduto({ nome, tamanho: form.tamanho, time: Number(form.time) })) form.nome = "";
}
</script>

<template>
  <PainelCard titulo="Produtos" :icone="Package" tom="amber" :contador="dados.produtos.length">
    <div class="table-wrap">
      <table>
        <thead><tr><th>Produto</th><th>Tam.</th><th>Time</th><th class="ativo">Ativo</th></tr></thead>
        <tbody>
          <tr v-for="p in dados.produtos" :key="p.id" :class="{ inativo: !p.ativo }">
            <td class="nome"><span class="dot" :class="`t${p.time}`"></span>{{ p.nome }}</td>
            <td>
              <select class="sm tam" :value="p.tamanho" aria-label="Tamanho" @change="dados.setProduto(p.id, { tamanho: $event.target.value })">
                <option v-for="t in TAMANHOS" :key="t" :value="t">{{ t }}</option>
              </select>
            </td>
            <td>
              <select class="sm time" :value="p.time" aria-label="Time" @change="dados.setProduto(p.id, { time: Number($event.target.value) })">
                <option v-for="t in dados.times" :key="t.time" :value="t.time">{{ t.nome }}</option>
              </select>
            </td>
            <td class="ativo">
              <ToggleSwitch :model-value="p.ativo" :rotulo="`${p.nome} ativo`" @update:model-value="dados.setProduto(p.id, { ativo: $event })" />
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <form class="form-row" autocomplete="off" @submit.prevent="adicionar">
      <input v-model="form.nome" type="text" placeholder="Novo produto" aria-label="Nome do novo produto" required>
      <select v-model="form.tamanho" class="curto" aria-label="Tamanho">
        <option v-for="t in TAMANHOS" :key="t" :value="t">{{ t }}</option>
      </select>
      <select v-model.number="form.time" aria-label="Time">
        <option v-for="t in dados.times" :key="t.time" :value="t.time">{{ t.nome }}</option>
      </select>
      <button class="btn primary" type="submit"><Plus /> Adicionar</button>
    </form>
  </PainelCard>
</template>

<style scoped>
.nome { display: flex; align-items: center; gap: 8px; font-weight: 500; }
.tam { width: 64px; }
.time { min-width: 130px; }
.ativo { text-align: right; width: 56px; }
.inativo .nome { color: var(--muted); }
.form-row .curto { flex: 0 0 72px; }
</style>
