# Painel do PO

Um único lugar para abrir de manhã e ver:
- **Aguardando você:** cards que entraram na coluna do PO no Kanboard, agrupados por time e produto.
- **Agenda de hoje:** reuniões do Google Agenda, incluindo as recorrentes (dailies etc.).
- **Combinados e lembretes:** o que você combinou no WhatsApp e no Discord, com prazo.
- **Sprints:** dia útil atual de cada time, já descontando feriados.
- **Atalhos** para as ferramentas do dia a dia (Kanboard, Miro, intranet...).

**Custo zero e sem cartão:** Firebase no plano gratuito (Spark) + Google Apps Script + GitHub Pages.

```
Kanboard ──(webhook)──► Google Apps Script ──► Firestore (Firebase Spark) ◄──(tempo real)── Painel em Vue
Google Agenda ──(a cada 15 min)──┘                                                          (GitHub Pages)
```

- O **Apps Script** faz o papel de servidor: recebe o webhook do Kanboard e copia a agenda para o Firestore.
- O **painel** lê tudo em tempo real e aplica as regras de classificação (produto/time) nas pendências.

## Estrutura do repositório

| Caminho | O que é |
|---|---|
| `web/` | O painel: Vue 3 + Vite + Pinia + Vue Router. É o que vai para o GitHub Pages. |
| `web/src/firebase.config.js` | Configuração do app Web do Firebase. **Vazio = modo demonstração.** |
| `web/src/services/backend/` | Camada de dados: `firebase.js` (real) e `demo.js` (em memória), com a mesma interface. |
| `web/src/stores/` | Estado (Pinia): sessão, dados em tempo real (inclui a classificação automática) e avisos. |
| `web/src/views/` e `web/src/components/` | Telas **Hoje** e **Configurações**, divididas em componentes. |
| `apps-script/` | Código do Google Apps Script (`Codigo.gs` + `appsscript.json`): webhook e agenda. |
| `firestore.rules` | Segurança do banco: só usuários logados **e** liberados em `autorizados/{uid}`. |
| `.github/workflows/deploy-pages.yml` | Gera o site e publica no GitHub Pages a cada push na `main`. |

### Coleções do Firestore

| Coleção | Conteúdo |
|---|---|
| `produtos` | nome, tamanho (G/M/P), time (1/2), ativo |
| `regras` | tipo (`prefixo`/`sprint`), padrão, produto_id, time |
| `config/geral` | `coluna_po` (coluna do PO no Kanboard) e `url_web_app` (URL do Apps Script) |
| `sprints/{time}` | nome do time (editável), início de referência e duração |
| `feriados/{AAAA-MM-DD}` | descrição |
| `links` | atalhos do topo |
| `pendencias` | cards na coluna do PO (abertas e resolvidas) |
| `eventos_kanboard` | tudo o que o Kanboard enviou, com o texto bruto |
| `combinados` | combinados e lembretes |
| `agenda/{AAAA-MM-DD}` | eventos do dia, gravados pelo Apps Script |
| `autorizados/{uid}` | quem pode usar o painel (criado à mão) |

Os produtos, sprints, feriados, a coluna do PO e o atalho do Kanboard são gravados automaticamente no **primeiro acesso** ao painel.

---

## Passo 1: criar o projeto no Firebase (≈5 min)
Use a **mesma conta Google da sua agenda** (o Apps Script vai usar essa conta para ler a agenda e gravar no banco).

1. Em <https://console.firebase.google.com>, clique em **Adicionar projeto**. O Google Analytics pode ficar desligado.
   O projeto fica no plano **Spark (gratuito)**: não é preciso cadastrar cartão.
2. Em **Firestore Database → Criar banco de dados**: escolha o local **southamerica-east1 (São Paulo)** e o **modo de produção**.
3. Ainda no Firestore, abra a aba **Regras**, apague o conteúdo, cole o arquivo `firestore.rules` inteiro e clique em **Publicar**.

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

## Passo 4: publicar o painel no GitHub Pages (≈3 min)
1. No GitHub, abra o repositório → **Settings → Pages → Build and deployment → Source: GitHub Actions**.
2. Faça commit e push na `main` (com o `firebase.config.js` preenchido). A action **Publicar painel no GitHub Pages** gera e publica o site.
3. O painel fica em `https://ruansantos-sci10.github.io/Painel-PO/`. **Entre uma vez** com o usuário do passo 2: o primeiro acesso grava os dados iniciais (inclusive a coluna do PO, que o webhook usa).

## Passo 5: instalar o Google Apps Script (≈10 min)
1. Em <https://script.google.com>, clique em **Novo projeto** e dê um nome (ex.: `Painel do PO`).
2. **Código:** apague o conteúdo de `Código.gs` e cole o arquivo `apps-script/Codigo.gs` inteiro.
3. **Manifesto:** em **Configurações do projeto (⚙️)**, marque **"Mostrar arquivo de manifesto appsscript.json no editor"**. Volte ao editor, abra `appsscript.json` e substitua pelo conteúdo de `apps-script/appsscript.json`.
4. **Propriedades do script** (em **Configurações do projeto → Propriedades do script → Adicionar**):

   | Propriedade | Valor |
   |---|---|
   | `FIREBASE_PROJECT_ID` | ID do projeto Firebase (aparece em **Configurações do projeto** no Firebase, ex.: `painel-po-12345`) |
   | `WEBHOOK_TOKEN` | Uma senha longa e aleatória inventada por você (ex.: 40 letras e números). Ela vai na URL do Kanboard. |
   | `AGENDA_ID` | *(opcional)* ID de outra agenda. Sem ela, usa a sua agenda principal. |

