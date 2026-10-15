// Classificação das pendências por produto/time a partir das regras cadastradas no painel.
//
//   tipo "prefixo": o texto entre parênteses no início do título COMEÇA com o padrão
//                   ex.: padrão "IC+" casa com "(IC+ Situação Fiscal) ..."
//   tipo "sprint" : o nome da sprint/quadro CONTÉM o padrão
// Comparação sem diferenciar maiúsculas/minúsculas; vence o padrão mais longo.

const norm = (s) => String(s ?? "").trim().toLowerCase();

export function classificar(regras, prodPorId, prefixo, sprint) {
  const maisLonga = (a, b) => String(b.padrao).length - String(a.padrao).length;
  const pref = norm(prefixo);
  const spr = norm(sprint);

  const rPref = pref
    ? regras.filter((r) => r.tipo === "prefixo" && pref.startsWith(norm(r.padrao))).sort(maisLonga)[0]
    : undefined;
  const rSprint = spr
    ? regras.filter((r) => r.tipo === "sprint" && spr.includes(norm(r.padrao))).sort(maisLonga)[0]
    : undefined;

  const produto_id = rPref?.produto_id ?? rSprint?.produto_id ?? null;
  const time = prodPorId.get(produto_id)?.time ?? rPref?.time ?? rSprint?.time ?? null;
  return { produto_id, time };
}

// Pendências abertas (não classificadas à mão) cuja classificação calculada mudou.
export function classificacoesPendentes(pendencias, regras, prodPorId) {
  return pendencias
    .filter((p) => !p.classificacao_manual)
    .map((p) => ({ id: p.id, ...classificar(regras, prodPorId, p.prefixo, p.sprint) }))
    .filter((c) => {
      const p = pendencias.find((x) => x.id === c.id);
      return c.produto_id !== (p.produto_id ?? null) || c.time !== (p.time ?? null);
    });
}
