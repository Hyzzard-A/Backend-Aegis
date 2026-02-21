import { FileDatabase } from '../../database/file-database';
import type { MonitoringEvent } from './types';

export class EventRepository {
  constructor(private readonly database: FileDatabase<MonitoringEvent>) {}

  list(limit = 100): MonitoringEvent[] {
    return this.database.readAll().slice(-limit).reverse();
  }

  create(event: MonitoringEvent): MonitoringEvent {
    const current = this.database.readAll();
    current.push(event);
    this.database.writeAll(current);
    return event;
  }
}
