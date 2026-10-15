// Agenda de hoje (Google Agenda via Cloud Function).
// É consultada com menos frequência que o resto: o servidor ainda guarda cache de 15 min.

import { defineStore } from "pinia";
import { ref } from "vue";
import { backend } from "@/services/backend";
import { ymd } from "@/utils/datas";

const AGENDA_MIN = 10;

export const useAgendaStore = defineStore("agenda", () => {
  const res = ref(null);
  const falha = ref("");
  let buscadaEm = 0;
  let dia = null;

  async function carregar(forcar = false) {
    const hoje = ymd(new Date());
    const recente = res.value && dia === hoje && Date.now() - buscadaEm < AGENDA_MIN * 60000;
    if (recente && !forcar) return;
    try {
      res.value = await backend.agenda(hoje);
      buscadaEm = Date.now();
      dia = hoje;
      falha.value = "";
    } catch (e) {
      if (res.value && dia === hoje) {
        res.value = { ...res.value, aviso: "Não foi possível atualizar: " + e.message };
      } else {
        res.value = null;
        falha.value = "Não foi possível ler a agenda: " + e.message;
      }
    }
  }

  return { res, falha, carregar };
});
