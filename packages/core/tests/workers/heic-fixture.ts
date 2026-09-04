/**
 * A real, valid HEIC file for exercising the actual @discourse/heic decoder
 * (see docs/governance/DECISIONS.md ADR-014) rather than only synthetic
 * ISOBMFF byte-fixtures.
 *
 * Provenance: entirely self-generated, not a photograph or any third-party
 * asset. A 64x48 PNG containing a deterministic procedural color ramp
 * (`r = x * 255 / 63`, `g = y * 255 / 47`, `b = 128`) was generated with a
 * short Python script using only the standard library (`struct` + `zlib`,
 * no external image tooling), then converted to HEIC with macOS's built-in
 * `sips -s format heic`. No copyrighted or third-party imagery was used at
 * any step.
 *
 * Expected decoded dimensions: 64 x 48 (no rotation — sips did not add a
 * non-identity 'irot' property).
 */
export const HEIC_FIXTURE_WIDTH = 64;
export const HEIC_FIXTURE_HEIGHT = 48;

const HEIC_FIXTURE_BASE64 =
  'AAAAGGZ0eXBoZWljAAAAAGhlaWNtaWYxAAABgW1ldGEAAAAAAAAAImhkbHIAAAAAAAAAAHBpY3QAAAAAAAAAAAAAAAAAAAAAACRk' +
  'aW5mAAAAHGRyZWYAAAAAAAAAAQAAAAx1cmwgAAAAAQAAAA5waXRtAAAAAAABAAAAI2lpbmYAAAAAAAEAAAAVaW5mZQIAAAAAAQAA' +
  'aHZjMQAAAADgaXBycAAAAMBpcGNvAAAAE2NvbHJuY2x4AAIAAgAGgAAAAHhodmNDAQFgAAAAsAAAAAAAHvAA/P34+AAADwOgAAEA' +
  'F0ABDAH//wFgAAADALAAAAMAAAMAHiwJoQABACJCAQEBYAAAAwCwAAADAAADAB6gIIMWcuSRKSXE3AgIGpAIogABABFEAcBhEkwE' +
  '6RERJEkSRJEqQAAAABRpc3BlAAAAAAAAAEAAAAAwAAAACWlyb3QAAAAAEHBpeGkAAAAAAwgICAAAABhpcG1hAAAAAAAAAAEAAQWB' +
  'ggOEBQAAAB5pbG9jAAAAAEQAAAEAAQAAAAEAAAGpAAAApAAAAAFtZGF0AAAAAAAAALQAAACgJgGtwEYvEu5vxUJK+fAlitf+wXyP' +
  'Cdp+WaAw00bBbbdhqKVox1wHfWKZeL0GNrebCu3ZVkpDKGJI5Fxwmpgj2s3tKGOFSANQhoUxmoMtJQCHPV09l+Ya73lrHxiPnQNQ' +
  'FmjzDv0hZD5H465Tiix9tNJW0tTL+nwuB4LXGQDFb7dbuT/4+Wf7JxsjMBM60RwfF3S2mXKZQ7qLFFmQuvm56w==';

export function createRealHeicFixture(): Uint8Array {
  const binary = atob(HEIC_FIXTURE_BASE64);
  const bytes = new Uint8Array(binary.length);

  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }

  return bytes;
}
