/**
 * Minimal ambient declarations for the handful of Node built-ins
 * heic-decode.test.ts uses to read the actual installed @discourse/heic
 * WASM binary from disk (see ADR-014 / SPRINT_REPORT.md "Real decoder
 * verification"). Declared locally instead of adding `@types/node` as a
 * project dependency for one test file's sake.
 */
declare module 'node:fs/promises' {
  export function readFile(path: string): Promise<Uint8Array>;
}

declare module 'node:path' {
  export function resolve(...segments: string[]): string;
}

declare const process: { cwd(): string };
