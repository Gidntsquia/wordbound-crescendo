// The composing stick: word-in-progress head (worth/scoring math), the tile
// row itself (scoring-locked view vs. live view), and the premium-slot
// preview past the end. Extracted from PlayBoard.jsx (READ_SLOWLY_PLAN.md
// A4) verbatim -- no logic changes, only prop-threading.
import { useCallout } from '../chrome/Callout';
import type { Tile } from '../../engine/tiles';
import type { RoundFacade } from '../../engine/state/facade';
import type { ScoringState as RealScoringState } from '../../sandbox/RoundSandbox';

const PREMIUM_HINT: Record<string, string> = {
  dl: 'Double letter',
  tl: 'Triple letter',
  dw: 'Double word',
};
const PREMIUM_ICON: Record<string, string> = { dl: 'DL', tl: 'TL', dw: 'DW' };

interface StickEntry {
  t: Tile | null;
  i: number;
  ch: string | undefined;
  hollow: boolean;
}

type ScoringState = RealScoringState;

interface WorthHow {
  tierName: string;
  tierLevel: number;
  points: number;
  mult: number;
}

type RoundLike = RoundFacade;

interface DragBind {
  bind: (
    row: string,
    index: number,
    id: string | null,
  ) => { onPointerDown: (e: React.PointerEvent<HTMLElement>) => void };
}

