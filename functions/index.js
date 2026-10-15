// Ponto de entrada das Cloud Functions do Painel do PO.
//
//   kanboardWebhook  (HTTP)      recebe as movimentações do Kanboard e abre/resolve pendências
//   agenda           (callable)  devolve os eventos do Google Agenda de um dia
//   reaplicarRegras  (callable)  reclassifica as pendências abertas após mudar as regras

export { kanboardWebhook } from "./src/kanboard.js";
export { agenda } from "./src/agenda.js";
export { reaplicarRegras } from "./src/classificacao.js";
