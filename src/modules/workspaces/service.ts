import type { Workspace } from './types';
import { WorkspaceRepository } from './repository';
import { RealtimeGateway } from '../realtime/gateway';

export class WorkspaceService {
  constructor(
    private readonly repository: WorkspaceRepository,
    private readonly realtimeGateway: RealtimeGateway
  ) {}

  list(): Workspace[] {
    return this.repository.list();
  }

  create(name: string): Workspace {
    const workspace = this.repository.create(name);

    this.realtimeGateway.publish('workspace', 'workspace.created', workspace);

    return workspace;
  }
}
