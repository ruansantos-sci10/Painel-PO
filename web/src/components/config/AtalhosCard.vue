<script setup>
import { reactive } from "vue";
import { Link2, Plus, Trash2 } from "lucide-vue-next";
import PainelCard from "@/components/ui/PainelCard.vue";
import EstadoVazio from "@/components/ui/EstadoVazio.vue";
import { useDadosStore } from "@/stores/dados";

const dados = useDadosStore();

const form = reactive({ nome: "", url: "" });

async function adicionar() {
  const link = { nome: form.nome.trim(), url: form.url.trim(), ordem: 99 };
  if (!link.nome || !link.url) return;
  if (await dados.addLink(link)) Object.assign(form, { nome: "", url: "" });
}
</script>

<template>
  <PainelCard
    titulo="Links rápidos"
    :icone="Link2"
    :contador="dados.links.length"
    descricao="Aparecem no topo da tela Hoje: Miro, intranet, Discord, planilhas…"
  >
    <ul v-if="dados.links.length" class="lista">
      <li v-for="l in dados.links" :key="l.id">
        <div class="info">
          <div class="nome">{{ l.nome }}</div>
          <a class="url" :href="l.url" target="_blank" rel="noopener">{{ l.url }}</a>
        </div>
        <button class="btn ghost icon sm danger" type="button" aria-label="Remover atalho" @click="dados.delLink(l.id)"><Trash2 /></button>
      </li>
    </ul>
    <EstadoVazio v-else texto="Nenhum atalho ainda." compacto />

    <form class="form-row" autocomplete="off" @submit.prevent="adicionar">
      <input v-model="form.nome" type="text" placeholder="Nome (ex.: Miro)" aria-label="Nome do atalho" required>
      <input v-model="form.url" type="url" placeholder="https://…" aria-label="Endereço do atalho" required>
      <button class="btn primary" type="submit"><Plus /> Adicionar</button>
    </form>
  </PainelCard>
</template>

<style scoped>
.lista { list-style: none; margin: 4px 0 0; padding: 0; }
li { display: flex; align-items: center; gap: 10px; padding: 8px 0; border-bottom: 1px solid var(--border); }
li:last-child { border-bottom: 0; }
.info { flex: 1; min-width: 0; }
.nome { font-weight: 500; }
.url { display: block; font-size: 12px; color: var(--muted); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
</style>
