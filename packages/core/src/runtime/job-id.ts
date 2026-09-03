let sequence = 0;

export function createImageJobId(): string {
  sequence = (sequence + 1) % Number.MAX_SAFE_INTEGER;

  const randomPart = globalThis.crypto?.randomUUID?.().replaceAll('-', '') ??
    Math.random().toString(36).slice(2);

  return `fsgjob_${Date.now().toString(36)}_${sequence.toString(36)}_${randomPart}`;
}
