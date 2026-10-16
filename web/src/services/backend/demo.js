// Modo demonstração: tudo em memória, nada é salvo. Usado quando firebase.config.js está vazio.

import { reactive, watch } from "vue";
import { addDias, ymd } from "@/utils/datas";
import {
  CONFIG_INICIAL, FERIADOS_INICIAIS, LINKS_INICIAIS, PRODUTOS_INICIAIS, SPRINTS_INICIAIS,
} from "../dadosIniciais";

export function criarBackendDemo() {
  const hoje = new Date();
  const horas = (h) => new Date(Date.now() - h * 3600000).toISOString();
  const emHora = (h, m) => { const d = new Date(); d.setHours(h, m, 0, 0); return d.toISOString(); };
  let seq = 1000;
  const novoId = () => String(++seq);

  const db = reactive({
    produtos: PRODUTOS_INICIAIS.map((p, i) => ({ id: String(i + 1), ativo: true, ...p })),
    regras: [],
    config: { ...CONFIG_INICIAL },
    aparencia: {},
    sprints: SPRINTS_INICIAIS.map((s) => ({ id: String(s.time), ...s })),
    feriados: FERIADOS_INICIAIS.map((f) => ({ id: f.data, ...f })),
    links: LINKS_INICIAIS.map((l, i) => ({ id: String(i + 1), ...l })),
    pendencias: [
      { id: "1", solicitacao_id: 227375, titulo: "(IC+ Situação Fiscal) Criar opção de download em lote dos relatórios", prefixo: "IC+ Situação Fiscal", sprint: "SCI WEB - REFINAMENTO", movido_por: "Exemplo", link: "https://kanboard.sci.com.br/sprint/2427/solicitacao/227375", produto_id: null, time: null, classificacao_manual: false, status: "aberta", entrou_em: horas(30) },
      { id: "2", solicitacao_id: 100001, titulo: "(Exemplo) Card de demonstração classificado à mão", prefixo: "Exemplo", sprint: "EXEMPLO", movido_por: "Exemplo", link: null, produto_id: "5", time: 1, classificacao_manual: true, status: "aberta", entrou_em: horas(3) },
      { id: "3", solicitacao_id: 100002, titulo: "Exemplo de card do Time 2 aguardando validação", prefixo: null, sprint: "EXEMPLO", movido_por: "Exemplo", link: null, produto_id: "6", time: 2, classificacao_manual: true, status: "aberta", entrou_em: horas(80) },
      { id: "4", solicitacao_id: 100003, titulo: "Exemplo de card já resolvido", prefixo: null, sprint: "EXEMPLO", movido_por: "Exemplo", produto_id: "8", time: 1, classificacao_manual: true, status: "resolvida", entrou_em: horas(50), resolvida_em: horas(20), resolvida_por: "Exemplo", coluna_destino: "PRIORIZAÇÃO" },
    ],
    combinados: [
      { id: "1", descricao: "Exemplo: retornar ao cliente sobre prazo", com_quem: "Cliente X", canal: "WhatsApp", prazo: ymd(addDias(hoje, -1)), status: "aberto", criado_em: horas(48) },
      { id: "2", descricao: "Exemplo: revisar fluxo no Miro com analista", com_quem: "Analista", canal: "Discord", prazo: ymd(hoje), status: "aberto", criado_em: horas(24) },
      { id: "3", descricao: "Exemplo: preparar pauta da planning", com_quem: null, canal: "Outro", prazo: ymd(addDias(hoje, 3)), status: "aberto", criado_em: horas(2) },
    ],
    eventos: [{ id: "1", recebido_em: horas(30), solicitacao_id: 227375, de_coluna: "NOVOS", para_coluna: "AGUARDANDO PO", resultado: "pendencia_aberta", erro: null, corpo_bruto: "(exemplo)" }],
    agenda: [
      { titulo: "Daily — Time 2 (exemplo)", inicio: emHora(9, 0), fim: emHora(9, 15), dia_inteiro: false, link: null },
      { titulo: "Daily — Time 1 (exemplo)", inicio: emHora(9, 30), fim: emHora(9, 45), dia_inteiro: false, link: null },
      { titulo: "Alinhamento com analistas (exemplo)", inicio: emHora(14, 0), fim: emHora(15, 0), dia_inteiro: false, link: null },
    ],
  });

  const copia = (v) => JSON.parse(JSON.stringify(v));
  const ouvir = (seletor) => (cb) => watch(() => copia(seletor()), cb, { immediate: true });
  const achar = (lista, id) => db[lista].find((x) => x.id === id);
  const agoraIso = () => new Date().toISOString();

  return {
    info: { projectId: null, regiao: null },

    observarSessao(cb) { cb({ uid: "demo", email: "demonstracao" }); return () => {}; },
    async entrar() { return { uid: "demo", email: "demonstracao" }; },
    async sair() {},

    ouvir: {
      produtos: ouvir(() => db.produtos),
      pendenciasAbertas: ouvir(() => db.pendencias.filter((p) => p.status === "aberta")),
      resolvidas: ouvir(() => db.pendencias.filter((p) => p.status === "resolvida")),
      combinados: ouvir(() => db.combinados),
      sprints: ouvir(() => db.sprints),
      feriados: ouvir(() => db.feriados),
      links: ouvir(() => db.links),
      regras: ouvir(() => db.regras),
      config: ouvir(() => db.config),
      aparencia: ouvir(() => db.aparencia),
      eventos: ouvir(() => db.eventos),
      agenda: ouvir(() => ({ id: ymd(hoje), eventos: db.agenda, atualizado_em: hoje.toISOString() })),
    },

    async garantirDadosIniciais() { return false; },

    async concluirPendencia(id) {
      Object.assign(achar("pendencias", id), { status: "resolvida", resolvida_em: agoraIso(), resolvida_por: "Painel (manual)" });
    },
    async reabrirPendencia(p) {
      Object.assign(achar("pendencias", p.id), { status: "aberta", resolvida_em: null, resolvida_por: null, coluna_destino: null });
    },
    async aplicarClassificacoes(lista) {
      lista.forEach((c) => Object.assign(achar("pendencias", c.id), { produto_id: c.produto_id, time: c.time }));
    },
    async classificarPendencia(id, prod) {
      Object.assign(achar("pendencias", id), { produto_id: prod?.id ?? null, time: prod?.time ?? null, classificacao_manual: !!prod });
    },

    async addCombinado(c) { db.combinados.push({ id: novoId(), status: "aberto", criado_em: agoraIso(), ...c }); },
    async setCombinado(id, feito) {
      Object.assign(achar("combinados", id), { status: feito ? "feito" : "aberto", concluido_em: feito ? agoraIso() : null });
    },
    async delCombinado(id) { db.combinados = db.combinados.filter((c) => c.id !== id); },

    async addRegra(r) { db.regras.push({ id: novoId(), ...r }); },
    async delRegra(id) { db.regras = db.regras.filter((r) => r.id !== id); },
    async addProduto(p) { db.produtos.push({ id: novoId(), ativo: true, ...p }); },
    async setProduto(id, c) { Object.assign(achar("produtos", id), c); },
    async setSprint(time, c) { Object.assign(db.sprints.find((s) => s.time === time), c); },
    async addFeriado(f) { db.feriados = [...db.feriados.filter((x) => x.data !== f.data), { id: f.data, ...f }]; },
    async delFeriado(data) { db.feriados = db.feriados.filter((f) => f.data !== data); },
    async addLink(l) { db.links.push({ id: novoId(), ...l }); },
    async delLink(id) { db.links = db.links.filter((l) => l.id !== id); },
    async setConfig(k, v) { db.config[k] = v; },
    async setAparencia(campos, substituir = false) {
      if (substituir) { db.aparencia = copia(campos); return; }
      const atual = db.aparencia;
      db.aparencia = {
        ...atual, ...campos,
        cores_times: { ...atual.cores_times, ...campos.cores_times },
        blocos: { ...atual.blocos, ...campos.blocos },
      };
    },
  };
}
