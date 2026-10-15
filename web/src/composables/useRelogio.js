// Relógio compartilhado: mantém saudação, idades, agenda e sprints em dia sem recarregar dados.

import { computed, ref } from "vue";
import { ymd } from "@/utils/datas";

const agora = ref(new Date());
const hoje = computed(() => ymd(agora.value));
let timer = null;

export function useRelogio() {
  if (!timer) timer = setInterval(() => { agora.value = new Date(); }, 30_000);
  return {
    agora,
    hoje,
    atualizar: () => { agora.value = new Date(); },
  };
}
