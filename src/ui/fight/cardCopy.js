// Pure display-text helpers shared by HeldRow and Shop -- moved out of
// RoundSandbox.jsx unchanged (READ_SLOWLY_PLAN.md A4, mechanical extraction).
// describeBreakdown moved here from RoundSandbox.jsx (READ_SLOWLY_PLAN.md A3
// remainder) so app/store.ts's data-only fightReducer can call it directly
// instead of taking it as a closure field on the action.
export function itemBlurb(d) {
  return d.hint;
}
export function consumableName(SB, c) {
  if (c.kind === 'etude') return SB.TIER_DEFS[c.id].name + ' étude';
  const ink = SB.MARK_DEFS ? SB.MARK_DEFS[c.id] : null;
  return ink ? ink.name : c.id;
}
export function consumableBlurb(SB, c, run) {
  if (c.kind === 'etude') {
    const t = SB.TIER_DEFS[c.id];
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
  return ink ? ink.hint : '';
}
export function cardName(SB, c) {
  if (c.kind === 'item') return SB.ITEM_DEFS[c.id].name;
  return consumableName(SB, c);
}
export function cardBlurb(SB, c, run) {
  if (c.kind === 'item') return itemBlurb(SB.ITEM_DEFS[c.id]);
  return consumableBlurb(SB, c, run);
}
// "FIVE · lvl 2 · 35 + letters 9 = 44 pts × 6" -- tier, points, then mult.
export function describeBreakdown(b) {
  const pts = [];
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

export function cresBadge(cres) {
  if (!cres || cres.phase === 'idle') return 'waiting for a crescendo';
  if (cres.phase === 'soon') return 'crescendo in ' + Math.ceil(cres.secs);
  return 'NOW · ' + cres.secs.toFixed(1) + 's';
}
