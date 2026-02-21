import { z } from 'zod';
import type { FastifyInstance } from 'fastify';
import { WorkspaceService } from './service';

const createWorkspaceSchema = z.object({
  name: z.string().min(3, 'name precisa ter pelo menos 3 caracteres')
});

export async function workspaceRoutes(app: FastifyInstance, service: WorkspaceService): Promise<void> {
  app.get('/workspaces', async () => {
    return {
      data: service.list()
    };
  });

  app.post('/workspaces', async (request, reply) => {
    const parsed = createWorkspaceSchema.safeParse(request.body);

    if (!parsed.success) {
      return reply.status(400).send({
        error: 'payload inválido',
        details: parsed.error.flatten()
      });
    }

    const workspace = service.create(parsed.data.name);

    return reply.status(201).send({
      data: workspace
    });
  });
}
