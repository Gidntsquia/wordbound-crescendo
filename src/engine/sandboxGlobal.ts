// The window.Wordbound.Sandbox namespace is still built up incrementally by
// many still-untyped src/sandbox/*.js files (items.js, shop.js, inks.js,
// round.js, ...) alongside the modules ported here (READ_SLOWLY_PLAN.md A2).
// A single strict interface for the whole namespace only becomes possible
// once every one of those files is ported (A3+); until then this stays an
// open record so ported modules can read/write the keys they own without
// TS fighting the ones they don't.
export type SandboxNamespace = Record<string, unknown>;

declare global {
  interface WordboundNamespace {
    Sandbox: SandboxNamespace;
  }
}

window.Wordbound = window.Wordbound || ({} as Window['Wordbound']);
window.Wordbound.Sandbox = window.Wordbound.Sandbox || {};
