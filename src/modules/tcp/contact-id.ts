export type ContactIdDecoded = {
  account: string;
  qualifier: string;
  eventCode: string;
  partition?: number;
  zone?: number;
};

/**
 * Parser tolerante para payload Contact ID textual.
 * Exemplos aceitos:
 * - 1234 18 1130 01 001
 * - 123418113001001
 */
export function parseContactId(raw: string): ContactIdDecoded | null {
  const normalized = raw.trim().replace(/[^0-9]/g, '');

  if (normalized.length < 12) {
    return null;
  }

  const account = normalized.slice(0, 4);

  // Busca por bloco qualifier(1) + event(3) + partition(2) + zone(3)
  const tail = normalized.slice(4);
  const match = tail.match(/(1|3|6)(\d{3})(\d{2})(\d{3})$/);

  if (!match) {
    return null;
  }

  const [, qualifier, eventCode, partitionRaw, zoneRaw] = match;

  return {
    account,
    qualifier,
    eventCode,
    partition: Number(partitionRaw),
    zone: Number(zoneRaw)
  };
}
