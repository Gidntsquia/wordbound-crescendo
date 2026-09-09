// Shared type for the shop/fight `act` callback every action funnels
// through -- kept in one place so every child component's prop type
// matches the real implementation in RoundSandbox.tsx exactly.
export type ActFn = (
  message: string | null,
  res: { ok?: boolean; reason?: string } | boolean | null | undefined,
  sound?: string,
) => boolean;
