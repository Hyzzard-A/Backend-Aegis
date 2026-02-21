# 🛡️ Backend Aegis — Plataforma de Monitoramento (TCP + REST + WebSocket)

Backend pronto para operação de software de monitoramento, estruturado conforme a arquitetura pedida:

```text
├── TCP Server (Contact ID)
├── Processador de Eventos
├── API REST
├── WebSocket Server
└── Banco
```

A implementação foi alinhada ao documento `Protocolo comunicação softwares monitoramento - publico.pdf`, com foco em:
- recebimento de eventos via TCP (Contact ID e frame 7x),
- decodificação e tratamento centralizado,
- persistência em banco local de arquivo,
- distribuição em tempo real por WebSocket,
- consulta e ingestão de teste via API REST.

---

## ✨ Visão geral da arquitetura

### 1) TCP Server (Contact ID)
- Porta dedicada para receber payloads de equipamentos/centrais.
- Tenta decodificar **Contact ID textual**.
- Se não for textual, tenta interpretar como **frame binário JFL 7x**.
- Responde:
  - `ACK` quando conseguiu processar,
  - `NACK` quando payload não é reconhecido.

Arquivo: `src/modules/tcp/server.ts`.

### 2) Processador de Eventos
- Camada responsável por:
  - validar/decodificar entrada,
  - montar evento canônico do sistema,
  - persistir no banco,
  - publicar no WebSocket.

Arquivo: `src/core/event-processor.ts`.

### 3) API REST
- Endpoints para saúde, workspaces, ingestão de teste e consulta de eventos.

Principais rotas:
- `GET /health`
- `GET /events?limit=100`
- `POST /ingest/contact-id`
- `POST /ingest/jfl-7x`

Arquivo: `src/modules/events/routes.ts`.

### 4) WebSocket Server
- Endpoint: `ws://HOST:PORT/ws`
- Canais:
  - `monitoring` (todos os eventos)
  - `account:<conta>` (eventos da conta)
  - `global` (sistema)
- Ações cliente:
  - `subscribe`
  - `unsubscribe`

Arquivo: `src/modules/realtime/gateway.ts`.

### 5) Banco
- Persistência em arquivo JSON local (banco de arquivo), ideal para laboratório/homologação.
- Caminho configurável por `DB_FILE_PATH`.

Arquivos:
- `src/database/file-database.ts`
- `src/modules/events/repository.ts`

---

## 🧱 Estrutura de pastas

```bash
src/
  app.ts
  server.ts
  config/
    env.ts
  core/
    event-processor.ts
  database/
    file-database.ts
  modules/
    health/
      routes.ts
    events/
      types.ts
      repository.ts
      routes.ts
    protocol/
      jfl-7x.ts
    tcp/
      contact-id.ts
      server.ts
    realtime/
      gateway.ts
    workspaces/
      types.ts
      repository.ts
      service.ts
      routes.ts
  plugins/
    cors.ts
```

---

## ⚙️ Variáveis de ambiente

Use `.env` com base no `.env.example`:

```env
PORT=3000
HOST=0.0.0.0
TCP_PORT=4000
TCP_HOST=0.0.0.0
DB_FILE_PATH=./data/aegis-db.json
NODE_ENV=development
ALLOWED_ORIGINS=http://localhost:5173,http://localhost:3000
```

---

## ▶️ Como executar

```bash
npm install
cp .env.example .env
npm run dev
```

---

## 📡 Como consumir WebSocket

### Conexão

```txt
ws://localhost:3000/ws
```

### Assinar canal de monitoramento global

```json
{ "action": "subscribe", "channel": "monitoring" }
```

### Assinar canal por conta

```json
{ "action": "subscribe", "channel": "account:1234" }
```

### Exemplo de cliente (frontend)

```ts
const ws = new WebSocket('ws://localhost:3000/ws');

ws.addEventListener('open', () => {
  ws.send(JSON.stringify({ action: 'subscribe', channel: 'monitoring' }));
  ws.send(JSON.stringify({ action: 'subscribe', channel: 'account:1234' }));
});

ws.addEventListener('message', (event) => {
  const data = JSON.parse(event.data);
  // event.received, system.connected, system.subscribed...
  console.log(data.type, data.channel, data.data);
});
```

### Formato de evento publicado

```json
{
  "type": "event.received",
  "channel": "monitoring",
  "data": {
    "id": "uuid",
    "sourceProtocol": "contact-id",
    "account": "1234",
    "eventCode": "130",
    "partition": 1,
    "zone": 1,
    "raw": "1234 18 1130 01 001",
    "metadata": {},
    "receivedAt": "2026-01-01T00:00:00.000Z"
  },
  "timestamp": "2026-01-01T00:00:00.000Z"
}
```

---

## 🧪 Endpoints REST (teste e operação)

### `GET /events?limit=100`
Retorna os eventos mais recentes já persistidos.

### `POST /ingest/contact-id`
Permite simular um evento Contact ID via HTTP.

Body:
```json
{ "raw": "1234 18 1130 01 001" }
```

### `POST /ingest/jfl-7x`
Permite simular um frame binário 7x via string hexadecimal.

Body:
```json
{ "hex": "7a05012411223344" }
```

---

## 🔌 Teste TCP rápido (manual)

Em outro terminal, envie um payload textual:

```bash
printf '1234 18 1130 01 001\n' | nc 127.0.0.1 4000
```

Resposta esperada: `ACK`

---

## 📘 Observações importantes sobre protocolo

