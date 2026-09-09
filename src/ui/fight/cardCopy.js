// Pure display-text helpers shared by HeldRow and Shop -- moved out of
// RoundSandbox.jsx unchanged (READ_SLOWLY_PLAN.md A4, mechanical extraction).
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
export function cresBadge(cres) {
  if (!cres || cres.phase === 'idle') return 'waiting for a crescendo';
  if (cres.phase === 'soon') return 'crescendo in ' + Math.ceil(cres.secs);
  return 'NOW · ' + cres.secs.toFixed(1) + 's';
}
