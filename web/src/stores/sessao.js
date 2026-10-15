// Sessão do usuário (Firebase Auth ou demonstração).

import { defineStore } from "pinia";
import { ref } from "vue";
import { backend } from "@/services/backend";

const MENSAGENS_LOGIN = {
  "auth/invalid-credential": "E-mail ou senha incorretos.",
  "auth/invalid-login-credentials": "E-mail ou senha incorretos.",
  "auth/wrong-password": "E-mail ou senha incorretos.",
  "auth/user-not-found": "E-mail ou senha incorretos.",
  "auth/invalid-email": "E-mail inválido.",
  "auth/user-disabled": "Este usuário foi desativado.",
  "auth/too-many-requests": "Muitas tentativas. Aguarde alguns minutos e tente de novo.",
  "auth/network-request-failed": "Sem conexão com o Firebase. Verifique a internet.",
};

export const useSessaoStore = defineStore("sessao", () => {
  const usuario = ref(null);
  const pronto = ref(false);
  let iniciado = false;
  let marcarPronto;
  const quandoPronto = new Promise((r) => { marcarPronto = r; });

  // Resolve quando o Firebase disser se há alguém logado.
  function aguardar() {
    if (!iniciado) {
      iniciado = true;
      backend.observarSessao((u) => {
        usuario.value = u;
        pronto.value = true;
        marcarPronto();
      });
    }
    return quandoPronto;
  }

  async function entrar(email, senha) {
    try {
      usuario.value = await backend.entrar(email, senha);
    } catch (e) {
      throw new Error(MENSAGENS_LOGIN[e.code] ?? e.message);
    }
  }

  async function sair() {
    await backend.sair();
  }

  return { usuario, pronto, aguardar, entrar, sair };
});
