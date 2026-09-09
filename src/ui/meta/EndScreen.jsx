// The run's end screen -- extracted unchanged from RoundSandbox.jsx
// (READ_SLOWLY_PLAN.md A4, mechanical extraction).
import * as copy from '../copy';

export default function EndScreen({
  run,
  won,
  SB,
  seed,
  onAgain,
  onCopy,
  onShare,
  best,
  describe,
}) {
  const felled = run.felled
    .map((id) => {
      for (const m of run.movements)
        for (const e of m.enemies) if (e.id === id) return e;
      return null;
    })
    .filter(Boolean);
  return (
    <div className={'sb-end ' + (won ? 'sb-win' : 'sb-lose')}>
      <h2 className="sb-end-title">
        {won ? copy.LAST_PAGE_TURNS : copy.lostTheRoom(run.enemy.name)}
      </h2>
      {!won &&
        run.round &&
        SB.situationFor &&
        SB.situationFor(run.round.situation) && (
          <p className="sb-end-failure">
            {SB.situationFor(run.round.situation).failure}
          </p>
        )}
      <p className="sb-end-sub">
        {won
          ? 'All ' +
            run.movements.length +
            ' movements, ' +
            run.felled.length +
            ' enemies felled'
          : run.round.target - run.round.score + ' short of the target'}
        {' · '}
        {copy.resolvedSummary(run.resolved ? run.resolved.length : 0)}
        {' · '}
        {run.wordsPlayed} word{run.wordsPlayed === 1 ? '' : 's'} played ·{' '}
        <b>{run.ink}</b> ink
      </p>
      <div className="sb-end-grid">
        <div>
          <span className="sb-eyebrow">Felled</span>
          <div className="sb-end-felled">
            {felled.map((e) => (
              <span
                key={e.id}
                className={'sb-pip sb-pip-' + e.kind + ' is-done'}
                title={e.name}
              >
                {e.kind === 'boss' ? '♩' : '·'}
              </span>
            ))}
            {run.skipped.length > 0 && (
              <em className="sb-hint">{run.skipped.length} skipped</em>
            )}
            {felled.length === 0 && <em className="sb-hint">none</em>}
          </div>
        </div>
        <div>
          <span className="sb-eyebrow">Best word</span>
          {run.bestPlay ? (
            <div className="sb-end-best">
              <span className="sb-plays-word">{run.bestPlay.word}</span>
              <b className="sb-figure">{run.bestPlay.breakdown.total}</b>
              <span className="sb-plays-how">
                {describe(run.bestPlay.breakdown)} · against{' '}
                {run.bestPlay.enemy}
              </span>
            </div>
          ) : (
            <em className="sb-hint">none played</em>
          )}
        </div>
        <div>
          <span className="sb-eyebrow">Items</span>
          <div className="sb-end-items">
            {run.items.map((id) => (
              <span
                key={id}
                className={
                  'sb-card sb-card-item is-' +
                  (SB.ITEM_DEFS[id].rarity || 'common')
                }
              >
                <b>{SB.ITEM_DEFS[id].name}</b>
              </span>
            ))}
            {run.items.length === 0 && <em className="sb-hint">none</em>}
          </div>
        </div>
      </div>
      <div className="sb-end-actions">
        <button type="button" className="sb-go" onClick={onAgain}>
          Play again
        </button>
        <button type="button" className="sb-share" onClick={onShare}>
          Copy result
        </button>
        <span className="sb-seed-line">
          seed <code>{seed}</code>
          <button type="button" onClick={onCopy}>
            copy
          </button>
        </span>
        {best && best.word && (
          <span className="sb-hint">
            best ever: {best.word.word} for {best.word.total} · deepest:{' '}
            {best.deepest ? best.deepest.name : '—'} · {best.wins || 0} win
            {best.wins === 1 ? '' : 's'} in {best.runs || 0} run
            {best.runs === 1 ? '' : 's'}
          </span>
        )}
      </div>
    </div>
  );
}
