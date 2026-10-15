// =================================================================
// CONFIGURAÇÃO — preencha com os dados do app Web do seu projeto Firebase
// (Console do Firebase > Configurações do projeto > Seus apps > SDK setup and configuration).
//
// Esses valores são públicos por natureza e podem ficar no GitHub: quem protege os dados
// são o login e as regras do Firestore (firestore.rules + coleção "autorizados").
//
// Deixe apiKey em branco para abrir em MODO DEMONSTRAÇÃO.
// =================================================================
export const firebaseConfig = {
  apiKey: "",
  authDomain: "",
  projectId: "",
  storageBucket: "",
  messagingSenderId: "",
  appId: "",
};

// Região onde as Cloud Functions foram publicadas (mesma de functions/src/base.js).
export const REGIAO_FUNCOES = "southamerica-east1";
