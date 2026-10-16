<script setup>
import { reactive } from "vue";
import { CalendarOff, Plus, Trash2 } from "lucide-vue-next";
import PainelCard from "@/components/ui/PainelCard.vue";
import EstadoVazio from "@/components/ui/EstadoVazio.vue";
import { useDadosStore } from "@/stores/dados";
import { parseYmd } from "@/utils/datas";

const dados = useDadosStore();

const form = reactive({ data: "", descricao: "" });

async function adicionar() {
  if (!form.data) return;
  if (await dados.addFeriado({ data: form.data, descricao: form.descricao.trim() || null })) {
    Object.assign(form, { data: "", descricao: "" });
  }
}

const dia = (data) => parseYmd(data).toLocaleDateString("pt-BR", { day: "2-digit" });
const mes = (data) => parseYmd(data).toLocaleDateString("pt-BR", { month: "short" }).replace(".", "");
const semana = (data) => {
  const dia = parseYmd(data).toLocaleDateString("pt-BR", { weekday: "long" });
  return `${dia.charAt(0).toUpperCase()}${dia.slice(1)} · ${data.slice(0, 4)}`;
};
</script>

<template>
  <PainelCard
    titulo="Feriados"
    :icone="CalendarOff"
    tom="rose"
    :contador="dados.feriados.length"
    descricao="Inclua os estaduais e municipais que a empresa respeita."
  >
    <ul v-if="dados.feriados.length" class="lista">
      <li v-for="f in dados.feriados" :key="f.data">
        <div class="data"><strong>{{ dia(f.data) }}</strong><span>{{ mes(f.data) }}</span></div>
        <div class="info">
          <div class="desc">{{ f.descricao || "Feriado" }}</div>
          <div class="semana">{{ semana(f.data) }}</div>
        </div>
        <button class="btn ghost icon sm danger" type="button" aria-label="Remover feriado" @click="dados.delFeriado(f.data)"><Trash2 /></button>
      </li>
    </ul>
    <EstadoVazio v-else texto="Nenhum feriado cadastrado." compacto />

    <form class="form-row" @submit.prevent="adicionar">
      <input v-model="form.data" type="date" aria-label="Data do feriado" required>
      <input v-model="form.descricao" type="text" placeholder="Descrição">
      <button class="btn primary" type="submit"><Plus /> Adicionar</button>
    </form>
  </PainelCard>
</template>

<style scoped>
.lista { list-style: none; margin: 4px 0 0; padding: 0; max-height: 300px; overflow-y: auto; }
li { display: flex; align-items: center; gap: 12px; padding: 7px 0; border-bottom: 1px solid var(--border); }
li:last-child { border-bottom: 0; }
.data {
  width: 42px; height: 42px; flex: none; border-radius: 10px; background: var(--surface-2); border: 1px solid var(--border);
  display: grid; place-content: center; text-align: center; line-height: 1.05;
}
.data strong { font-size: 15px; }
.data span { font-size: 10px; text-transform: uppercase; color: var(--muted); font-weight: 600; letter-spacing: .04em; }
.info { flex: 1; min-width: 0; }
.desc { font-weight: 500; }
.semana { font-size: 12px; color: var(--muted); }
</style>
