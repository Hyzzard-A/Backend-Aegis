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
