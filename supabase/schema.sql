-- =====================================================================
-- Painel do PO — estrutura do banco (Supabase / Postgres)
-- Rode este arquivo inteiro no SQL Editor do Supabase, uma única vez.
-- =====================================================================

-- ---------------------------------------------------------------------
-- Produtos e times
-- ---------------------------------------------------------------------
create table if not exists produtos (
  id       serial primary key,
  nome     text not null unique,
  tamanho  text check (tamanho in ('G','M','P')),
  time     smallint check (time in (1,2)),
  ativo    boolean not null default true
);

insert into produtos (nome, tamanho, time) values
  ('SCI Report Relatórios',        'G', 1),
  ('SCI Report Atendimento',       'P', 1),
  ('SCI Report CND 2.0',           'P', 1),
  ('SCI Report Alvará',            'P', 1),
  ('SCI Report Tarefas',           'M', 1),
  ('RH NET Social',                'G', 2),
  ('APP RH NET',                   'G', 2),
  ('SCI APP',                      'M', 1),
  ('Integra NET',                  'P', 1),
  ('Smart Bank Statement - SBS',   'M', 1),
  ('Integra Contador +',           'P', 1)
on conflict (nome) do nothing;

-- ---------------------------------------------------------------------
-- Regras de classificação (editáveis no painel)
--   tipo 'prefixo': o texto entre parênteses no início do título COMEÇA com o padrão
--                   ex.: padrão 'IC+' casa com '(IC+ Situação Fiscal) ...'
--   tipo 'sprint' : o nome da sprint/quadro CONTÉM o padrão
-- Comparação sem diferenciar maiúsculas/minúsculas.
-- ---------------------------------------------------------------------
create table if not exists regras_classificacao (
  id          serial primary key,
  tipo        text not null check (tipo in ('prefixo','sprint')),
  padrao      text not null,
  produto_id  int references produtos(id) on delete cascade,
  time        smallint check (time in (1,2)),
  criado_em   timestamptz not null default now(),
  check (produto_id is not null or time is not null)
);

-- ---------------------------------------------------------------------
-- Configurações gerais
-- ---------------------------------------------------------------------
create table if not exists configuracoes (
  chave  text primary key,
  valor  text not null
);

insert into configuracoes (chave, valor) values
  ('coluna_po', 'AGUARDANDO PO')
on conflict (chave) do nothing;

-- Sprints: data de início (segunda-feira de referência) e duração de cada time.
-- O painel calcula a sprint atual a partir daqui, pulando fins de semana e feriados.
create table if not exists sprints_config (
  time               smallint primary key check (time in (1,2)),
  inicio_referencia  date not null,
  duracao_dias       int  not null default 14
);

insert into sprints_config (time, inicio_referencia) values
  (1, '2026-10-12'),   -- 12/10 é feriado: o 1º dia útil (13/10) vira o dia 1 da sprint
  (2, '2026-10-05')
on conflict (time) do nothing;

create table if not exists feriados (
  data       date primary key,
  descricao  text
);

-- Feriados nacionais restantes de 2026 em dias úteis. Acrescente os estaduais/municipais pelo painel.
insert into feriados (data, descricao) values
  ('2026-10-12', 'Nossa Senhora Aparecida'),
  ('2026-11-02', 'Finados'),
  ('2026-11-20', 'Dia Nacional de Zumbi e da Consciência Negra'),
  ('2026-12-25', 'Natal')
on conflict (data) do nothing;

-- Atalhos para as ferramentas do dia a dia (editáveis no painel)
create table if not exists links_rapidos (
  id     serial primary key,
  nome   text not null,
  url    text not null,
  ordem  int  not null default 0
);

insert into links_rapidos (nome, url, ordem)
select 'Kanboard', 'https://kanboard.sci.com.br', 1
where not exists (select 1 from links_rapidos);

-- ---------------------------------------------------------------------
-- Pendências (cards que entraram na coluna do PO)
-- ---------------------------------------------------------------------
create table if not exists pendencias (
  id                    bigserial primary key,
  solicitacao_id        bigint not null,
  titulo                text,
  prefixo               text,
  sprint                text,
  atribuido             text,
  movido_por            text,
  link                  text,
  produto_id            int references produtos(id) on delete set null,
  time                  smallint,
  classificacao_manual  boolean not null default false,
  status                text not null default 'aberta' check (status in ('aberta','resolvida')),
  entrou_em             timestamptz not null default now(),
  resolvida_em          timestamptz,
  resolvida_por         text,
  coluna_destino        text
);

-- Só pode existir uma pendência ABERTA por solicitação
create unique index if not exists pendencias_uma_aberta
  on pendencias (solicitacao_id) where status = 'aberta';

-- ---------------------------------------------------------------------
-- Log de tudo o que o Kanboard enviou (texto bruto preservado)
-- ---------------------------------------------------------------------
create table if not exists eventos_kanboard (
  id              bigserial primary key,
  recebido_em     timestamptz not null default now(),
  corpo_bruto     text not null,
  solicitacao_id  bigint,
  de_coluna       text,
  para_coluna     text,
  resultado       text,
  erro            text
);

-- ---------------------------------------------------------------------
-- Combinados e lembretes (registro manual)
-- ---------------------------------------------------------------------
create table if not exists combinados (
  id            bigserial primary key,
  descricao     text not null,
  com_quem      text,
  canal         text check (canal in ('Discord','WhatsApp','Reunião','Outro')),
  prazo         date,
  produto_id    int references produtos(id) on delete set null,
  status        text not null default 'aberto' check (status in ('aberto','feito')),
  criado_em     timestamptz not null default now(),
  concluido_em  timestamptz
);

