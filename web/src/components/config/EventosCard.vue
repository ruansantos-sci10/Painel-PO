<script setup>
import { Activity } from "lucide-vue-next";
import PainelCard from "@/components/ui/PainelCard.vue";
import EstadoVazio from "@/components/ui/EstadoVazio.vue";
import { useDadosStore } from "@/stores/dados";
import { fmtDataHora } from "@/utils/datas";

const dados = useDadosStore();
</script>

<template>
  <PainelCard
    titulo="Eventos recebidos do Kanboard"
    :icone="Activity"
    tom="slate"
    descricao="Confira se o webhook está chegando e sendo entendido. O texto bruto fica guardado."
  >
    <template #extra>últimos 30</template>
    <div v-if="dados.eventos.length" class="table-wrap">
      <table>
        <thead><tr><th>Recebido</th><th>Solicitação</th><th>De → Para</th><th>Resultado</th></tr></thead>
        <tbody>
          <tr v-for="e in dados.eventos" :key="e.id">
            <td class="nowrap small">{{ e.recebido_em ? fmtDataHora(e.recebido_em) : "—" }}</td>
            <td class="num">{{ e.solicitacao_id ?? "—" }}</td>
            <td class="small">{{ e.de_coluna ?? "—" }} <span class="muted">→</span> {{ e.para_coluna ?? "—" }}</td>
            <td class="small">
              <span v-if="e.erro" class="badge danger">{{ e.erro }}</span>
              <span v-else class="badge ok">{{ e.resultado ?? "" }}</span>
              <details>
                <summary>texto bruto</summary>
                <pre class="raw">{{ e.corpo_bruto }}</pre>
              </details>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
    <EstadoVazio v-else :icone="Activity" texto="Nenhum evento recebido ainda." />
  </PainelCard>
</template>

<style scoped>
.nowrap { white-space: nowrap; }
.num { font-variant-numeric: tabular-nums; font-weight: 500; }
td .badge { white-space: normal; height: auto; min-height: 20px; }
summary { cursor: pointer; color: var(--muted); font-size: 12px; margin-top: 4px; width: fit-content; }
summary:hover { color: var(--text); }
pre.raw { white-space: pre-wrap; word-break: break-word; background: var(--surface-2); border: 1px solid var(--border); padding: 10px; border-radius: 9px; font-size: 12px; margin: 6px 0 0; }
</style>
