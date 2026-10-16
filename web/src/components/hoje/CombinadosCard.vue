<script setup>
import { computed, reactive, ref } from "vue";
import { ListTodo, Plus } from "lucide-vue-next";
import PainelCard from "@/components/ui/PainelCard.vue";
import EstadoVazio from "@/components/ui/EstadoVazio.vue";
import CombinadoItem from "./CombinadoItem.vue";
import { useRelogio } from "@/composables/useRelogio";
import { useDadosStore } from "@/stores/dados";
import { CANAIS } from "@/services/dadosIniciais";
import { ymd } from "@/utils/datas";

const dados = useDadosStore();
const { hoje } = useRelogio();

const campoDescricao = ref(null);
const form = reactive({ descricao: "", com_quem: "", canal: CANAIS[0], prazo: ymd(new Date()), produto_id: "" });

async function adicionar() {
  const descricao = form.descricao.trim();
  if (!descricao) return;
  const ok = await dados.addCombinado({
    descricao,
    com_quem: form.com_quem.trim() || null,
    canal: form.canal,
    prazo: form.prazo || null,
    produto_id: form.produto_id || null,
  });
  if (!ok) return;
  Object.assign(form, { descricao: "", com_quem: "", prazo: hoje.value });
  campoDescricao.value?.focus();
}

const abertos = computed(() => dados.combinados.filter((c) => c.status !== "feito"));

const grupos = computed(() => {
  const hs = hoje.value;
  return [
    ["Atrasados", abertos.value.filter((c) => c.prazo && c.prazo < hs), "danger"],
    ["Hoje", abertos.value.filter((c) => c.prazo === hs), "warn"],
    ["Próximos", abertos.value.filter((c) => c.prazo && c.prazo > hs), ""],
    ["Sem prazo", abertos.value.filter((c) => !c.prazo), ""],
    ["Feitos hoje", dados.combinados.filter((c) => c.status === "feito"), "ok"],
  ].filter(([, lista]) => lista.length);
});

// O contador só fica em destaque quando há algo vencendo hoje ou atrasado.
const urgente = computed(() => abertos.value.some((c) => c.prazo && c.prazo <= hoje.value));
</script>

<template>
  <PainelCard id="combinados" titulo="Combinados e lembretes" :icone="ListTodo" tom="amber" :contador="abertos.length" :destacar="urgente">
    <form class="novo" autocomplete="off" @submit.prevent="adicionar">
      <div class="principal">
        <input
          ref="campoDescricao"
          v-model="form.descricao"
          type="text"
          placeholder="O que você combinou?"
          aria-label="Descrição do combinado"
          required
        >
        <button class="btn primary icon" type="submit" title="Adicionar" aria-label="Adicionar"><Plus /></button>
      </div>
      <div class="detalhes">
        <input v-model="form.com_quem" class="sm" type="text" placeholder="Com quem" aria-label="Com quem">
        <select v-model="form.canal" class="sm" aria-label="Canal">
          <option v-for="canal in CANAIS" :key="canal" :value="canal">{{ canal }}</option>
        </select>
        <input v-model="form.prazo" class="sm" type="date" title="Prazo" aria-label="Prazo">
        <select v-model="form.produto_id" class="sm" aria-label="Produto">
          <option value="">Produto</option>
          <option v-for="p in dados.produtosAtivos" :key="p.id" :value="p.id">{{ p.nome }}</option>
        </select>
      </div>
    </form>

    <section v-for="[nome, lista, tom] in grupos" :key="nome">
      <h3 class="eyebrow" :class="tom">{{ nome }} · {{ lista.length }}</h3>
      <TransitionGroup name="lista" tag="div">
        <CombinadoItem v-for="c in lista" :key="c.id" :combinado="c" />
      </TransitionGroup>
    </section>
    <EstadoVazio v-if="!grupos.length" texto="Nenhum combinado em aberto." compacto />
  </PainelCard>
</template>

<style scoped>
.novo { display: grid; gap: 6px; padding: 6px 0 4px; }
.principal { display: flex; gap: 6px; }
.principal input { height: 38px; }
.principal .btn { height: 38px; width: 38px; flex: none; }
.detalhes { display: grid; grid-template-columns: 1fr 1fr; gap: 6px; }
.eyebrow.danger { color: var(--danger); }
.eyebrow.warn { color: var(--warn); }
.eyebrow.ok { color: var(--ok); }
</style>
