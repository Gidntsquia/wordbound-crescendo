// SandboxNamespace: the loose shape store.ts's FightAction.SB fields used to
// read off window.Wordbound.Sandbox (READ_SLOWLY_PLAN.md A2 removed that
// global; this type stays as the SB payload shape those actions carry).
export type SandboxNamespace = Record<string, unknown>;
