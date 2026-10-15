// Utilidades de data (sempre em datas locais "AAAA-MM-DD")

export const pad = (n) => String(n).padStart(2, "0");
export const ymd = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
export const parseYmd = (s) => {
  const [a, m, d] = s.split("-").map(Number);
  return new Date(a, m - 1, d);
};
export const addDias = (d, n) => {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
};
export const inicioDoDia = (d = new Date()) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
export const fmtCurta = (d) => `${pad(d.getDate())}/${pad(d.getMonth() + 1)}`;
export const fmtHora = (iso) => {
  const d = new Date(iso);
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
};
export const fmtDataHora = (iso) =>
  new Date(iso).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });

export function saudacao(agora) {
  const h = agora.getHours();
  return h < 12 ? "Bom dia" : h < 18 ? "Boa tarde" : "Boa noite";
}

export function dataPorExtenso(agora) {
  const txt = agora.toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
  return txt.charAt(0).toUpperCase() + txt.slice(1);
}

// Tempo decorrido desde "iso", em texto curto e em dias completos.
export function idade(iso, agora = Date.now()) {
  if (!iso) return { txt: "agora há pouco", dias: 0 };
  const ms = agora - new Date(iso).getTime();
  const h = Math.floor(ms / 3600000);
  if (h < 1) return { txt: "agora há pouco", dias: 0 };
  if (h < 24) return { txt: `há ${h}h`, dias: 0 };
  const d = Math.floor(h / 24);
  return { txt: d === 1 ? "há 1 dia" : `há ${d} dias`, dias: d };
}
