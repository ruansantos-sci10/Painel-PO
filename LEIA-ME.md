# Painel do PO: instalação

Um único lugar para abrir de manhã e ver:
- **Aguardando você:** cards que entraram na coluna do PO no Kanboard, agrupados por time e produto.
- **Agenda de hoje:** reuniões do Google Agenda, incluindo as recorrentes (dailies etc.).
- **Combinados e lembretes:** o que você combinou no WhatsApp e no Discord, com prazo.
- **Sprints:** dia útil atual de cada time, já descontando feriados.
- **Atalhos** para as ferramentas do dia a dia (Kanboard, Miro, intranet...).

```
Kanboard ──(webhook)──► Edge Function "kanboard-webhook" ──► Supabase (banco)
Google Agenda (iCal secreto) ◄── Edge Function "agenda" ◄───┐       ▲
                                                             └── Painel (Netlify)
```

## Arquivos

| Arquivo | O que é |
|---|---|
| `supabase/schema.sql` | Estrutura do banco: tabelas, regras e segurança |
| `supabase/functions/kanboard-webhook/index.ts` | Recebe as mensagens do Kanboard |
| `supabase/functions/agenda/index.ts` | Lê o Google Agenda |
| `site/index.html` | O painel |

---

## Passo 1: criar o projeto no Supabase (≈3 min)
1. Em <https://supabase.com/dashboard>, clique em **New project**. Região sugerida: **South America (São Paulo)**.
2. Abra o **SQL Editor**, cole o conteúdo inteiro de `supabase/schema.sql` e clique em **Run**.
   - Isso cria as tabelas, os 11 produtos, as datas das sprints (Time 1: 12/10, que com o feriado vira 13/10; Time 2: 05/10) e os feriados nacionais que ainda faltam em 2026.

## Passo 2: criar o seu usuário e fechar o cadastro (≈2 min)
1. Vá em **Authentication → Users → Add user → Create new user**. Informe e-mail e senha e marque **Auto Confirm User**.
2. Vá em **Authentication → Sign In / Providers** e **desligue "Allow new users to sign up"**.
   > ⚠️ Esse passo é importante. Sem ele, qualquer pessoa com o link do painel poderia criar uma conta e ver os dados.

## Passo 3: configurar os segredos (≈3 min)
Vá em **Edge Functions → Secrets** e crie:

| Nome | Valor |
|---|---|
| `WEBHOOK_TOKEN` | Uma senha longa e aleatória, inventada por você (ex.: 40 letras e números). Ela vai na URL do Kanboard. |
| `ICAL_URL` | No Google Agenda: ⚙️ **Configurações → (sua agenda) → Integrar agenda → "Endereço secreto no formato iCal"**. Copie e cole aqui. |

> O endereço iCal secreto dá acesso de leitura à sua agenda. Não compartilhe esse link. Se ele vazar, você pode gerar um novo na mesma tela do Google.

## Passo 4: publicar as duas Edge Functions (≈5 min)
Em **Edge Functions → Deploy a new function → Via Editor**:

1. **`kanboard-webhook`**
   - Nome: `kanboard-webhook`. Cole o conteúdo de `supabase/functions/kanboard-webhook/index.ts` e clique em **Deploy**.
   - Depois, nas configurações da função, **desligue "Verify JWT" / "Enforce JWT verification"**. O Kanboard não envia login do Supabase; a proteção é o `WEBHOOK_TOKEN`.
2. **`agenda`**
   - Nome: `agenda`. Cole o conteúdo de `supabase/functions/agenda/index.ts` e clique em **Deploy**.
   - Deixe o **Verify JWT ligado**, para que só o painel logado consiga ler a agenda.

### Teste do webhook (opcional, pelo PowerShell)
Troque `SEU-PROJETO` e `SEU-TOKEN` e rode o comando abaixo. Ele simula um card entrando na coluna do PO:
```powershell
$msg = @'
**Solicitação**: 999999 - (TESTE) Card de teste do painel
**Sprint**: ➙ TESTE
**Movido da coluna**: NOVOS
**Movido para a coluna**: AGUARDANDO PO
**Movido por**: Teste
'@
Invoke-RestMethod -Method Post -Uri "https://SEU-PROJETO.supabase.co/functions/v1/kanboard-webhook?token=SEU-TOKEN" -Body $msg -ContentType "text/plain; charset=utf-8"
```
A resposta esperada é `ok: True` e `resultado: pendencia_aberta`. Depois, conclua o card de teste no painel.

