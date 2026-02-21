import { createServer, type Socket } from 'node:net';
import type { FastifyBaseLogger } from 'fastify';
import { EventProcessor } from '../../core/event-processor';

export class ContactIdTcpServer {
  private readonly server = createServer();

  constructor(
    private readonly port: number,
    private readonly host: string,
    private readonly processor: EventProcessor,
    private readonly logger: FastifyBaseLogger
  ) {}

  start(): void {
    this.server.on('connection', (socket: Socket) => {
      this.logger.info({ remote: `${socket.remoteAddress}:${socket.remotePort}` }, 'TCP client conectado');

      socket.on('data', (buffer) => {
        const raw = buffer.toString('utf8');

        const maybeEvent = this.processor.processContactId(raw);
        if (maybeEvent) {
          socket.write('ACK\r\n');
          return;
        }

        // fallback: tenta interpretar como frame binário 7x
        const jflEvent = this.processor.processJfl7x(buffer);
        if (jflEvent) {
          socket.write(Buffer.from([0x06]));
          return;
        }

        socket.write('NACK\r\n');
      });

      socket.on('error', (error) => {
        this.logger.error({ error }, 'Erro no socket TCP');
      });
    });

    this.server.listen(this.port, this.host, () => {
      this.logger.info({ host: this.host, port: this.port }, 'TCP Server Contact ID iniciado');
    });
  }

  stop(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.server.close((error) => {
        if (error) {
          reject(error);
          return;
        }
        resolve();
      });
    });
  }
}
