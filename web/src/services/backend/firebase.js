// Backend real: Firebase Auth + Firestore (dados em tempo real) + Cloud Functions (agenda e regras).

import { initializeApp } from "firebase/app";
import { getAuth, onAuthStateChanged, signInWithEmailAndPassword, signOut } from "firebase/auth";
import {
  addDoc, collection, deleteDoc, doc, getDoc, getDocs, getFirestore, limit, onSnapshot, orderBy,
  query, serverTimestamp, setDoc, Timestamp, updateDoc, where, writeBatch,
} from "firebase/firestore";
import { getFunctions, httpsCallable } from "firebase/functions";
import { addDias, inicioDoDia } from "@/utils/datas";
import {
  CONFIG_INICIAL, FERIADOS_INICIAIS, LINKS_INICIAIS, PRODUTOS_INICIAIS, SPRINTS_INICIAIS,
} from "../dadosIniciais";

export function criarBackendFirebase(config, regiao) {
  const app = initializeApp(config);
  const auth = getAuth(app);
  const db = getFirestore(app);
  const funcoes = getFunctions(app, regiao);

  const col = (nome) => collection(db, nome);
  const ref = (nome, id) => doc(db, nome, String(id));

  // Timestamps do Firestore viram texto ISO, como o restante do app espera.
  const paraObjeto = (snap) => {
    const dados = snap.data({ serverTimestamps: "estimate" });
    for (const [k, v] of Object.entries(dados)) {
      if (v instanceof Timestamp) dados[k] = v.toDate().toISOString();
    }
    return { id: snap.id, ...dados };
  };

  const ouvir = (consulta) => (cb, falha) =>
    onSnapshot(consulta(), (s) => cb(s.docs.map(paraObjeto)), falha);

  const chamar = async (nome, dados) => (await httpsCallable(funcoes, nome)(dados)).data;

  return {
    info: { projectId: config.projectId, regiao },

    // ---------------- Sessão ----------------
    observarSessao: (cb) => onAuthStateChanged(auth, (u) => cb(u ? { uid: u.uid, email: u.email } : null)),
    async entrar(email, senha) {
      const { user } = await signInWithEmailAndPassword(auth, email, senha);
      return { uid: user.uid, email: user.email };
    },
    sair: () => signOut(auth),

    // ---------------- Leitura em tempo real ----------------
    // Cada função recebe (callback, falha) e devolve a função que cancela a assinatura.
    // As janelas de data são calculadas na assinatura; a loja reassina quando o dia muda.
    ouvir: {
      produtos: ouvir(() => col("produtos")),
      pendenciasAbertas: ouvir(() => query(col("pendencias"), where("status", "==", "aberta"))),
      resolvidas: ouvir(() => query(col("pendencias"),
        where("resolvida_em", ">=", Timestamp.fromDate(addDias(new Date(), -7))))),
      combinados(cb, falha) {
        // "aberto" OU concluído hoje: duas consultas simples, unidas aqui.
        let abertos = [];
        let concluidosHoje = [];
        const emitir = () => cb([...new Map([...abertos, ...concluidosHoje].map((c) => [c.id, c])).values()]);
        const pararAbertos = onSnapshot(query(col("combinados"), where("status", "==", "aberto")),
          (s) => { abertos = s.docs.map(paraObjeto); emitir(); }, falha);
        const pararHoje = onSnapshot(query(col("combinados"),
          where("concluido_em", ">=", Timestamp.fromDate(inicioDoDia()))),
          (s) => { concluidosHoje = s.docs.map(paraObjeto); emitir(); }, falha);
        return () => { pararAbertos(); pararHoje(); };
      },
      sprints: ouvir(() => col("sprints")),
      feriados: ouvir(() => col("feriados")),
      links: ouvir(() => col("links")),
      regras: ouvir(() => col("regras")),
      config: (cb, falha) => onSnapshot(ref("config", "geral"),
        (s) => cb(s.exists() ? s.data() : {}), falha),
      eventos: ouvir(() => query(col("eventos_kanboard"), orderBy("recebido_em", "desc"), limit(30))),
    },

    // Grava produtos, sprints, feriados e atalhos na primeira vez que o painel é aberto.
    async garantirDadosIniciais() {
      if ((await getDoc(ref("config", "geral"))).exists()) return false;
      const b = writeBatch(db);
      PRODUTOS_INICIAIS.forEach((p) => b.set(doc(col("produtos")), { ...p, ativo: true }));
      SPRINTS_INICIAIS.forEach((s) => b.set(ref("sprints", s.time), s));
      FERIADOS_INICIAIS.forEach((f) => b.set(ref("feriados", f.data), f));
      LINKS_INICIAIS.forEach((l) => b.set(doc(col("links")), { ...l, criado_em: serverTimestamp() }));
      b.set(ref("config", "geral"), CONFIG_INICIAL);
      await b.commit();
      return true;
    },

    agenda: (data) => chamar("agenda", { data }),

    // ---------------- Pendências ----------------
    concluirPendencia: (id) => updateDoc(ref("pendencias", id), {
      status: "resolvida", resolvida_em: Timestamp.now(), resolvida_por: "Painel (manual)",
    }),
    async reabrirPendencia(p) {
      const outra = await getDocs(query(col("pendencias"),
        where("solicitacao_id", "==", p.solicitacao_id), where("status", "==", "aberta")));
      if (!outra.empty) throw new Error(`Já existe uma pendência aberta para a solicitação #${p.solicitacao_id}.`);
      await updateDoc(ref("pendencias", p.id), {
        status: "aberta", resolvida_em: null, resolvida_por: null, coluna_destino: null,
      });
    },
    classificarPendencia: (id, produto) => updateDoc(ref("pendencias", id), {
      produto_id: produto?.id ?? null, time: produto?.time ?? null, classificacao_manual: !!produto,
    }),

    // ---------------- Combinados ----------------
    addCombinado: (c) => addDoc(col("combinados"), {
      ...c, status: "aberto", criado_em: serverTimestamp(), concluido_em: null,
    }),
    setCombinado: (id, feito) => updateDoc(ref("combinados", id), {
      status: feito ? "feito" : "aberto", concluido_em: feito ? Timestamp.now() : null,
    }),
    delCombinado: (id) => deleteDoc(ref("combinados", id)),

    // ---------------- Configurações ----------------
    async addRegra(r) {
      await addDoc(col("regras"), { ...r, criado_em: serverTimestamp() });
      await chamar("reaplicarRegras");
    },
    async delRegra(id) {
      await deleteDoc(ref("regras", id));
      await chamar("reaplicarRegras");
    },
    addProduto: (p) => addDoc(col("produtos"), { ...p, ativo: true }),
    setProduto: (id, campos) => updateDoc(ref("produtos", id), campos),
    setSprint: (time, campos) => setDoc(ref("sprints", time), { time, ...campos }, { merge: true }),
    addFeriado: (f) => setDoc(ref("feriados", f.data), f),
    delFeriado: (data) => deleteDoc(ref("feriados", data)),
    addLink: (l) => addDoc(col("links"), { ...l, criado_em: serverTimestamp() }),
    delLink: (id) => deleteDoc(ref("links", id)),
    setConfig: (chave, valor) => setDoc(ref("config", "geral"), { [chave]: valor }, { merge: true }),
  };
}
