import type { FastifyBaseLogger } from 'fastify';
import type WebSocket from 'ws';

type ClientInfo = {
  socket: WebSocket;
  subscribedChannels: Set<string>;
};

type EventPayload = {
  type: string;
  channel: string;
  data: unknown;
  timestamp: string;
};

export class RealtimeGateway {
  private readonly clients = new Map<string, ClientInfo>();

  constructor(private readonly logger: FastifyBaseLogger) {}

  registerConnection(clientId: string, socket: WebSocket): void {
    this.clients.set(clientId, { socket, subscribedChannels: new Set(['global']) });
    this.logger.info({ clientId }, 'Cliente websocket conectado');

    this.sendToClient(clientId, {
      type: 'system.connected',
      channel: 'global',
      data: { clientId },
      timestamp: new Date().toISOString()
    });

    socket.on('close', () => {
      this.clients.delete(clientId);
      this.logger.info({ clientId }, 'Cliente websocket desconectado');
    });

    socket.on('message', (raw) => {
      this.handleClientMessage(clientId, String(raw));
    });
  }

  publish(channel: string, eventType: string, data: unknown): void {
    const payload: EventPayload = {
      type: eventType,
      channel,
      data,
      timestamp: new Date().toISOString()
    };

    for (const [clientId, client] of this.clients.entries()) {
      if (client.subscribedChannels.has(channel) || client.subscribedChannels.has('global')) {
        this.sendToClient(clientId, payload);
      }
    }
  }

  private handleClientMessage(clientId: string, rawMessage: string): void {
    try {
      const parsed = JSON.parse(rawMessage) as { action?: string; channel?: string };
      const client = this.clients.get(clientId);

      if (!client || !parsed.action || !parsed.channel) {
        return;
      }

      if (parsed.action === 'subscribe') {
        client.subscribedChannels.add(parsed.channel);
        this.sendToClient(clientId, {
          type: 'system.subscribed',
          channel: parsed.channel,
          data: { channel: parsed.channel },
          timestamp: new Date().toISOString()
        });
      }

      if (parsed.action === 'unsubscribe') {
        client.subscribedChannels.delete(parsed.channel);
        this.sendToClient(clientId, {
          type: 'system.unsubscribed',
          channel: parsed.channel,
          data: { channel: parsed.channel },
          timestamp: new Date().toISOString()
        });
      }
    } catch {
      this.sendToClient(clientId, {
        type: 'system.error',
        channel: 'global',
        data: { message: 'Mensagem websocket inválida. Use JSON.' },
        timestamp: new Date().toISOString()
      });
    }
  }

  private sendToClient(clientId: string, payload: EventPayload): void {
    const client = this.clients.get(clientId);
    if (!client || client.socket.readyState !== client.socket.OPEN) {
      return;
    }

    client.socket.send(JSON.stringify(payload));
  }
}
