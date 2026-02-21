import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import WebSocket from 'ws';
import { buildApp } from '../src/app';

describe('Gateway WebSocket', () => {
  let app: Awaited<ReturnType<typeof buildApp>>;
  let baseUrl: string;

  beforeAll(async () => {
    app = await buildApp();
    await app.listen({ host: '127.0.0.1', port: 0 });
    const address = app.server.address();

    if (!address || typeof address === 'string') {
      throw new Error('Endereço inválido para teste websocket');
    }

    baseUrl = `ws://127.0.0.1:${address.port}/ws`;
  });

  afterAll(async () => {
    await app.close();
  });

  it('envia evento de conexão e recebe evento de domínio', async () => {
    const ws = new WebSocket(baseUrl);

    const messages: string[] = [];

    await new Promise<void>((resolve, reject) => {
      ws.on('open', resolve);
      ws.on('error', reject);
    });

    ws.on('message', (data) => {
      messages.push(String(data));
    });

    await fetch(`http://127.0.0.1:${(app.server.address() as any).port}/workspaces`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ name: 'Marketing' })
    });

    await new Promise((resolve) => setTimeout(resolve, 150));

    ws.close();

    const parsed = messages.map((item) => JSON.parse(item));
    const eventTypes = parsed.map((event) => event.type);

    expect(eventTypes).toContain('system.connected');
    expect(eventTypes).toContain('workspace.created');
  });
});
