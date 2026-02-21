import { randomUUID } from 'node:crypto';
import type { FastifyBaseLogger } from 'fastify';
import { RealtimeGateway } from '../modules/realtime/gateway';
import { EventRepository } from '../modules/events/repository';
import type { MonitoringEvent } from '../modules/events/types';
import { parseContactId } from '../modules/tcp/contact-id';
import { parseJfl7xFrame } from '../modules/protocol/jfl-7x';

export class EventProcessor {
  constructor(
    private readonly repository: EventRepository,
    private readonly realtime: RealtimeGateway,
    private readonly logger: FastifyBaseLogger
  ) {}

  processContactId(raw: string): MonitoringEvent | null {
    const decoded = parseContactId(raw);

    if (!decoded) {
      this.logger.warn({ raw }, 'Payload Contact ID inválido');
      return null;
    }

    const event: MonitoringEvent = {
      id: randomUUID(),
      sourceProtocol: 'contact-id',
      account: decoded.account,
      qualifier: decoded.qualifier,
      eventCode: decoded.eventCode,
      partition: decoded.partition,
      zone: decoded.zone,
      raw,
      metadata: {
        ackPolicy: 'software deve confirmar processamento (ACK/NACK)'
      },
      receivedAt: new Date().toISOString()
    };

    this.repository.create(event);
    this.realtime.publish(`account:${event.account}`, 'event.received', event);
    this.realtime.publish('monitoring', 'event.received', event);

    return event;
  }

  processJfl7x(raw: Buffer): MonitoringEvent | null {
    const frame = parseJfl7xFrame(raw);

    if (!frame) {
      this.logger.warn({ raw: raw.toString('hex') }, 'Frame JFL 7x inválido');
      return null;
    }

    const account = frame.payload.subarray(0, 4).toString('hex').padEnd(4, '0').slice(0, 4);
    const eventCode = `0x${frame.command.toString(16).toUpperCase().padStart(2, '0')}`;

    const event: MonitoringEvent = {
      id: randomUUID(),
      sourceProtocol: 'jfl-7x',
      account,
      eventCode,
      raw: raw.toString('hex'),
      metadata: {
        quantityByte: frame.quantityByte,
        sequence: frame.sequence,
        payloadHex: frame.payload.toString('hex')
      },
      receivedAt: new Date().toISOString()
    };

    this.repository.create(event);
    this.realtime.publish(`account:${event.account}`, 'event.received', event);
    this.realtime.publish('monitoring', 'event.received', event);

    return event;
  }
}