- O protocolo público tem muitos comandos e variações por equipamento/revisão.
- Nesta versão, o backend já possui a infraestrutura completa e os decoders-base para os principais formatos de entrada (Contact ID + estrutura 7x).
- Para “100% de cobertura” por modelo (todas as tabelas de comandos remotos/status), basta expandir os handlers em `EventProcessor` e no parser de `jfl-7x` mantendo a mesma arquitetura.

---

## ✅ Próximos incrementos recomendados

- Migrar banco de arquivo para PostgreSQL.
- Adicionar autenticação de equipamentos e assinatura HMAC.
- Implementar confirmação transacional de entrega (ACK persistente por evento).
- Criar catálogo completo de códigos de evento (Contact ID/JFL) por tipo de produto.
- Adicionar painéis de observabilidade e métricas de throughput.
# Backend SaaS Base (HTTP + WebSocket)

Este repositório contém uma estrutura completa de backend para SaaS, pronta para testes locais com API REST e comunicação em tempo real via WebSocket.

> Observação: no repositório existia apenas um PDF de referência. A implementação abaixo foi organizada como **base escalável** para iniciar seu produto.

## Stack

- **Node.js + TypeScript**
- **Fastify** para API HTTP
- **@fastify/websocket** para WebSocket
- **Zod** para validação
- **Vitest + Supertest + ws** para testes

## Estrutura de pastas

```bash
src/
  app.ts                      # Monta o app e registra módulos
  server.ts                   # Sobe o servidor
  config/
    env.ts                    # Validação das variáveis de ambiente
  plugins/
    cors.ts                   # Configuração de CORS
  modules/
    health/
      routes.ts               # Endpoint de saúde
    workspaces/
      types.ts                # Tipos do domínio
      repository.ts           # Persistência (em memória)
      service.ts              # Regras de negócio + publicação realtime
      routes.ts               # Endpoints REST de workspace
    realtime/
      gateway.ts              # Gestão de conexões e eventos websocket
tests/
  api.spec.ts                 # Testes da API
  websocket.spec.ts           # Testes do socket
```

## Como executar

1. Instale dependências:

```bash
npm install
```

2. Configure ambiente:

```bash
cp .env.example .env
```

3. Suba em desenvolvimento:

```bash
npm run dev
```

4. Rode os testes:

```bash
npm test
```

## Endpoints HTTP

### `GET /health`
Retorna status da aplicação.

**Resposta exemplo**
```json
{
  "status": "ok",
  "timestamp": "2026-01-01T12:00:00.000Z"
}
```

### `GET /workspaces`
Lista workspaces em memória.

### `POST /workspaces`
Cria workspace e publica evento websocket.

**Body**
```json
{
  "name": "Financeiro"
}
```

**Resposta**
```json
{
  "data": {
    "id": "uuid",
    "name": "Financeiro",
    "createdAt": "2026-01-01T12:00:00.000Z"
  }
}
```

## WebSocket: como consumir

### URL

```txt
ws://localhost:3000/ws
```

### Fluxo padrão

1. Cliente conecta.
2. Servidor envia `system.connected`.
3. Cliente pode assinar canais enviando JSON.
4. Quando um evento de negócio ocorrer (ex: criação de workspace), o servidor envia evento no canal correspondente.

### Mensagens de entrada (cliente -> servidor)

Assinar canal:
```json
{
  "action": "subscribe",
  "channel": "workspace"
}
```

Desassinar canal:
```json
{
  "action": "unsubscribe",
  "channel": "workspace"
}
```

### Mensagens de saída (servidor -> cliente)

Conexão estabelecida:
```json
{
  "type": "system.connected",
  "channel": "global",
  "data": { "clientId": "..." },
  "timestamp": "..."
}
```

Evento de domínio:
```json
{
  "type": "workspace.created",
  "channel": "workspace",
  "data": {
    "id": "...",
    "name": "Marketing",
    "createdAt": "..."
  },
  "timestamp": "..."
}
```

## Exemplo de cliente frontend (browser)

```ts
const socket = new WebSocket('ws://localhost:3000/ws');

socket.addEventListener('open', () => {
  socket.send(JSON.stringify({ action: 'subscribe', channel: 'workspace' }));
});

socket.addEventListener('message', (event) => {
  const payload = JSON.parse(event.data);
  console.log('Evento recebido:', payload.type, payload.data);
});
```

## Explicação do que cada parte faz

- `src/config/env.ts`: carrega e valida variáveis de ambiente, evitando subir o servidor com configuração inválida.
- `src/plugins/cors.ts`: controla origens permitidas para chamadas HTTP.
- `src/modules/realtime/gateway.ts`: mantém clientes conectados, processa subscribe/unsubscribe e distribui eventos por canal.
- `src/modules/workspaces/repository.ts`: camada de dados (em memória) para exemplo rápido e testável.
- `src/modules/workspaces/service.ts`: regra de negócio; ao criar workspace, publica evento realtime.
- `src/modules/workspaces/routes.ts`: expõe REST com validação de payload.
- `src/app.ts`: composição da aplicação (injeção de dependências e registro de rotas).
- `src/server.ts`: bootstrap do servidor.

## Próximos passos recomendados para produção

- Substituir repositório em memória por PostgreSQL.
- Adicionar autenticação JWT e autorização por tenant.
- Persistir sessões/eventos de websocket com Redis (pub/sub).
- Adicionar observabilidade (OpenTelemetry + logs estruturados + métricas).
- Criar versionamento de API (`/v1`).