-- ---------------------------------------------------------------------
-- Cache da agenda (usado só pela Edge Function "agenda", para não
-- consultar o Google a cada abertura do painel e evitar o erro 429)
-- ---------------------------------------------------------------------
create table if not exists cache_agenda (
  id           int primary key check (id = 1),
  ics          text,
  buscado_em   timestamptz,
  tentado_em   timestamptz,
  ultimo_erro  text
);
-- RLS ligado e sem políticas: só a chave de serviço (Edge Function) acessa.
alter table cache_agenda enable row level security;

-- =====================================================================
-- Funções
-- =====================================================================

-- Classifica uma solicitação a partir do prefixo do título e da sprint.
create or replace function classificar(p_prefixo text, p_sprint text)
returns table (o_produto_id int, o_time smallint)
language plpgsql stable as $$
declare
  r_pref   regras_classificacao%rowtype;
  r_sprint regras_classificacao%rowtype;
  v_prod   int;
  v_time   smallint;
begin
  if coalesce(btrim(p_prefixo), '') <> '' then
    select * into r_pref from regras_classificacao rc
     where rc.tipo = 'prefixo'
       and lower(btrim(p_prefixo)) like lower(btrim(rc.padrao)) || '%'
     order by length(rc.padrao) desc
     limit 1;
  end if;

  if coalesce(btrim(p_sprint), '') <> '' then
    select * into r_sprint from regras_classificacao rc
     where rc.tipo = 'sprint'
       and lower(p_sprint) like '%' || lower(btrim(rc.padrao)) || '%'
     order by length(rc.padrao) desc
     limit 1;
  end if;

  v_prod := coalesce(r_pref.produto_id, r_sprint.produto_id);
  select p.time into v_time from produtos p where p.id = v_prod;
  v_time := coalesce(v_time, r_pref.time, r_sprint.time);

  return query select v_prod, v_time;
end $$;

-- Processa uma movimentação vinda do Kanboard.
--   Entrou na coluna do PO  -> abre (ou atualiza) a pendência
--   Saiu da coluna do PO    -> resolve a pendência
create or replace function processar_movimentacao(
  p_solicitacao_id bigint,
  p_titulo         text,
  p_prefixo        text,
  p_sprint         text,
  p_atribuido      text,
  p_de             text,
  p_para           text,
  p_movido_por     text,
  p_link           text
) returns text
language plpgsql security definer set search_path = public as $$
declare
  v_coluna text;
  v_prod   int;
  v_time   smallint;
  v_res    text := 'ignorado';
begin
  select upper(btrim(valor)) into v_coluna from configuracoes where chave = 'coluna_po';

  if upper(btrim(coalesce(p_para, ''))) = v_coluna then
    select c.o_produto_id, c.o_time into v_prod, v_time from classificar(p_prefixo, p_sprint) c;

    update pendencias set
      titulo = p_titulo, prefixo = p_prefixo, sprint = p_sprint,
      atribuido = p_atribuido, movido_por = p_movido_por, link = p_link,
      produto_id = case when pendencias.classificacao_manual then pendencias.produto_id else v_prod end,
      time       = case when pendencias.classificacao_manual then pendencias.time       else v_time end
    where solicitacao_id = p_solicitacao_id and status = 'aberta';

    if not found then
      insert into pendencias (solicitacao_id, titulo, prefixo, sprint, atribuido,
                              movido_por, link, produto_id, time)
      values (p_solicitacao_id, p_titulo, p_prefixo, p_sprint, p_atribuido,
              p_movido_por, p_link, v_prod, v_time);
      v_res := 'pendencia_aberta';
    else
      v_res := 'pendencia_atualizada';
    end if;

  elsif upper(btrim(coalesce(p_de, ''))) = v_coluna then
    update pendencias set
      status = 'resolvida', resolvida_em = now(),
      resolvida_por = p_movido_por, coluna_destino = p_para
    where solicitacao_id = p_solicitacao_id and status = 'aberta';
    v_res := case when found then 'pendencia_resolvida' else 'saida_sem_pendencia' end;
  end if;

  return v_res;
end $$;

-- Reaplica as regras nas pendências abertas que não foram classificadas à mão.
create or replace function reaplicar_regras()
returns int
language plpgsql security definer set search_path = public as $$
declare
  n int;
begin
  update pendencias p set
    produto_id = c.o_produto_id,
    time       = c.o_time
  from pendencias p2
  cross join lateral classificar(p2.prefixo, p2.sprint) c
  where p.id = p2.id
    and p.status = 'aberta'
    and not p.classificacao_manual;
  get diagnostics n = row_count;
  return n;
end $$;

-- =====================================================================
-- Segurança (RLS): só usuários logados acessam.
-- IMPORTANTE: desative o cadastro público em Authentication > Sign In / Providers
-- ("Allow new users to sign up" desligado) depois de criar o seu usuário.
-- =====================================================================
do $$
declare t text;
begin
  foreach t in array array['produtos','regras_classificacao','configuracoes','sprints_config',
                           'feriados','links_rapidos','pendencias','eventos_kanboard','combinados']
  loop
    execute format('alter table %I enable row level security', t);
    execute format('drop policy if exists "acesso_logado" on %I', t);
    execute format('create policy "acesso_logado" on %I for all to authenticated using (true) with check (true)', t);
  end loop;
end $$;

revoke execute on function processar_movimentacao(bigint,text,text,text,text,text,text,text,text) from anon, public;
revoke execute on function reaplicar_regras() from anon, public;
grant  execute on function reaplicar_regras() to authenticated;
