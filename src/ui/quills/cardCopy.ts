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

// Rarity → Tailwind classes for the Card primitive (A6 slice 2): reuses the
// paper/gilt/marginalia tokens already carrying the shadcn Button variants
// (`bg-paper`/`border-gilt`/`text-marginalia`) rather than the old sandbox.css
// pit/brass/rubric dark palette, since the chrome pass has moved the shop to
// that lighter paper look. Common stays neutral; uncommon takes the gilt
// border the old `.is-uncommon` brass border stood in for; rare takes the
// marginalia border + soft glow for the strongest distinction (the old
// `.is-rare` rubric border had no equivalent token, so marginalia carries the
// "this one's different" signal instead).
export function rarityCardClass(rarity: string | undefined): string {
  switch (rarity) {
    case 'uncommon':
      return 'border-gilt bg-paper text-ink';
    case 'rare':
      return 'border-marginalia bg-paper text-ink shadow-[0_0_0_1px_var(--color-marginalia),0_0_12px_1px_color-mix(in_oklch,var(--color-marginalia),transparent_60%)]';
    default:
      return 'border-ink/15 bg-paper text-ink';
  }
}

export function rarityBadgeClass(rarity: string | undefined): string {
  switch (rarity) {
    case 'uncommon':
      return 'bg-gilt/20 text-ink border-gilt';
    case 'rare':
      return 'bg-marginalia/15 text-marginalia border-marginalia';
    default:
      return 'bg-ink/5 text-ink/70 border-ink/15';
  }
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
