// Dados do painel, sincronizados em tempo real com o backend.
// As listas brutas chegam das assinaturas; ordenação e filtros ficam nos computed abaixo.

import { defineStore } from "pinia";
import { computed, reactive, ref, watch } from "vue";
import { backend } from "@/services/backend";
import { TIMES } from "@/services/dadosIniciais";
import { classificacoesPendentes } from "@/utils/classificacao";
import { addDias, inicioDoDia, ymd } from "@/utils/datas";
import { useUiStore } from "./ui";

const porTexto = (campo) => (a, b) => String(a[campo] ?? "").localeCompare(String(b[campo] ?? ""), "pt-BR");
const porNumero = (campo) => (a, b) => (a[campo] ?? 0) - (b[campo] ?? 0);
const encadear = (...cmps) => (a, b) => cmps.reduce((r, c) => r || c(a, b), 0);
const ordenado = (lista, ...cmps) => [...lista].sort(encadear(...cmps));

export const useDadosStore = defineStore("dados", () => {
  const ui = useUiStore();

  const brutos = reactive({
    produtos: [], pendenciasAbertas: [], resolvidas: [], combinados: [],
    sprints: [], feriados: [], links: [], regras: [], config: {}, eventos: [],
    agenda: undefined, // undefined = carregando; null = ainda não sincronizada pelo Apps Script
  });
  const carregando = ref(true);
  const agendaFalha = ref("");
  let paradas = [];
  let diaAssinado = null;

  // ---------------- Assinaturas ----------------
  function parar() {
    paradas.forEach((p) => p());
    paradas = [];
  }

  function iniciar() {
    parar();
    diaAssinado = ymd(new Date());
    const faltam = new Set(Object.keys(backend.ouvir));
    agendaFalha.value = "";
    for (const [nome, ouvir] of Object.entries(backend.ouvir)) {
      paradas.push(ouvir((valor) => {
        brutos[nome] = valor;
        faltam.delete(nome);
        if (!faltam.size) carregando.value = false;
      }, (e) => {
        if (nome === "agenda") agendaFalha.value = "Não foi possível ler a agenda: " + e.message;
        else ui.mostrarErro(e);
      }));
    }
  }

  // ---------------- Classificação automática ----------------
  // O webhook só registra a pendência; o painel aplica as regras e grava o produto/time.
  // Roda sempre que chegam pendências novas ou mudam as regras/produtos.
  let classificando = false;
  let repetir = false;
  async function classificarPendentes() {
    if (carregando.value) return;
    if (classificando) { repetir = true; return; }
    classificando = true;
    try {
      do {
        repetir = false;
        const mudancas = classificacoesPendentes(brutos.pendenciasAbertas, brutos.regras, prodPorId.value);
        if (mudancas.length) await backend.aplicarClassificacoes(mudancas);
      } while (repetir);
    } catch (e) {
      ui.mostrarErro(e);
    } finally {
      classificando = false;
    }
  }
  watch(() => [brutos.pendenciasAbertas, brutos.regras, brutos.produtos, carregando.value], classificarPendentes);

  async function abrir() {
    try {
      await backend.garantirDadosIniciais();
    } catch (e) {
      ui.mostrarErro(e);
    }
    iniciar();
  }

  // As consultas de "últimos 7 dias" e "feitos hoje" dependem da data: reassina quando o dia vira.
  function renovarSeMudouODia() {
    if (diaAssinado && diaAssinado !== ymd(new Date())) iniciar();
  }

  // ---------------- Visões ordenadas ----------------
  const produtos = computed(() => ordenado(brutos.produtos, porNumero("time"), porTexto("nome")));
  const produtosAtivos = computed(() => produtos.value.filter((p) => p.ativo));
  const prodPorId = computed(() => new Map(brutos.produtos.map((p) => [p.id, p])));

  const pendenciasAbertas = computed(() => ordenado(brutos.pendenciasAbertas, porTexto("entrou_em")));
  const resolvidas = computed(() => {
    const limite = addDias(new Date(), -7).toISOString();
    return ordenado(brutos.resolvidas.filter((p) => p.status === "resolvida" && p.resolvida_em >= limite),
      (a, b) => porTexto("resolvida_em")(b, a));
  });

  const combinados = computed(() => {
    const inicioHoje = inicioDoDia().toISOString();
    const visiveis = brutos.combinados.filter((c) => c.status !== "feito" || (c.concluido_em ?? "") >= inicioHoje);
    // Prazo mais próximo primeiro; sem prazo por último
    return ordenado(visiveis, (a, b) => (!a.prazo) - (!b.prazo), porTexto("prazo"), porTexto("criado_em"));
  });

  const sprints = computed(() => ordenado(brutos.sprints, porNumero("time")));

  // Nome de exibição de cada time (editável em Configurações > Times e sprints)
  const nomesTimes = computed(() => new Map(brutos.sprints.map((s) => [s.time, s.nome?.trim()])));
  const nomeTime = (t) => (t ? nomesTimes.value.get(t) || `Time ${t}` : "Sem time");
  const times = computed(() => TIMES.map((t) => ({ time: t, nome: nomeTime(t) })));
  const feriados = computed(() => ordenado(brutos.feriados, porTexto("data")));
  const links = computed(() => ordenado(brutos.links, porNumero("ordem"), porTexto("criado_em")));
  const regras = computed(() => ordenado(brutos.regras, porTexto("tipo"), porTexto("padrao")));
  const eventos = computed(() => ordenado(brutos.eventos, (a, b) => porTexto("recebido_em")(b, a)));
  const config = computed(() => brutos.config);
  const agenda = computed(() => brutos.agenda);

  // ---------------- Ações ----------------
  const acao = (fn, msg) => ui.executar(fn, msg);

  const concluirPendencia = (id) => acao(() => backend.concluirPendencia(id), "Pendência concluída");
  const reabrirPendencia = (p) => acao(() => backend.reabrirPendencia(p), "Pendência reaberta");
  const classificarPendencia = (id, produtoId) =>
    acao(() => backend.classificarPendencia(id, prodPorId.value.get(produtoId) ?? null), "Classificado");

  const addCombinado = (c) => acao(() => backend.addCombinado(c), "Combinado adicionado");
  const setCombinado = (id, feito) => acao(() => backend.setCombinado(id, feito));
  const delCombinado = (id) => acao(() => backend.delCombinado(id));

  const addRegra = (r) => acao(() => backend.addRegra(r), "Regra adicionada e aplicada");
  const delRegra = (id) => acao(() => backend.delRegra(id), "Regra removida");

  const addProduto = (p) => acao(async () => {
    const nome = p.nome.toLowerCase();
    if (brutos.produtos.some((x) => x.nome.trim().toLowerCase() === nome)) {
      throw new Error(`Já existe um produto chamado "${p.nome}".`);
    }
    await backend.addProduto(p);
  }, "Produto adicionado");
  const setProduto = (id, campos) => acao(() => backend.setProduto(id, campos));

  const setSprint = (time, campos) => acao(() => backend.setSprint(time, campos), "Sprint atualizada");
  const renomearTime = (time, nome) => acao(async () => {
    const limpo = nome.trim();
    if (!limpo) throw new Error("O nome do time não pode ficar vazio.");
    await backend.setSprint(time, { nome: limpo });
  }, "Nome do time salvo");
  const addFeriado = (f) => acao(() => backend.addFeriado(f), "Feriado adicionado");
  const delFeriado = (data) => acao(() => backend.delFeriado(data));
  const addLink = (l) => acao(() => backend.addLink(l), "Atalho adicionado");
  const delLink = (id) => acao(() => backend.delLink(id));
  const setConfig = (chave, valor, msg) => acao(() => backend.setConfig(chave, valor), msg);

  return {
    carregando, abrir, iniciar, parar, renovarSeMudouODia, agenda, agendaFalha,
    produtos, produtosAtivos, prodPorId, pendenciasAbertas, resolvidas, combinados,
    sprints, feriados, links, regras, eventos, config, times, nomeTime,
    concluirPendencia, reabrirPendencia, classificarPendencia,
    addCombinado, setCombinado, delCombinado,
    addRegra, delRegra, addProduto, setProduto, setSprint, renomearTime,
    addFeriado, delFeriado, addLink, delLink, setConfig,
  };
});
