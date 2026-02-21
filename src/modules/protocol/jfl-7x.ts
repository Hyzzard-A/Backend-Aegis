export type JflFrame = {
  startByte: number;
  quantityByte: number;
  sequence: number;
  command: number;
  payload: Buffer;
};

/**
 * Estrutura esperada: [7x][QDE][SEQ][CMD][...PAYLOAD]
 */
export function parseJfl7xFrame(buffer: Buffer): JflFrame | null {
  if (buffer.length < 4) {
    return null;
  }

  const startByte = buffer[0];
  const is7x = (startByte & 0xf0) === 0x70;

  if (!is7x) {
    return null;
  }

  return {
    startByte,
    quantityByte: buffer[1],
    sequence: buffer[2],
    command: buffer[3],
    payload: buffer.subarray(4)
  };
}
