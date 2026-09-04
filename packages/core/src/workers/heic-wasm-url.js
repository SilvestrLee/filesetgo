// Plain-JS shim: re-exports the HEIC decoder's .wasm binary as a URL string
// via Vite's `?url` asset convention. Kept as untyped JS (paired with
// heic-wasm-url.d.ts for TypeScript's benefit) because TypeScript 7.0.2's
// module resolution does not resolve query-suffixed specifiers like
// '@discourse/heic/codec/dec/heic_dec.wasm?url' even with a matching
// ambient `declare module` — Vite itself resolves this import fine at
// bundle time, since only tsc's static resolution had the problem.
export { default } from '@discourse/heic/codec/dec/heic_dec.wasm?url';
