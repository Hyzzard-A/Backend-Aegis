import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';

export class FileDatabase<T> {
  constructor(private readonly filePath: string) {
    const dir = dirname(filePath);
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true });
    }

    if (!existsSync(filePath)) {
      writeFileSync(filePath, '[]', 'utf8');
    }
  }

  readAll(): T[] {
    const raw = readFileSync(this.filePath, 'utf8');
    try {
      return JSON.parse(raw) as T[];
    } catch {
      return [];
    }
  }

  writeAll(data: T[]): void {
    writeFileSync(this.filePath, JSON.stringify(data, null, 2), 'utf8');
  }
}
