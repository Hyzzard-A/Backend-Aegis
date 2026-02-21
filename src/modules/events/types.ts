export type SourceProtocol = 'contact-id' | 'jfl-7x';

export type MonitoringEvent = {
  id: string;
  sourceProtocol: SourceProtocol;
  account: string;
  partition?: number;
  zone?: number;
  eventCode: string;
  qualifier?: string;
  raw: string;
  metadata: Record<string, unknown>;
  receivedAt: string;
};
