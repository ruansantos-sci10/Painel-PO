-- =====================================================================
-- Migração 01 — cache da agenda (evita o erro 429 do Google Agenda)
-- Rode no SQL Editor do Supabase. Pode rodar mais de uma vez sem problema.
-- =====================================================================

create table if not exists cache_agenda (
  id           int primary key check (id = 1),
  ics          text,
  buscado_em   timestamptz,   -- última vez que o Google respondeu com sucesso
  tentado_em   timestamptz,   -- última tentativa (com ou sem sucesso)
  ultimo_erro  text
);

-- RLS ligado e SEM políticas: só a Edge Function (chave de serviço) acessa.
-- O painel nunca lê esta tabela diretamente.
alter table cache_agenda enable row level security;
