// Classificação das pendências por produto/time a partir das regras cadastradas no painel.
//
//   tipo "prefixo": o texto entre parênteses no início do título COMEÇA com o padrão
//                   ex.: padrão "IC+" casa com "(IC+ Situação Fiscal) ..."
//   tipo "sprint" : o nome da sprint/quadro CONTÉM o padrão
// Comparação sem diferenciar maiúsculas/minúsculas; vence o padrão mais longo.

import { onCall } from "firebase-functions/v2/https";
import { db, exigirAutorizado } from "./base.js";

const norm = (s) => String(s ?? "").trim().toLowerCase();

export function classificar({ regras, produtos }, prefixo, sprint) {
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
  const time = produtos.get(produto_id)?.time ?? rPref?.time ?? rSprint?.time ?? null;
  return { produto_id, time };
}

export async function carregarContexto() {
  const [regras, produtos] = await Promise.all([db.collection("regras").get(), db.collection("produtos").get()]);
  return {
    regras: regras.docs.map((d) => ({ id: d.id, ...d.data() })),
    produtos: new Map(produtos.docs.map((d) => [d.id, d.data()])),
  };
}

// Reaplica as regras nas pendências abertas que não foram classificadas à mão.
export async function reaplicar() {
  const [ctx, abertas] = await Promise.all([
    carregarContexto(),
    db.collection("pendencias").where("status", "==", "aberta").get(),
  ]);

  const escritor = db.bulkWriter();
  let alteradas = 0;
  for (const doc of abertas.docs) {
    const p = doc.data();
    if (p.classificacao_manual) continue;
    const c = classificar(ctx, p.prefixo, p.sprint);
    if (c.produto_id === (p.produto_id ?? null) && c.time === (p.time ?? null)) continue;
    escritor.update(doc.ref, c);
    alteradas++;
  }
  await escritor.close();
  return alteradas;
}

export const reaplicarRegras = onCall(async (request) => {
  await exigirAutorizado(request);
  return { alteradas: await reaplicar() };
});
