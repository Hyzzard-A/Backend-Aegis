import { z } from 'zod';
import type { FastifyInstance } from 'fastify';
import { EventRepository } from './repository';
import { EventProcessor } from '../../core/event-processor';

const contactIdSchema = z.object({
  raw: z.string().min(8)
});

const jflSchema = z.object({
  hex: z.string().regex(/^[0-9a-fA-F]+$/)
});

export async function eventRoutes(
  app: FastifyInstance,
  repository: EventRepository,
  processor: EventProcessor
): Promise<void> {
  app.get('/events', async (request) => {
    const query = z
      .object({ limit: z.coerce.number().int().positive().max(1000).default(100) })
      .parse(request.query);

    return { data: repository.list(query.limit) };
  });

  app.post('/ingest/contact-id', async (request, reply) => {
    const parsed = contactIdSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: 'payload inválido', details: parsed.error.flatten() });
    }

    const event = processor.processContactId(parsed.data.raw);
    if (!event) {
      return reply.status(422).send({ error: 'não foi possível decodificar o payload Contact ID' });
    }

    return reply.status(201).send({ data: event });
  });

  app.post('/ingest/jfl-7x', async (request, reply) => {
    const parsed = jflSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: 'payload inválido', details: parsed.error.flatten() });
    }

    const event = processor.processJfl7x(Buffer.from(parsed.data.hex, 'hex'));
    if (!event) {
      return reply.status(422).send({ error: 'não foi possível decodificar o frame JFL 7x' });
    }

    return reply.status(201).send({ data: event });
  });
}
