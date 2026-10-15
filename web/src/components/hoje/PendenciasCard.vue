<script setup>
import { computed } from "vue";
import { ChevronRight, Inbox, PartyPopper, TriangleAlert } from "lucide-vue-next";
import PainelCard from "@/components/ui/PainelCard.vue";
import EstadoVazio from "@/components/ui/EstadoVazio.vue";
import PendenciaItem from "./PendenciaItem.vue";
import { useRelogio } from "@/composables/useRelogio";
import { useDadosStore } from "@/stores/dados";
import { idade } from "@/utils/datas";

const dados = useDadosStore();
const { agora } = useRelogio();

const abertas = computed(() => dados.pendenciasAbertas);

const velhas = computed(() => abertas.value.filter((p) => idade(p.entrou_em, agora.value.getTime()).dias >= 2).length);

const semProduto = computed(() => abertas.value.filter((p) => !p.produto_id));

// Time -> produto -> pendências (na ordem de chegada)
const porTime = computed(() => dados.times.map((t) => {
  const doTime = abertas.value.filter((p) => p.produto_id && dados.prodPorId.get(p.produto_id)?.time === t.time);
  const produtos = new Map();
  for (const p of doTime) {
    if (!produtos.has(p.produto_id)) produtos.set(p.produto_id, { id: p.produto_id, nome: dados.prodPorId.get(p.produto_id)?.nome, itens: [] });
    produtos.get(p.produto_id).itens.push(p);
  }
  return { ...t, total: doTime.length, produtos: [...produtos.values()] };
}).filter((g) => g.total));
</script>

<template>
  <PainelCard titulo="Aguardando você" :icone="Inbox" :contador="abertas.length" :destacar="abertas.length > 0">
    <template v-if="abertas.length" #extra>
      <span v-if="velhas" class="badge warn">{{ velhas }} há 2+ dias</span>
      <span v-else class="badge ok">tudo recente</span>
    </template>

    <EstadoVazio v-if="!abertas.length" :icone="PartyPopper" texto="Nada esperando por você." tom="ok" />
    <template v-else>
      <section v-if="semProduto.length" class="grupo sem">
        <h3 class="eyebrow"><TriangleAlert /> Sem produto identificado · {{ semProduto.length }}</h3>
        <PendenciaItem v-for="p in semProduto" :key="p.id" :pendencia="p" />
      </section>

      <section v-for="g in porTime" :key="g.time" class="grupo">
        <h3 class="eyebrow"><span class="dot" :class="`t${g.time}`"></span>{{ g.nome }} · {{ g.total }}</h3>
        <div v-for="prod in g.produtos" :key="prod.id" class="produto">
          <div class="nome-produto">{{ prod.nome }}</div>
          <PendenciaItem v-for="p in prod.itens" :key="p.id" :pendencia="p" />
        </div>
      </section>
    </template>

    <details class="resolvidas">
      <summary><ChevronRight class="seta" /> Resolvidas nos últimos 7 dias <span class="badge">{{ dados.resolvidas.length }}</span></summary>
      <PendenciaItem v-for="p in dados.resolvidas" :key="p.id" :pendencia="p" resolvida />
      <EstadoVazio v-if="!dados.resolvidas.length" texto="Nenhuma." compacto />
    </details>
  </PainelCard>
</template>

<style scoped>
.grupo + .grupo { margin-top: 6px; padding-top: 6px; border-top: 1px solid var(--border); }
.grupo.sem .eyebrow { color: var(--warn); }
.eyebrow svg { width: 13px; height: 13px; }
.nome-produto { font-size: 12.5px; font-weight: 600; color: var(--text-2); margin: 8px 0 0; }
.resolvidas { margin-top: 12px; border-top: 1px solid var(--border); padding-top: 10px; }
.resolvidas summary {
  list-style: none; cursor: pointer; display: flex; align-items: center; gap: 6px;
  color: var(--muted); font-size: 13px; font-weight: 500; padding: 4px 0; user-select: none;
}
.resolvidas summary::-webkit-details-marker { display: none; }
.resolvidas summary:hover { color: var(--text); }
.seta { width: 15px; height: 15px; transition: transform .15s; }
.resolvidas[open] .seta { transform: rotate(90deg); }
</style>