## Passo 5: configurar o Kanboard (≈5–10 min)
1. Crie a coluna **`AGUARDANDO PO`**. Se escolher outro nome, ajuste em **Configurações → Nome da coluna do PO** no painel.
2. Na ação automática que envia a mensagem para o webhook, use a URL:
   ```
   https://SEU-PROJETO.supabase.co/functions/v1/kanboard-webhook?token=SEU-TOKEN
   ```
3. Como a ação **só dispara quando o card entra** na coluna configurada, crie a mesma ação para:
   - a coluna **AGUARDANDO PO** (abre a pendência);
   - **todas as outras colunas** (quando o card sai do PO para qualquer uma delas, a pendência é resolvida sozinha).
   - Os eventos das outras colunas não geram nada no painel. Ficam só registrados no log.
4. **Confira:** as ações automáticas são configuradas **por projeto/sprint** no Kanboard? Se cada sprint nova é um projeto novo, verifique se as ações são copiadas junto. Se não forem, será preciso recriá-las a cada sprint.

Se algum card escapar, use o botão **Concluir** no painel.

## Passo 6: publicar o painel no Netlify (≈3 min)
1. Abra `site/index.html` num editor de texto e preencha no topo:
   ```js
   SUPABASE_URL: "https://SEU-PROJETO.supabase.co",
   SUPABASE_ANON_KEY: "a chave anon/publishable"
   ```
   Os dois valores ficam em **Project Settings → API** (a chave aparece como *anon public* ou *publishable*). Essa chave pode ficar no site: quem protege os dados é o login e o fechamento do cadastro (passo 2).
   > **Nunca** coloque a chave `service_role` / `secret` no site.
2. Crie uma conta gratuita em <https://app.netlify.com>, vá em **Sites → Add new site → Deploy manually** e **arraste a pasta `site`**.
3. Pronto. Use o link gerado (dá para renomear em *Site configuration*) e deixe-o fixado no navegador.
   - Para atualizar o painel no futuro, arraste a pasta de novo em **Deploys**.

## Passo 7: primeiros ajustes no painel (aba Configurações)
- **Regras de classificação:** para cada prefixo que os analistas usam, crie uma regra. Exemplo: o prefixo `IC+` do card 227375 parece ser o **Integra Contador +**, mas confirme antes de criar a regra.
  - A seção "Prefixos em cards sem produto" mostra os prefixos que ainda não têm regra.
  - Para quadros/sprints que pertencem a um só time, crie também uma regra do tipo **Sprint**.
- **Links rápidos:** Miro (board geral), intranet, Discord, WhatsApp Web, Google Agenda e as planilhas de planning no Drive.
- **Feriados:** acrescente os feriados estaduais e municipais que a empresa respeita.
- **Eventos recebidos:** use para conferir se o Kanboard está enviando e se as mensagens estão sendo entendidas.

---

## Bom saber
- **Custo:** zero (planos gratuitos do Supabase e do Netlify), sem uso do Make.
- **Pausa do Supabase gratuito:** projetos sem atividade por cerca de 7 dias são pausados. Com uso diário e os webhooks chegando isso não deve acontecer. Se acontecer, é só reativar no dashboard.
- **Atualização:** o painel se atualiza sozinho a cada 5 minutos e sempre que você volta para a aba.
- **Conta Google pessoal:** a agenda é lida direto do Google pela Edge Function. Os títulos dos cards ficam no Supabase, não no seu Drive.

## Próximas etapas (ainda não construídas)
1. **Tendência das solicitações** (o que os clientes estão pedindo): depende de os devs criarem um webhook ou uma exportação de solicitações novas da intranet (produto, cliente, tipo e data). A estrutura atual comporta essa visão.
2. Registro de combinados direto pelo celular, por exemplo com um atalho para o painel na tela inicial.
