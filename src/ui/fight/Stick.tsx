// The composing stick: word-in-progress head (worth/scoring math), the tile
// row itself (scoring-locked view vs. live view), and the premium-slot
// preview past the end. Extracted from PlayBoard.jsx (READ_SLOWLY_PLAN.md
// A4) verbatim -- no logic changes, only prop-threading.
import { useCallout } from '../chrome/Callout';
import type { Tile } from '../../engine/tiles';
import type { RoundFacade } from '../../engine/state/facade';
import type { ScoringState as RealScoringState } from './FightScreen';
import { Button } from '@/ui/primitives/button';

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

// Tailwind port of the .sb-tile rules (sandbox.css A6 slice 5) shared with
// Rack.tsx -- see the long comment there for why the class names themselves
// (sb-tile, is-set, is-missing, is-dragging, is-slot-empty) stay put as
// plain markers and why nothing here may set `transform`/`translate`/
// `scale`/`rotate`: the tap-to-play FLIP owns this element's transform.
const TILE_STRUCT =
  'relative min-w-[46px] h-[52px] p-0 rounded-[2px] font-[var(--display)] text-[22px] font-semibold tracking-normal normal-case touch-none select-none max-[620px]:min-w-[40px] max-[620px]:h-[46px] max-[620px]:text-[19px]';
const TILE_SET =
  TILE_STRUCT +
  ' text-[var(--ink)] bg-[var(--brass-hot)] border border-[var(--brass-hot)] shadow-[0_3px_0_rgba(0,0,0,0.5)]' +
  ' not-disabled:hover:bg-[var(--leaf)] not-disabled:hover:border-[var(--leaf)] not-disabled:hover:shadow-[0_3px_0_rgba(0,0,0,0.5),0_0_0_1px_var(--leaf)]';
const TILE_MISSING =
  TILE_STRUCT +
  ' text-[var(--rubric)] bg-transparent border border-dashed border-[var(--rubric-dim)] shadow-none' +
  ' not-disabled:hover:text-[var(--rubric)] not-disabled:hover:bg-[rgba(212,97,74,0.14)] not-disabled:hover:border-[var(--rubric)] not-disabled:hover:shadow-none';
// The premium-slot preview badges (past the end of the stick): base look
// (sandbox.css A6 slice 6 port of .sb-premium-slot) plus a per-kind rim
// (is-premium-dl/tl/dw) or the empty-slot dashed rule (is-slot-empty). The
// attr(data-premium-label) ::before badge those rules used to draw was dead
// (no caller ever set that attribute -- the icon is passed as children
// instead), so it isn't reproduced here.
const TILE_PREMIUM_BASE =
  TILE_STRUCT +
  ' inline-flex items-center justify-center border border-dashed border-[var(--rule)] bg-transparent font-[var(--figure)] text-[11px] opacity-55';
const SUB_ON_SET =
  'absolute right-1 bottom-[3px] font-[var(--figure)] text-[9px] text-[rgba(26,23,16,0.6)]';

