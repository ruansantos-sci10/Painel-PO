// Marca do Painel do PO: ligadura "PO" sobre um quadrado arredondado em degradê.
// A haste e um anel completo formam o "P"; o anel sozinho é o "O". O check dentro do anel
// representa a validação do PO. Geometria única, usada no componente MarcaPainel.vue
// e no ícone da aba (favicon), que acompanha a cor de destaque.

export const LOGO = {
  raio: 26, // cantos do quadrado
  haste: "M33 26v50", // haste do P
  anel: { cx: 51, cy: 43, r: 17 }, // bojo do P = O
  check: "M44.5 43.5l4.5 4.5 8.5-9", // check dentro do O
  traco: 11,
  tracoCheck: 5.5,
};

// Mistura duas cores hex (peso = quanto de "outra" entra)
export function misturar(hex, outra, peso) {
  const rgb = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
  const [a, b] = [rgb(hex), rgb(outra)];
  return `#${a.map((v, i) => Math.round(v * (1 - peso) + b[i] * peso).toString(16).padStart(2, "0")).join("")}`;
}

// Cores do degradê a partir da cor de destaque (mesma regra no componente e no favicon)
export const coresLogo = (base) => ({
  claro: misturar(base, "#ffffff", 0.2),
  escuro: misturar(base, "#1e1b4b", 0.4),
});

// SVG completo (texto), para o ícone da aba do navegador
export function svgLogo(base) {
  const { claro, escuro } = coresLogo(base);
  const { haste, anel, check, traco, tracoCheck, raio } = LOGO;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">`
    + `<defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${claro}"/><stop offset="1" stop-color="${escuro}"/></linearGradient>`
    + `<linearGradient id="b" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff" stop-opacity=".22"/><stop offset=".55" stop-color="#fff" stop-opacity="0"/></linearGradient></defs>`
    + `<rect width="100" height="100" rx="${raio}" fill="url(#g)"/>`
    + `<rect width="100" height="100" rx="${raio}" fill="url(#b)"/>`
    + `<g fill="none" stroke="#fff" stroke-linecap="round" stroke-linejoin="round">`
    + `<path d="${haste}" stroke-width="${traco}"/>`
    + `<circle cx="${anel.cx}" cy="${anel.cy}" r="${anel.r}" stroke-width="${traco}"/>`
    + `<path d="${check}" stroke-width="${tracoCheck}" stroke-opacity=".9"/>`
    + `</g></svg>`;
}

// Troca o ícone da aba pela marca na cor atual
export function atualizarFavicon(base) {
  const link = document.querySelector('link[rel="icon"]');
  if (link) link.href = `data:image/svg+xml,${encodeURIComponent(svgLogo(base))}`;
}