export default function Stick({
  live,
  seen,
  letters,
  scoring,
  spelt,
  worthHow,
  worth,
  round,
  formable,
  stickShown,
  drag,
  unstageAt,
  letterValues,
}: {
  live: boolean;
  seen: ReadonlySet<string>;
  letters: string;
  scoring: ScoringState | null;
  spelt: boolean;
  worthHow: WorthHow | null;
  worth: number;
  round: RoundLike;
  formable: boolean;
  stickShown: StickEntry[];
  drag: DragBind | null;
  unstageAt: (i: number) => void;
  letterValues: Record<string, number>;
}) {
  useCallout(
    live && !seen.has('stick') && letters.length >= 2,
    'Tap Play, or tap a tile to send it back',
  );
  return (
    <div className="sb-stick-wrap">
      <div className="sb-stick-head">
        <span className="sb-eyebrow">
          {scoring ? 'Scoring' : letters.length ? 'Your word' : ' '}
        </span>
        {scoring && (
          <span className="sb-stick-worth is-hand is-scoring">
            <span className="sb-stick-math">
              <em className="sb-tier-name">
                {scoring.tier
                  ? scoring.tier.name +
                    ((scoring.tier.level ?? 0) > 1
                      ? ' ' + scoring.tier.level
                      : '')
                  : ' '}
              </em>
              <b className="sb-figure sb-pts">{scoring.pts}</b>
              <i>×</i>
              <b className="sb-figure sb-mult">{scoring.mult}</b>
              <i>=</i>
            </span>
            <b
              className={
                'sb-figure sb-total' + (scoring.total != null ? ' is-hit' : '')
              }
            >
              {scoring.total != null ? scoring.total : '…'}
            </b>
            {scoring.total != null && scoring.crossed && (
              <span className="sb-crossed">meets the target</span>
            )}
          </span>
        )}
        {!scoring && spelt && worthHow && (
          <span className="sb-stick-worth is-hand">
            <span className="sb-stick-math">
              <em className="sb-tier-name">
                {worthHow.tierName}
                {worthHow.tierLevel > 1 ? ' ' + worthHow.tierLevel : ''}
              </em>
              <b className="sb-figure sb-pts">{worthHow.points}</b>
              <i>×</i>
              <b className="sb-figure sb-mult">{worthHow.mult}</b>
              <i>=</i>
            </span>
            <b className="sb-figure">{worth}</b>
            {round.score + worth >= round.target
              ? 'meets the target'
              : letters.length === 1
                ? 'single letter'
                : 'points'}
          </span>
        )}
      </div>
      <div
        className={
          'sb-stick' +
          (formable ? '' : ' is-short') +
          (scoring && !scoring.cleared ? ' is-locked' : '')
        }
      >
        {scoring &&
          !scoring.cleared &&
          scoring.tiles.map((t, i) => (
            <span
              key={t.id}
              className={
                'sb-tile-pop' +
                (scoring.litTile === t.id || scoring.litSlot === t.id
                  ? ' is-pop'
                  : '')
              }
            >
              {scoring.floats
                .filter((x) => x.on === t.id)
                .map((x) => (
                  <i key={x.key} className={'sb-float is-' + x.tone}>
                    {x.text}
                  </i>
                ))}
              <button
                type="button"
                disabled
                data-flip-tile-id={t.id}
                className={
                  'sb-tile is-set' +
                  (t.mark ? ' is-mark-' + t.mark : '') +
                  (scoring.litTile === t.id ? ' is-lit' : '') +
                  (round.premium && round.premium.pos === i
                    ? ' is-premium-' + round.premium.kind
                    : '') +
                  (scoring.litSlot === t.id ? ' is-lit' : '')
                }
              >
                {t.letter === '?' ? '␣' : t.letter}
                <sub>{letterValues[t.letter] || 0}</sub>
              </button>
            </span>
          ))}
        {scoring &&
          scoring.floats
            .filter((x) => x.on === 'stick')
            .map((x) => (
              <i key={x.key} className={'sb-float is-' + x.tone}>
                {x.text}
              </i>
            ))}
        {!(scoring && !scoring.cleared) &&
          stickShown.map(({ t, i, ch, hollow }) => {
            const premiumHere = round.premium && round.premium.pos === i;
            return t ? (
              <button
                key={t.id}
                type="button"
                disabled={!live}
                className={
                  'sb-tile is-set' +
                  (hollow ? ' is-dragging' : '') +
                  (t.mark ? ' is-mark-' + t.mark : '') +
                  (round.isBarred(t) ? ' is-barred' : '') +
                  (premiumHere ? ' is-premium-' + round.premium!.kind : '')
                }
                data-flip-tile-id={t.id}
                title={
                  (premiumHere
                    ? PREMIUM_HINT[round.premium!.kind] + ' · '
                    : '') + 'Tap to send home · drag to reorder'
                }
                {...(drag ? drag.bind('stick', i, t.id) : {})}
                onClick={() => unstageAt(i)}
              >
                {t.letter === '?' ? (ch === '?' ? '␣' : ch) : t.letter}
                <sub>{letterValues[t.letter] || 0}</sub>
              </button>
            ) : (
              <button
                key={'gap' + i}
                type="button"
                disabled={!live}
                className={
                  'sb-tile is-missing' + (hollow ? ' is-dragging' : '')
                }
                title="None of your tiles spells this"
                {...(drag ? drag.bind('stick', i, null) : {})}
                onClick={() => unstageAt(i)}
              >
                {ch}
              </button>
            );
          })}
        {!(scoring && !scoring.cleared) &&
          (() => {
            const minEnd = Math.max(5, round.premium ? round.premium.pos : 0);
            return (
              minEnd >= stickShown.length &&
              Array.from(
                { length: minEnd - stickShown.length + 1 },
                (_, k) => stickShown.length + k,
              ).map((i) =>
                round.premium && i === round.premium.pos ? (
                  <span
                    key="premium-preview"
                    className={
                      'sb-tile sb-premium-slot is-premium-' + round.premium.kind
                    }
                    title={
                      PREMIUM_HINT[round.premium.kind] +
                      ' — lands on stick position ' +
                      (round.premium.pos + 1)
                    }
                  >
                    {PREMIUM_ICON[round.premium.kind]}
                  </span>
                ) : (
                  <span
                    key={'premium-gap' + i}
                    className="sb-tile sb-premium-slot is-slot-empty"
                    title={'Stick position ' + (i + 1)}
                  />
                ),
              )
            );
          })()}
      </div>
    </div>
  );
}
