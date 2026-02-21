import { randomUUID } from 'node:crypto';
import type { Workspace } from './types';

export class WorkspaceRepository {
  private readonly workspaces = new Map<string, Workspace>();

  list(): Workspace[] {
    return Array.from(this.workspaces.values());
  }

  create(name: string): Workspace {
    const workspace: Workspace = {
      id: randomUUID(),
      name,
      createdAt: new Date().toISOString()
    };

    this.workspaces.set(workspace.id, workspace);

    return workspace;
  }
}
