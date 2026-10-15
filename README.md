# Painel do PO

Um único lugar para abrir de manhã e ver:
- **Aguardando você:** cards que entraram na coluna do PO no Kanboard, agrupados por time e produto.
- **Agenda de hoje:** reuniões do Google Agenda, incluindo as recorrentes (dailies etc.).
- **Combinados e lembretes:** o que você combinou no WhatsApp e no Discord, com prazo.
- **Sprints:** dia útil atual de cada time, já descontando feriados.
- **Atalhos** para as ferramentas do dia a dia (Kanboard, Miro, intranet...).

```
Kanboard ──(webhook)──► Cloud Function "kanboardWebhook" ──► Firestore (banco)
Google Agenda (iCal secreto) ◄── Cloud Function "agenda" ◄──┐        ▲  (tempo real)
                                                              └── Painel em Vue (GitHub Pages)
```

## Estrutura do repositório

| Caminho | O que é |
|---|---|
| `web/` | O painel: Vue 3 + Vite + Pinia + Vue Router. É o que vai para o GitHub Pages. |
| `web/src/firebase.config.js` | Configuração do app Web do Firebase. **Vazio = modo demonstração.** |
| `web/src/services/backend/` | Camada de dados: `firebase.js` (real) e `demo.js` (em memória), com a mesma interface. |
| `web/src/stores/` | Estado (Pinia): sessão, dados em tempo real, agenda e avisos. |
| `web/src/views/` e `web/src/components/` | Telas **Hoje** e **Configurações**, divididas em componentes. |
| `functions/` | Cloud Functions: webhook do Kanboard, leitura da agenda e reclassificação das pendências. |
| `firestore.rules` | Segurança do banco: só usuários logados **e** liberados em `autorizados/{uid}`. |
| `.github/workflows/deploy-pages.yml` | Gera o site e publica no GitHub Pages a cada push na `main`. |

### Coleções do Firestore

| Coleção | Conteúdo |
|---|---|
| `produtos` | nome, tamanho (G/M/P), time (1/2), ativo |
| `regras` | tipo (`prefixo`/`sprint`), padrão, produto_id, time |
| `config/geral` | `coluna_po` (nome da coluna do PO no Kanboard) |
| `sprints/{time}` | nome do time (editável), início de referência e duração |
| `feriados/{AAAA-MM-DD}` | descrição |
| `links` | atalhos do topo |
| `pendencias` | cards na coluna do PO (abertas e resolvidas) |
| `eventos_kanboard` | tudo o que o Kanboard enviou, com o texto bruto |
| `combinados` | combinados e lembretes |
| `autorizados/{uid}` | quem pode usar o painel (criado à mão) |
| `cache/agenda` | cache da agenda (só as Cloud Functions acessam) |

Os produtos, sprints, feriados, a coluna do PO e o atalho do Kanboard são gravados automaticamente no **primeiro acesso** ao painel.

---

## Passo 1: criar o projeto no Firebase (≈5 min)
1. Em <https://console.firebase.google.com>, clique em **Adicionar projeto**. O Google Analytics pode ficar desligado.
2. Mude para o plano **Blaze** (pagamento por uso). As Cloud Functions e os segredos exigem esse plano, mas o uso de um painel pessoal fica dentro da cota gratuita.
   > Em **Uso e faturamento → Detalhes e configurações**, crie um **alerta de orçamento** (ex.: R$ 5) por segurança.
3. Em **Firestore Database → Criar banco de dados**: escolha o local **southamerica-east1 (São Paulo)** e o **modo de produção**.

## Passo 2: login e liberação do seu usuário (≈3 min)
1. **Authentication → Sign-in method**: ative **E-mail/senha**.
2. **Authentication → Users → Adicionar usuário**: informe e-mail e senha. Copie o **UID** que aparece na lista.
3. **Firestore Database → Iniciar coleção**:
   - ID da coleção: `autorizados`
   - ID do documento: **o UID copiado**
   - Um campo qualquer, ex.: `email` = seu e-mail.
   > ⚠️ Esse documento é o que libera o acesso. Mesmo que alguém crie uma conta, sem ele não vê nenhum dado.
4. **Authentication → Settings → Domínios autorizados**: adicione `ruansantos-sci10.github.io`.

## Passo 3: ligar o painel ao Firebase (≈2 min)
1. **Configurações do projeto (⚙️) → Seus apps → Web (`</>`)**: registre um app (não precisa de Hosting).
2. Copie o objeto `firebaseConfig` mostrado e cole em `web/src/firebase.config.js`.
   Esses valores são públicos por natureza e podem ir para o GitHub: quem protege os dados é o login + o `firestore.rules`.

