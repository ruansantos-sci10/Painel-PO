// Personalização visual do painel: cor de destaque, cores dos times, capa da tela Hoje,
// densidade, saudação e quais blocos aparecem. Salva em config/aparencia no Firestore
// (vale em qualquer dispositivo) e copiada no navegador para aplicar antes do primeiro desenho.

import { atualizarFavicon } from "./logo";

// Cores escolhidas para ter bom contraste com texto branco no tema claro;
// no tema escuro o base.css clareia cada uma automaticamente.
export const CORES = [
  { id: "anil", nome: "Anil", hex: "#4f6bed" },
  { id: "azul", nome: "Azul", hex: "#2563eb" },
  { id: "ciano", nome: "Ciano", hex: "#0e7490" },
  { id: "turquesa", nome: "Turquesa", hex: "#0f766e" },
  { id: "esmeralda", nome: "Esmeralda", hex: "#047857" },
  { id: "ambar", nome: "Âmbar", hex: "#b45309" },
  { id: "laranja", nome: "Laranja", hex: "#c2410c" },
  { id: "rosa", nome: "Rosa", hex: "#e11d48" },
  { id: "magenta", nome: "Magenta", hex: "#a21caf" },
  { id: "violeta", nome: "Violeta", hex: "#7c3aed" },
  { id: "grafite", nome: "Grafite", hex: "#475569" },
];

// Capas da tela Hoje (texto branco por cima, então todas são escuras o suficiente)
export const CAPAS = [
  { id: "destaque", nome: "Cor de destaque" },
  { id: "aurora", nome: "Aurora" },
  { id: "oceano", nome: "Oceano" },
  { id: "por-do-sol", nome: "Pôr do sol" },
  { id: "floresta", nome: "Floresta" },
  { id: "grafite", nome: "Grafite" },
  { id: "nenhuma", nome: "Sem capa" },
];

export const EMOJIS = ["", "👋", "☕", "🚀", "🌱", "🎯", "✨"];

export const BLOCOS = [
  { id: "links", nome: "Links rápidos" },
  { id: "sprints", nome: "Sprints" },
  { id: "agenda", nome: "Agenda de hoje" },
  { id: "combinados", nome: "Combinados e lembretes" },
];

export const APARENCIA_PADRAO = {
  nome: "",
  emoji: "👋",
  cor_destaque: "anil",
  cores_times: { 1: "anil", 2: "violeta" },
  capa: "destaque",
  densidade: "confortavel", // ou "compacta"
  pendencias_lado: "esquerda", // ou "direita"
  blocos: { links: true, sprints: true, agenda: true, combinados: true },
};

// Junta o que está salvo com o padrão (campos novos ganham valor padrão automaticamente)
export function completarAparencia(salva = {}) {
  return {
    ...APARENCIA_PADRAO,
    ...salva,
    cores_times: { ...APARENCIA_PADRAO.cores_times, ...(salva.cores_times ?? {}) },
    blocos: { ...APARENCIA_PADRAO.blocos, ...(salva.blocos ?? {}) },
  };
}

export const hexDaCor = (id) => (CORES.find((c) => c.id === id) ?? CORES[0]).hex;

const CHAVE_CACHE = "painel-aparencia";

// Aplica no <html>: variáveis de cor e densidade. O index.html reaplica o cache antes de desenhar.
export function aplicarAparencia(ap) {
  const vars = {
    "--accent-base": hexDaCor(ap.cor_destaque),
    "--t1-base": hexDaCor(ap.cores_times[1]),
    "--t2-base": hexDaCor(ap.cores_times[2]),
  };
  const raiz = document.documentElement;
  Object.entries(vars).forEach(([k, v]) => raiz.style.setProperty(k, v));
  raiz.dataset.densidade = ap.densidade;
  atualizarFavicon(vars["--accent-base"]);
  try {
    localStorage.setItem(CHAVE_CACHE, JSON.stringify({ vars, densidade: ap.densidade }));
  } catch { /* sem storage: aplica só nesta visita */ }
}
