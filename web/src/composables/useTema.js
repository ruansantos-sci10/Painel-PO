// Tema do painel: "sistema" (segue o Windows/navegador), "claro" ou "escuro".
// A escolha fica salva neste navegador e vira o atributo data-theme do <html>,
// que o base.css usa para forçar as cores. O index.html aplica a escolha antes
// do primeiro desenho da página, para não piscar.

import { ref } from "vue";

const CHAVE = "painel-tema";
export const TEMAS = ["sistema", "claro", "escuro"];
const ATRIBUTO = { claro: "light", escuro: "dark" };

function lerSalvo() {
  try {
    const v = localStorage.getItem(CHAVE);
    return TEMAS.includes(v) ? v : "sistema";
  } catch {
    return "sistema";
  }
}

const tema = ref(lerSalvo());

function aplicar(valor) {
  const raiz = document.documentElement;
  if (ATRIBUTO[valor]) raiz.dataset.theme = ATRIBUTO[valor];
  else delete raiz.dataset.theme;
}

export function useTema() {
  function definir(valor) {
    tema.value = TEMAS.includes(valor) ? valor : "sistema";
    aplicar(tema.value);
    try { localStorage.setItem(CHAVE, tema.value); } catch { /* sem storage: vale só nesta visita */ }
  }

  // Sistema → Claro → Escuro → Sistema
  const alternar = () => definir(TEMAS[(TEMAS.indexOf(tema.value) + 1) % TEMAS.length]);

  return { tema, definir, alternar };
}