// Ported from sandbox.css's INKED TILES / barred / premium-rim rules (A6
// slice 6) -- inline style, not stacked Tailwind shadow classes, so the
// override reliably beats TILE_SET's own box-shadow utility. Priority
// mirrors the old file order (barred was declared last, so it wins).
const MARK_GLOW: Record<string, string> = {
  gilt: '0 2px 0 rgba(0,0,0,0.45), 0 0 0 2px #e0b544, 0 0 8px rgba(224,181,68,0.7)',
  bold: '0 2px 0 rgba(0,0,0,0.45), 0 0 0 2px var(--rubric), 0 0 8px rgba(212,97,74,0.7)',
  steel:
    '0 2px 0 rgba(0,0,0,0.45), 0 0 0 2px #b8a5d8, 0 0 8px rgba(184,165,216,0.7)',
  blank: '0 2px 0 rgba(0,0,0,0.45), 0 0 0 2px #6fb3e0',
};
const MARK_DOT: Record<string, string> = {
  gilt: '#e0b544',
  bold: 'var(--rubric)',
  steel: '#b8a5d8',
  blank: '#6fb3e0',
};
const PREMIUM_RIM_COLOR: Record<string, string> = {
  dl: '#6fd0c8',
  tl: '#e08a4a',
  dw: '#d468c9',
};
function premiumStyle(kind: string): React.CSSProperties {
  const c = PREMIUM_RIM_COLOR[kind]!;
  return {
    borderStyle: 'dashed',
    boxShadow: `0 2px 0 rgba(0,0,0,0.45), 0 0 0 2px ${c}`,
  };
}
function setTileOverrideStyle(
  mark: string | null | undefined,
  barred: boolean,
  premiumKind: string | undefined,
): React.CSSProperties | undefined {
  if (barred)
    return {
      background: 'var(--rule)',
      borderColor: 'var(--rule)',
      color: 'var(--leaf-dim)',
      boxShadow: 'none',
    };
  if (premiumKind) return premiumStyle(premiumKind);
  if (mark) return { boxShadow: MARK_GLOW[mark] };
  return undefined;
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
        <span className="sb-eyebrow text-[10px] font-semibold tracking-[0.22em] whitespace-nowrap text-[var(--leaf-dim)] uppercase">
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
              <b className="sb-pts font-[var(--figure)] tabular-nums">
                {scoring.pts}
              </b>
              <i>×</i>
              <b className="sb-mult font-[var(--figure)] tabular-nums">
                {scoring.mult}
              </b>
              <i>=</i>
            </span>
            <b
              className={
                'sb-total font-[var(--figure)] tabular-nums' +
                (scoring.total != null ? ' is-hit' : '')
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
              <b className="sb-pts font-[var(--figure)] tabular-nums">
                {worthHow.points}
              </b>
              <i>×</i>
              <b className="sb-mult font-[var(--figure)] tabular-nums">
                {worthHow.mult}
              </b>
              <i>=</i>
            </span>
            <b className="font-[var(--figure)] tabular-nums">{worth}</b>
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
              <Button
                type="button"
                variant="paper"
                disabled
                data-flip-tile-id={t.id}
                style={setTileOverrideStyle(
                  t.mark,
                  false,
                  round.premium && round.premium.pos === i
                    ? round.premium.kind
                    : undefined,
                )}
                className={
                  'sb-tile is-set ' +
                  TILE_SET +
                  (scoring.litTile === t.id ? ' is-lit' : '') +
                  (scoring.litSlot === t.id ? ' is-lit' : '')
                }
              >
                {t.mark && (
                  <i
                    aria-hidden="true"
                    className="absolute top-[3px] left-1 h-1.5 w-1.5 rounded-full"
                    style={{ background: MARK_DOT[t.mark] }}
                  />
                )}
                {t.letter === '?' ? '␣' : t.letter}
                <sub className={SUB_ON_SET}>{letterValues[t.letter] || 0}</sub>
              </Button>
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
              <Button
                key={t.id}
                type="button"
                variant="paper"
                disabled={!live}
                style={setTileOverrideStyle(
                  t.mark,
                  round.isBarred(t),
                  premiumHere ? round.premium!.kind : undefined,
                )}
                className={
                  'sb-tile is-set ' +
                  TILE_SET +
                  (hollow ? ' is-dragging opacity-25' : '')
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
                {t.mark && !round.isBarred(t) && (
                  <i
                    aria-hidden="true"
                    className="absolute top-[3px] left-1 h-1.5 w-1.5 rounded-full"
                    style={{ background: MARK_DOT[t.mark] }}
                  />
                )}
                {round.isBarred(t) && (
                  <i
                    aria-hidden="true"
                    className="absolute top-1/2 right-1.5 left-1.5 h-px"
                    style={{ background: 'var(--rubric)' }}
                  />
                )}
                {t.letter === '?' ? (ch === '?' ? '␣' : ch) : t.letter}
                <sub
                  className={SUB_ON_SET}
                  style={
                    round.isBarred(t) ? { color: 'var(--leaf-dim)' } : undefined
                  }
                >
                  {letterValues[t.letter] || 0}
                </sub>
              </Button>
            ) : (
              <Button
                key={'gap' + i}
                type="button"
                variant="paper"
                disabled={!live}
                className={
                  'sb-tile is-missing ' +
                  TILE_MISSING +
                  (hollow ? ' is-dragging opacity-25' : '')
                }
                title="None of your tiles spells this"
                {...(drag ? drag.bind('stick', i, null) : {})}
                onClick={() => unstageAt(i)}
              >
                {ch}
              </Button>
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
                    className={'sb-tile sb-premium-slot ' + TILE_PREMIUM_BASE}
                    style={{
                      ...premiumStyle(round.premium.kind),
                      color: PREMIUM_RIM_COLOR[round.premium.kind],
                    }}
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
                    className={'sb-tile sb-premium-slot ' + TILE_PREMIUM_BASE}
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
