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
