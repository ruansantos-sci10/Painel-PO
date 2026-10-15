// Avisos da interface: toast, faixa de erro e execução de ações com feedback.

import { defineStore } from "pinia";
import { ref } from "vue";
import { useSessaoStore } from "./sessao";

export const useUiStore = defineStore("ui", () => {
  const toastMsg = ref("");
  const erro = ref("");
  let timerToast = null;

  function toast(msg) {
    toastMsg.value = msg;
    clearTimeout(timerToast);
    timerToast = setTimeout(() => { toastMsg.value = ""; }, 2600);
  }

  function mostrarErro(e) {
    console.error(e);
    if (e?.code === "permission-denied" || e?.code === "functions/permission-denied") {
      const uid = useSessaoStore().usuario?.uid ?? "?";
      erro.value = `Seu usuário ainda não tem acesso. No console do Firebase, crie o documento autorizados/${uid} no Firestore (veja o README).`;
      return;
    }
    erro.value = "Erro: " + (e?.message || e);
  }

  const limparErro = () => { erro.value = ""; };

  // Executa uma ação do usuário; devolve true se deu certo.
  async function executar(fn, msgSucesso) {
    limparErro();
    try {
      await fn();
      if (msgSucesso) toast(msgSucesso);
      return true;
    } catch (e) {
      mostrarErro(e);
      return false;
    }
  }

  return { toastMsg, erro, toast, mostrarErro, limparErro, executar };
});
