// Ambient types for the Workers-only entry (bundled by wrangler, type-checked with `npm run cf:typecheck`).
declare module "*.wasm" {
  const module: WebAssembly.Module;
  export default module;
}