## Passo 4: publicar as regras e as Cloud Functions (≈10 min)
Precisa do [Node.js 22](https://nodejs.org) instalado. No terminal, na pasta do repositório:

```bash
npm install -g firebase-tools
firebase login
```

Troque `SEU-PROJETO-FIREBASE` pelo ID do projeto no arquivo `.firebaserc` e crie os dois segredos (o terminal pede o valor):

| Segredo | Valor |
|---|---|
| `WEBHOOK_TOKEN` | Uma senha longa e aleatória inventada por você (ex.: 40 letras e números). Ela vai na URL do Kanboard. |
| `ICAL_URL` | No Google Agenda: ⚙️ **Configurações → (sua agenda) → Integrar agenda → "Endereço secreto no formato iCal"**. |

```bash
firebase functions:secrets:set WEBHOOK_TOKEN
```

```bash
firebase functions:secrets:set ICAL_URL
```

Depois instale as dependências das funções e publique tudo:

```bash
npm --prefix functions install
```

```bash
firebase deploy --only firestore,functions
```

> O endereço iCal secreto dá acesso de leitura à sua agenda. Ele fica só no Secret Manager do Firebase, nunca no site. Se vazar, gere um novo na mesma tela do Google e rode o `secrets:set` de novo (seguido de um novo deploy).

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
Invoke-RestMethod -Method Post -Uri "https://southamerica-east1-SEU-PROJETO.cloudfunctions.net/kanboardWebhook?token=SEU-TOKEN" -Body $msg -ContentType "text/plain; charset=utf-8"
```
A resposta esperada é `ok: True` e `resultado: pendencia_aberta`. Abra o painel uma vez antes do teste (o primeiro acesso grava a coluna do PO). Depois, conclua o card de teste no painel.

## Passo 5: configurar o Kanboard (≈5–10 min)
1. Crie a coluna **`AGUARDANDO PO`**. Se escolher outro nome, ajuste em **Configurações → Nome da coluna do PO** no painel.
2. Na ação automática que envia a mensagem para o webhook, use a URL (ela também aparece em **Configurações → Kanboard e atalhos**):
   ```
   https://southamerica-east1-SEU-PROJETO.cloudfunctions.net/kanboardWebhook?token=SEU-TOKEN
   ```
3. Como a ação **só dispara quando o card entra** na coluna configurada, crie a mesma ação para:
   - a coluna **AGUARDANDO PO** (abre a pendência);
   - **todas as outras colunas** (quando o card sai do PO para qualquer uma delas, a pendência é resolvida sozinha).
   - Os eventos das outras colunas não geram nada no painel. Ficam só registrados no log.
4. **Confira:** as ações automáticas são configuradas **por projeto/sprint** no Kanboard? Se cada sprint nova é um projeto novo, verifique se as ações são copiadas junto. Se não forem, será preciso recriá-las a cada sprint.

Se algum card escapar, use o botão **Concluir** no painel.

## Passo 6: publicar o painel no GitHub Pages (≈3 min)
1. No GitHub, abra o repositório → **Settings → Pages → Build and deployment → Source: GitHub Actions**.
2. Faça commit e push na `main` (com o `firebase.config.js` preenchido). A action **Publicar painel no GitHub Pages** gera e publica o site.
3. Pronto: o painel fica em `https://ruansantos-sci10.github.io/Painel-PO/`. Deixe-o fixado no navegador.
   - Para atualizar, basta dar push na `main` com mudanças em `web/`, ou rodar a action manualmente em **Actions**.

## Passo 7: primeiros ajustes no painel (aba Configurações)
- **Regras de classificação:** para cada prefixo que os analistas usam, crie uma regra. Exemplo: o prefixo `IC+` do card 227375 parece ser o **Integra Contador +**, mas confirme antes de criar a regra.
  - A seção "Prefixos em cards sem produto" mostra os prefixos que ainda não têm regra.
  - Para quadros/sprints que pertencem a um só time, crie também uma regra do tipo **Sprint**.
- **Links rápidos:** Miro (board geral), intranet, Discord, WhatsApp Web, Google Agenda e as planilhas de planning no Drive.
- **Times e sprints:** dê um nome a cada time (ex.: o nome da squad); ele aparece em todo o painel.
- **Feriados:** acrescente os feriados estaduais e municipais que a empresa respeita.
- **Eventos recebidos:** use para conferir se o Kanboard está enviando e se as mensagens estão sendo entendidas.

---

## Desenvolvimento local

```bash
npm --prefix web install
```

```bash
npm --prefix web run dev
```

Com o `firebase.config.js` vazio, o painel abre em **modo demonstração** (dados de exemplo em memória, nada é salvo).

## Bom saber
- **Tempo real:** pendências, combinados e configurações chegam do Firestore na hora, sem recarregar. A agenda é consultada a cada 10 minutos (e o servidor guarda cache de 15 minutos para o Google não bloquear).
- **Atualização automática:** a cada 5 minutos e sempre que você volta para a aba; o botão **↻ Atualizar** força a releitura.
- **Custo:** dentro da cota gratuita do plano Blaze para um uso pessoal. O alerta de orçamento do passo 1 avisa se algo fugir do esperado.
- **Conta Google pessoal:** a agenda é lida direto do Google pela Cloud Function. Os títulos dos cards ficam no Firestore, não no seu Drive.

## Próximas etapas (ainda não construídas)
1. **Tendência das solicitações** (o que os clientes estão pedindo): depende de os devs criarem um webhook ou uma exportação de solicitações novas da intranet (produto, cliente, tipo e data). A estrutura atual comporta essa visão.
2. Registro de combinados direto pelo celular, por exemplo com um atalho para o painel na tela inicial.
