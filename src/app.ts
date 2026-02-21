import { randomUUID } from 'node:crypto';
import Fastify from 'fastify';
import websocket from '@fastify/websocket';
import { registerCors } from './plugins/cors';
import { healthRoutes } from './modules/health/routes';
import { workspaceRoutes } from './modules/workspaces/routes';
import { WorkspaceRepository } from './modules/workspaces/repository';
import { WorkspaceService } from './modules/workspaces/service';
import { RealtimeGateway } from './modules/realtime/gateway';
import { env } from './config/env';
import { FileDatabase } from './database/file-database';
import { EventRepository } from './modules/events/repository';
import type { MonitoringEvent } from './modules/events/types';
import { EventProcessor } from './core/event-processor';
import { eventRoutes } from './modules/events/routes';
import { ContactIdTcpServer } from './modules/tcp/server';

type BuildAppOptions = {
  disableTcpServer?: boolean;
};

export async function buildApp(options: BuildAppOptions = {}) {
  const app = Fastify({ logger: true });

  await registerCors(app);
  await app.register(websocket);

  const realtimeGateway = new RealtimeGateway(app.log);
  const workspaceRepository = new WorkspaceRepository();
  const workspaceService = new WorkspaceService(workspaceRepository, realtimeGateway);

  const eventDatabase = new FileDatabase<MonitoringEvent>(env.DB_FILE_PATH);
  const eventRepository = new EventRepository(eventDatabase);
  const eventProcessor = new EventProcessor(eventRepository, realtimeGateway, app.log);

  let tcpServer: ContactIdTcpServer | null = null;

  if (!options.disableTcpServer) {
    tcpServer = new ContactIdTcpServer(env.TCP_PORT, env.TCP_HOST, eventProcessor, app.log);
    tcpServer.start();
  }

  app.addHook('onClose', async () => {
    if (tcpServer) {
      await tcpServer.stop();
    }
  });

  await app.register(async (instance) => {
    await healthRoutes(instance);
    await workspaceRoutes(instance, workspaceService);
    await eventRoutes(instance, eventRepository, eventProcessor);

    instance.get('/ws', { websocket: true }, (socket) => {
      const clientId = randomUUID();
      realtimeGateway.registerConnection(clientId, socket);
    });
  });

  return app;
}
