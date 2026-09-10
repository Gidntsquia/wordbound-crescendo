// Pure display-text helpers shared by HeldRow and Shop -- moved out of
// RoundSandbox.jsx unchanged (READ_SLOWLY_PLAN.md A4, mechanical extraction).
// describeBreakdown moved here from RoundSandbox.jsx (READ_SLOWLY_PLAN.md A3
// remainder) so app/store.ts's data-only fightReducer can call it directly
// instead of taking it as a closure field on the action.
import type { Breakdown } from '../../engine/content/round';

export interface CardLike {
  kind: 'item' | 'mark' | 'etude';
  id: string;
}

export interface ConsumableLike {
  kind: string;
  id: string;
}

export interface CardCopyTables {
  ITEM_DEFS?: Record<string, { name?: string; hint?: string }>;
  TIER_DEFS?: Record<
    string,
    { name?: string; lvlPts?: number; lvlMult?: number }
  >;
  MARK_DEFS?: Record<string, { name?: string; hint?: string }>;
}

export interface CardCopyRun {
  tierLevels: Record<string, number>;
}

export function itemBlurb(d: { hint?: string }): string {
  return d.hint ?? '';
}

export function consumableName(SB: CardCopyTables, c: ConsumableLike): string {
  if (c.kind === 'etude')
    return (SB.TIER_DEFS?.[c.id]?.name ?? c.id) + ' étude';
  const ink = SB.MARK_DEFS ? SB.MARK_DEFS[c.id] : null;
  return ink?.name ?? c.id;
}

export function consumableBlurb(
  SB: CardCopyTables,
  c: ConsumableLike,
  run: CardCopyRun,
): string {
  if (c.kind === 'etude') {
    const t = SB.TIER_DEFS?.[c.id];
    if (!t) return '';
    const lvl = run.tierLevels[c.id] || 1;
    return (
      'Level ' +
      t.name +
      ' to ' +
      (lvl + 1) +
      ': +' +
      t.lvlPts +
      ' pts, +' +
      t.lvlMult +
      ' mult'
    );
  }
  const ink = SB.MARK_DEFS ? SB.MARK_DEFS[c.id] : null;
  return ink?.hint ?? '';
}

export function cardName(SB: CardCopyTables, c: CardLike): string {
  if (c.kind === 'item') return SB.ITEM_DEFS?.[c.id]?.name ?? c.id;
  return consumableName(SB, c);
}

export function cardBlurb(
  SB: CardCopyTables,
  c: CardLike,
  run: CardCopyRun,
): string {
  if (c.kind === 'item') return itemBlurb(SB.ITEM_DEFS?.[c.id] ?? {});
  return consumableBlurb(SB, c, run);
}

// "FIVE · lvl 2 · 35 + letters 9 = 44 pts × 6" -- tier, points, then mult.
export function describeBreakdown(b: Breakdown): string {
  const pts: (string | number)[] = [];
  if (b.tierPts) pts.push(b.tierPts);
  pts.push('letters ' + b.base);
  if (b.bonusFlat) pts.push('tile bonus +' + b.bonusFlat);
  if (b.variantFlat) pts.push('charged +' + b.variantFlat);
  if (b.inkPoints) pts.push('gilt +' + b.inkPoints);
  let out =
    b.tierName + (b.tierLevel > 1 ? ' · lvl ' + b.tierLevel : '') + ' · ';
  const basePts =
    b.tierPts + b.base + b.bonusFlat + b.variantFlat + b.inkPoints;
  out +=
    (pts.length > 1 ? pts.join(' + ') + ' = ' : '') +
    basePts +
    ' pts × ' +
    (b.tierMult + b.inkMult);
  if (b.inkMult) out += ' (tier ' + b.tierMult + ' + bold ' + b.inkMult + ')';
  const fired = (b.itemNotes || []).map((n) => n.name + ' ' + n.note);
  if (b.bonusMult !== 1) fired.push('tile × ' + b.bonusMult);
  if (b.holdMult && b.holdMult !== 1) fired.push('steel held × ' + b.holdMult);
  if (fired.length)
    out += ' → ' + fired.join(' → ') + ' → ' + b.points + ' × ' + b.mult;
  return out;
}

export interface CrescendoState {
  phase: 'idle' | 'soon' | 'live';
  secs?: number;
}

export function cresBadge(cres: CrescendoState | null | undefined): string {
  if (!cres || cres.phase === 'idle') return 'waiting for a crescendo';
  const secs = cres.secs ?? 0;
  if (cres.phase === 'soon') return 'crescendo in ' + Math.ceil(secs);
  return 'NOW · ' + secs.toFixed(1) + 's';
}
