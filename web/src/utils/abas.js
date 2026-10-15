// Lembra a última aba aberta (Hoje ou Configurações) neste navegador.

const CHAVE_ABA = "painel-aba";

export function abaSalva() {
  try {
    return localStorage.getItem(CHAVE_ABA) === "config" ? "config" : "hoje";
  } catch {
    return "hoje";
  }
}

export function salvarAba(nome) {
  try { localStorage.setItem(CHAVE_ABA, nome); } catch { /* sem storage */ }
}
