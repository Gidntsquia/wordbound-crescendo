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

// The scoring-cascade floating +N/x2 badges (sandbox.css A6 slice 7 port of
// .sb-float / .is-mult); `float-up` stays a keyframe in sandbox.css.
const FLOAT_BASE =
  'pointer-events-none absolute top-[-8px] left-1/2 z-6 font-[var(--figure)] text-[13px] font-bold whitespace-nowrap text-[var(--brass-hot)] not-italic [text-shadow:0_1px_6px_rgba(0,0,0,0.8)] motion-safe:animate-[float-up_720ms_ease-out_forwards] ';
const FLOAT_MULT = 'text-[var(--rubric)]';

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
// The lit glow (sandbox.css A6 slice 7 port of .sb-tile.is-lit) plays while
// the scoring cascade highlights this tile -- inline style for the same
// reason as the mark/premium overrides above (must beat TILE_SET's own
// box-shadow utility deterministically). A marked/premium tile's own inline
// style already wins over any CSS class, so a lit tile that also has a mark
// never actually swaps to the lit glow either -- that priority carries over
// unchanged here.
const LIT_GLOW =
  '0 0 0 2px var(--brass-hot), 0 0 18px rgba(242, 194, 96, 0.55)';
function setTileOverrideStyle(
  mark: string | null | undefined,
  barred: boolean,
  premiumKind: string | undefined,
  lit?: boolean,
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
  if (lit) return { boxShadow: LIT_GLOW };
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
    <div className="sb-stick-wrap mb-3.5 max-[620px]:mb-2">
      <div className="sb-stick-head flex items-baseline justify-between gap-2.5 pb-1.5">
        <span className="sb-eyebrow text-[10px] font-semibold tracking-[0.22em] whitespace-nowrap text-[var(--leaf-dim)] uppercase">
          {scoring ? 'Scoring' : letters.length ? 'Your word' : ' '}
        </span>
        {scoring && (
          <span className="sb-stick-worth flex items-baseline gap-[7px] text-[10px] font-semibold tracking-[0.16em] text-[var(--rubric)] uppercase">
            <span className="sb-stick-math inline-flex items-baseline gap-[5px]">
              <em className="sb-tier-name mr-[3px] text-[11px] tracking-[0.12em] text-[var(--leaf)] not-italic">
                {scoring.tier
                  ? scoring.tier.name +
                    ((scoring.tier.level ?? 0) > 1
                      ? ' ' + scoring.tier.level
                      : '')
                  : ' '}
              </em>
              <b className="sb-pts font-[var(--figure)] text-[#6fb3e0] tabular-nums">
                {scoring.pts}
              </b>
              <i className="text-[11px] text-[var(--leaf-dim)] not-italic">×</i>
              <b className="sb-mult font-[var(--figure)] text-[var(--brass-hot)] tabular-nums">
                {scoring.mult}
              </b>
              <i className="text-[11px] text-[var(--leaf-dim)] not-italic">=</i>
            </span>
            <b
              className={
                'sb-total inline-block min-w-[1.2em] text-[15px] font-[var(--figure)] font-semibold text-[var(--rubric)] tabular-nums' +
                (scoring.total != null
                  ? ' motion-safe:animate-[total-hit_460ms_cubic-bezier(0.2,0.9,0.3,1)]'
                  : '')
              }
            >
              {scoring.total != null ? scoring.total : '…'}
            </b>
            {scoring.total != null && scoring.crossed && (
              <span className="font-semibold text-[var(--brass-hot)]">
                meets the target
              </span>
            )}
          </span>
        )}
        {!scoring && spelt && worthHow && (
          <span className="sb-stick-worth flex items-baseline gap-[7px] text-[10px] font-semibold tracking-[0.16em] text-[var(--rubric)] uppercase">
            <span className="sb-stick-math inline-flex items-baseline gap-[5px]">
              <em className="sb-tier-name mr-[3px] text-[11px] tracking-[0.12em] text-[var(--leaf)] not-italic">
                {worthHow.tierName}
                {worthHow.tierLevel > 1 ? ' ' + worthHow.tierLevel : ''}
              </em>
              <b className="sb-pts font-[var(--figure)] text-[#6fb3e0] tabular-nums">
                {worthHow.points}
              </b>
              <i className="text-[11px] text-[var(--leaf-dim)] not-italic">×</i>
              <b className="sb-mult font-[var(--figure)] text-[var(--brass-hot)] tabular-nums">
                {worthHow.mult}
              </b>
              <i className="text-[11px] text-[var(--leaf-dim)] not-italic">=</i>
            </span>
            <b className="text-[15px] font-[var(--figure)] font-semibold text-[var(--rubric)] tabular-nums">
              {worth}
            </b>
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
          'sb-stick flex min-h-[68px] flex-wrap items-center gap-[7px] border border-b-[3px] bg-[var(--pit-deep)] px-[9px] py-[7px] max-[620px]:min-h-[44px] max-[620px]:gap-[5px] max-[620px]:px-[7px] max-[620px]:py-[5px]' +
          (formable ? ' border-[var(--rule)]' : ' border-[var(--rubric-dim)]') +
          (scoring && !scoring.cleared ? ' is-locked relative' : '')
        }
      >
        {scoring &&
          !scoring.cleared &&
          scoring.tiles.map((t, i) => (
            <span
              key={t.id}
              className={
                'relative inline-flex -translate-y-1 transition-transform duration-[90ms] ease-out' +
                (scoring.litTile === t.id || scoring.litSlot === t.id
                  ? ' motion-safe:animate-[tile-pop_260ms_cubic-bezier(0.2,0.9,0.3,1)]'
                  : '')
              }
            >
              {scoring.floats
                .filter((x) => x.on === t.id)
                .map((x) => (
                  <i
                    key={x.key}
                    className={
                      FLOAT_BASE + (x.tone === 'mult' ? FLOAT_MULT : '')
                    }
                  >
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
                  scoring.litTile === t.id || scoring.litSlot === t.id,
                )}
                className={'sb-tile is-set ' + TILE_SET}
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
              <i
                key={x.key}
                className={FLOAT_BASE + (x.tone === 'mult' ? FLOAT_MULT : '')}
              >
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