5. **Instalar:** no editor, escolha a função **`instalar`** e clique em **Executar**.
   - O Google pede autorização (ler a agenda, acessar o Firestore, criar gatilhos). Como o script é seu, aparece "O Google não verificou este app": clique em **Avançado → Acessar Painel do PO (não seguro)** e permita.
   - No log deve aparecer **"Pronto! Agenda sincronizada…"**. A partir daí a agenda é atualizada a cada 15 minutos.
6. **Testar o acesso ao banco:** execute a função **`testarWebhook`**. O log deve mostrar `"ok":true` e `"resultado":"pendencia_aberta"`, e o card de teste aparece no painel. Conclua-o depois.
7. **Publicar o webhook:** **Implantar → Nova implantação → tipo App da Web**:
   - Executar como: **Eu**
   - Quem pode acessar: **Qualquer pessoa**
   - Clique em **Implantar** e copie a **URL do app da Web** (termina em `/exec`).
   - No painel, cole essa URL em **Configurações → Kanboard → URL do web app** e salve. O painel mostra a URL completa do webhook para copiar.
   > "Qualquer pessoa" só significa que o Kanboard consegue chamar a URL. Sem o `WEBHOOK_TOKEN` certo, nada é gravado.
   > Se mudar o código depois, use **Implantar → Gerenciar implantações → Editar → Nova versão** para manter a mesma URL.

### Teste do webhook (opcional, pelo PowerShell)
Troque a URL e o token e rode o comando abaixo. Ele simula um card entrando na coluna do PO:
```powershell
$msg = @'
**Solicitação**: 999998 - (TESTE) Card de teste do webhook
**Sprint**: ➙ TESTE
**Movido da coluna**: NOVOS
**Movido para a coluna**: AGUARDANDO PO
**Movido por**: Teste
'@
Invoke-RestMethod -Method Post -Uri "https://script.google.com/macros/s/SEU-ID/exec?token=SEU-TOKEN" -Body $msg -ContentType "text/plain; charset=utf-8"
```
A resposta esperada é `ok: True` e `resultado: pendencia_aberta`.

## Passo 6: configurar o Kanboard (≈5–10 min)
1. Crie a coluna **`AGUARDANDO PO`**. Se escolher outro nome, ajuste em **Configurações → Kanboard** no painel.
2. Na ação automática que envia a mensagem para o webhook, use a URL do passo 5 com o token:
   ```
   https://script.google.com/macros/s/SEU-ID/exec?token=SEU-TOKEN
   ```
3. Como a ação **só dispara quando o card entra** na coluna configurada, crie a mesma ação para:
   - a coluna **AGUARDANDO PO** (abre a pendência);
   - **todas as outras colunas** (quando o card sai do PO para qualquer uma delas, a pendência é resolvida sozinha).
   - Os eventos das outras colunas não geram nada no painel. Ficam só registrados no log.
4. **Confira:** as ações automáticas são configuradas **por projeto/sprint** no Kanboard? Se cada sprint nova é um projeto novo, verifique se as ações são copiadas junto. Se não forem, será preciso recriá-las a cada sprint.

Se algum card escapar, use o botão **Concluir** no painel.

> O Apps Script sempre responde com um redirecionamento (HTTP 302) antes do resultado. A mensagem já foi processada nesse momento; se o Kanboard registrar isso como falha, confira em **Configurações → Eventos recebidos** se o evento chegou.

## Passo 7: primeiros ajustes no painel (aba Configurações)
- **Regras de classificação:** para cada prefixo que os analistas usam, crie uma regra. Exemplo: o prefixo `IC+` do card 227375 parece ser o **Integra Contador +**, mas confirme antes de criar a regra.
  - O aviso "Prefixos em cards sem produto" mostra os prefixos que ainda não têm regra (clique para usar).
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
- **Tempo real:** pendências, combinados, configurações e agenda chegam do Firestore na hora, sem recarregar.
- **Classificação:** o webhook só registra o card; o painel aplica as regras assim que é aberto (e sempre que uma regra ou produto muda). Cards classificados à mão não são alterados.
- **Agenda:** o Apps Script lê a agenda pela API do Google (já com reuniões recorrentes e link do Meet) e guarda hoje + 6 dias. Convites recusados não aparecem. Se a agenda ficar mais de 45 min sem atualizar, o painel avisa.
- **Cotas gratuitas:** o Firestore Spark permite 50 mil leituras e 20 mil gravações por dia; o Apps Script, 90 min de gatilhos por dia. O painel usa uma fração disso.
- **Falhas do Apps Script:** o Google envia um e-mail diário se o gatilho da agenda falhar. O histórico fica em **Execuções**, no editor do Apps Script.
- **Se o Apps Script der erro "Firestore respondeu 403":** confirme que o `FIREBASE_PROJECT_ID` está certo e que o script está na mesma conta Google dona do projeto Firebase.

## Próximas etapas (ainda não construídas)
1. **Tendência das solicitações** (o que os clientes estão pedindo): depende de os devs criarem um webhook ou uma exportação de solicitações novas da intranet (produto, cliente, tipo e data). A estrutura atual comporta essa visão.
2. Registro de combinados direto pelo celular, por exemplo com um atalho para o painel na tela inicial.
