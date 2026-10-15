// Dados gravados no Firestore no primeiro acesso (quando config/geral ainda não existe).
// Também servem de base para o modo demonstração.

export const PRODUTOS_INICIAIS = [
  { nome: "SCI Report Relatórios", tamanho: "G", time: 1 },
  { nome: "SCI Report Atendimento", tamanho: "P", time: 1 },
  { nome: "SCI Report CND 2.0", tamanho: "P", time: 1 },
  { nome: "SCI Report Alvará", tamanho: "P", time: 1 },
  { nome: "SCI Report Tarefas", tamanho: "M", time: 1 },
  { nome: "RH NET Social", tamanho: "G", time: 2 },
  { nome: "APP RH NET", tamanho: "G", time: 2 },
  { nome: "SCI APP", tamanho: "M", time: 1 },
  { nome: "Integra NET", tamanho: "P", time: 1 },
  { nome: "Smart Bank Statement - SBS", tamanho: "M", time: 1 },
  { nome: "Integra Contador +", tamanho: "P", time: 1 },
];

export const CONFIG_INICIAL = { coluna_po: "AGUARDANDO PO" };

// Nome editável de cada time + sprint. 12/10 é feriado: o 1º dia útil (13/10) vira o dia 1 da sprint do Time 1.
export const SPRINTS_INICIAIS = [
  { time: 1, nome: "Time 1", inicio_referencia: "2026-10-12", duracao_dias: 14 },
  { time: 2, nome: "Time 2", inicio_referencia: "2026-10-05", duracao_dias: 14 },
];

// Feriados nacionais restantes de 2026 em dias úteis. Os estaduais/municipais entram pelo painel.
export const FERIADOS_INICIAIS = [
  { data: "2026-10-12", descricao: "Nossa Senhora Aparecida" },
  { data: "2026-11-02", descricao: "Finados" },
  { data: "2026-11-20", descricao: "Dia Nacional de Zumbi e da Consciência Negra" },
  { data: "2026-12-25", descricao: "Natal" },
];

export const LINKS_INICIAIS = [{ nome: "Kanboard", url: "https://kanboard.sci.com.br", ordem: 1 }];

export const CANAIS = ["WhatsApp", "Discord", "Reunião", "Outro"];
export const TAMANHOS = ["G", "M", "P"];
export const TIMES = [1, 2];
