import { randomUUID } from 'node:crypto';
import Fastify from 'fastify';
import websocket from '@fastify/websocket';
import { registerCors } from './plugins/cors';
import { healthRoutes } from './modules/health/routes';
import { workspaceRoutes } from './modules/workspaces/routes';
import { WorkspaceRepository } from './modules/workspaces/repository';
import { WorkspaceService } from './modules/workspaces/service';
import { RealtimeGateway } from './modules/realtime/gateway';

export async function buildApp() {
  const app = Fastify({ logger: true });

  await registerCors(app);
  await app.register(websocket);

  const realtimeGateway = new RealtimeGateway(app.log);
  const workspaceRepository = new WorkspaceRepository();
  const workspaceService = new WorkspaceService(workspaceRepository, realtimeGateway);

  await app.register(async (instance) => {
    await healthRoutes(instance);
    await workspaceRoutes(instance, workspaceService);

    instance.get('/ws', { websocket: true }, (socket) => {
      const clientId = randomUUID();
      realtimeGateway.registerConnection(clientId, socket);
    });
  });

  return app;
}
