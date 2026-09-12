// The case (rack) of tiles -- extracted from PlayBoard.jsx (READ_SLOWLY_PLAN.md
// A4). Tap plays a tile onto the stick, drag reorders/moves it; inking mode
// diverts taps to toggleInkTile instead.
import { Button } from '@/ui/primitives/button';
import Sprite from '../../art/Sprite';
import type { Tile } from '../../engine/tiles';
import type { RoundFacade } from '../../engine/state/facade';
import type { Inking as RealInking } from './FightScreen';

// The three marks with a src/art/svg/pieces.tsx overlay sheet -- 'blank'
// has no manifest sheet, so it stays dot-only (MARK_DOT below).
const MARK_OVERLAY_SHEET: Record<string, string> = {
  gilt: 'mark_overlay_gilt',
  bold: 'mark_overlay_bold',
  steel: 'mark_overlay_steel',
};

interface RackEntry {
  t: Tile;
  i: number;
  picked: boolean;
  hollow: boolean;
}

type Inking = RealInking;

type RoundLike = RoundFacade;

interface DragBind {
  bind: (
    row: string,
    index: number,
    id: string | null,
  ) => { onPointerDown: (e: React.PointerEvent<HTMLElement>) => void };
}

export default function Rack({
  rackShown,
  live,
  inking,
  round,
  scoring,
  SB,
  drag,
  toggleInkTile,
  stageTile,
  say,
  sfx,
  letterValues,
  characterTile,
  characterPicked,
}: {
  rackShown: RackEntry[];
  live: boolean;
  inking: Inking | null;
  round: RoundLike;
  scoring: { litTile?: string | null } | null;
  SB: { MARK_DEFS: Record<string, { name: string; hint: string }> };
  drag: DragBind | null;
  toggleInkTile: (id: string) => void;
  stageTile: (t: Tile) => void;
  say: (m: string) => void;
  sfx: (name: string, ...a: unknown[]) => void;
  letterValues: Record<string, number>;
  characterTile?: Tile | null;
  characterPicked?: boolean;
}) {
  // A rack tile is a piece of foundry type: paper face, ink letter, point
  // size in the corner. TILE_* below is the Tailwind port of former
  // .sb-tile rules (sandbox.css A6 slice 5) -- the class name itself stays
  // on every tile as a plain marker (no CSS attached to it any more): both
  // dragReorder.ts (classList.contains('sb-tile')/('is-dragging')) and
  // useDragReorder.ts (querySelector('.sb-rack')/('.sb-character-slot'))
  // key off these literal strings, so they must not be renamed.
  //
  // NOTHING BELOW MAY SET `transform`, `translate`, `scale`, or `rotate` on
  // a tile. The tap-to-play slide is a FLIP (flipTileTo) that owns this
  // element's `transform` for the 190ms it is travelling -- a Tailwind
  // utility that also wrote transform (or translate/scale/rotate, which
  // Tailwind can compile to `transform` for stacking) would fight it for
  // the same property and the tile would jump. Lift stays shadow + colour
  // only.
  const TILE_STRUCT =
    'relative isolate min-w-[46px] h-[52px] p-0 rounded-[2px] font-[var(--display)] text-[22px] font-semibold tracking-normal normal-case touch-none select-none';
  const TILE_PLAIN =
    TILE_STRUCT +
    ' text-[var(--ink)] bg-[var(--leaf)] border border-[var(--leaf)] shadow-[0_2px_0_rgba(0,0,0,0.45)]' +
    ' not-disabled:hover:bg-[var(--brass-hot)] not-disabled:hover:border-[var(--brass-hot)] not-disabled:hover:text-[var(--ink)] not-disabled:hover:shadow-[0_4px_0_rgba(0,0,0,0.45),0_0_0_1px_var(--brass-hot)]';
  // The character's own tile gets a distinct colour (gilt, matching
  // PilesDrawer.tsx's is-character treatment) so it reads apart from the
  // rest of the case at a glance.
  const TILE_CHARACTER =
    TILE_STRUCT +
    ' text-[var(--ink)] bg-[var(--gilt,var(--brass-hot))] border border-[var(--gilt,var(--brass-hot))] shadow-[0_2px_0_rgba(0,0,0,0.45)]' +
    ' not-disabled:hover:bg-[var(--brass-hot)] not-disabled:hover:border-[var(--brass-hot)] not-disabled:hover:text-[var(--ink)] not-disabled:hover:shadow-[0_4px_0_rgba(0,0,0,0.45),0_0_0_1px_var(--brass-hot)]';
  const TILE_SLOT =
    TILE_STRUCT +
    // inline-flex: the character slot's hollow is not a flex item (its
    // wrapper div is not display:flex), so as a bare inline span min-width
    // would not apply and it collapsed to a sliver on phones.
    ' inline-flex bg-transparent border border-dashed border-[var(--rule)] shadow-none cursor-default pointer-events-none';
  const SUB_BASE =
    'absolute right-1 bottom-[3px] font-[var(--figure)] text-[9px] text-[rgba(26,23,16,0.55)]';

  // Ported from sandbox.css's INKED TILES / barred-tile rules (A6 slice 6).
  // Inline style, not Tailwind classes, because these box-shadow overrides
  // must beat TILE_PLAIN's own box-shadow utility deterministically --
  // stacking two `shadow-[...]` classes on one element leaves the winner to
  // Tailwind's build-order, not this file's priority. Priority mirrors the
  // old cascade (barred was declared last in sandbox.css, so it wins over a
  // mark; inking wins over a mark too since it was declared after marks).
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
  // The lit glow (sandbox.css A6 slice 7 port of .sb-tile.is-lit), same
  // priority note as Stick.tsx's copy: a marked/inking tile's own inline
  // style already wins over any CSS class, so it also wins over the lit
  // glow here -- unchanged from the pre-Tailwind cascade.
  const LIT_GLOW =
    '0 0 0 2px var(--brass-hot), 0 0 18px rgba(242, 194, 96, 0.55)';
  function tileOverrideStyle(
    mark: string | null | undefined,
    inking: boolean,
    barred: boolean,
    lit?: boolean,
  ): React.CSSProperties | undefined {
    if (barred)
      return {
        background: 'var(--rule)',
        borderColor: 'var(--rule)',
        color: 'var(--leaf-dim)',
        boxShadow: 'none',
      };
    if (inking)
      return {
        background: 'var(--brass-hot)',
        borderColor: 'var(--brass-hot)',
      };
    if (mark) return { boxShadow: MARK_GLOW[mark] };
    if (lit) return { boxShadow: LIT_GLOW };
    return undefined;
  }

  // The character slot squeezes the case down to fit an 8th tile on one
  // phone row (sandbox.css used to key this off .sb-rack-row:has(.sb-
  // character-slot); doing it from the characterTile prop instead of :has
  // is equivalent since this component already knows whether the slot is
  // showing).
  const compact = !!characterTile;
  const tileSize = compact
    ? 'max-[620px]:min-w-[34px] max-[620px]:h-[42px] max-[620px]:text-[17px]'
    : 'max-[620px]:min-w-[40px] max-[620px]:h-[46px] max-[620px]:text-[19px]';
  const rackRowGap = compact ? ' max-[620px]:gap-1' : '';
  const rackGap = compact ? ' max-[620px]:gap-1' : ' max-[620px]:gap-[5px]';

  return (
    <div className={'flex items-start gap-[7px]' + rackRowGap}>
      {characterTile && (
        <div className="sb-character-slot flex-none border-r border-[var(--rule)] pr-2">
          {characterPicked || round.characterUsed ? (
            <span
              className={'sb-tile is-slot ' + TILE_SLOT + ' ' + tileSize}
              aria-hidden="true"
              title={
                round.characterUsed && !characterPicked
                  ? 'Played this round already — back next round.'
                  : undefined
              }
            />
          ) : (
            <Button
              type="button"
              disabled={!live}
              variant="paper"
              style={
                scoring && scoring.litTile === characterTile.id
                  ? { boxShadow: LIT_GLOW }
                  : undefined
              }
              className={
                'sb-tile ' +
                TILE_CHARACTER +
                ' ' +
                tileSize +
                (round.isBarred(characterTile) ? ' is-barred' : '')
              }
              data-flip-tile-id={characterTile.id}
              title="Your character's own tile — playable once this round."
              {...(drag ? drag.bind('character', 0, characterTile.id) : {})}
              onClick={() =>
                round.isBarred(characterTile)
                  ? (sfx('thud'),
                    say(
                      characterTile.letter +
                        ' has been played this round — ' +
                        round.rule!.name +
                        '.',
                    ))
                  : stageTile(characterTile)
              }
            >
              {characterTile.letter}
              <sub className={SUB_BASE}>
                {letterValues[characterTile.letter] || 0}
              </sub>
            </Button>
          )}
        </div>
      )}
      <div
        className={
          'sb-rack mb-3.5 flex flex-auto flex-wrap gap-[7px] max-[620px]:mb-2' +
          rackGap
        }
      >
        {rackShown.map(({ t, i, picked, hollow }) =>
          picked ? (
            <span
              key={t.id}
              className={'sb-tile is-slot ' + TILE_SLOT + ' ' + tileSize}
              aria-hidden="true"
            />
          ) : (
            <Button
              key={t.id}
              type="button"
              disabled={!live}
              variant="paper"
              style={tileOverrideStyle(
                t.mark,
                !!(inking && inking.ids.includes(t.id)),
                round.isBarred(t),
                !!(scoring && scoring.litTile === t.id),
              )}
              className={
                'sb-tile ' +
                TILE_PLAIN +
                ' ' +
                tileSize +
                (hollow ? ' is-dragging opacity-25' : '')
              }
              data-flip-tile-id={t.id}
              title={
                t.mark
                  ? SB.MARK_DEFS[t.mark]!.name +
                    ' — ' +
                    SB.MARK_DEFS[t.mark]!.hint
                  : undefined
              }
              {...(inking || !drag ? {} : drag.bind('rack', i, t.id))}
              onClick={() =>
                inking
                  ? toggleInkTile(t.id)
                  : round.isBarred(t)
                    ? (sfx('thud'),
                      say(
                        t.letter +
                          ' has been played this round — ' +
                          round.rule!.name +
                          '.',
                      ))
                    : stageTile(t)
              }
            >
              <Sprite
                sheet="tile_face"
                pose="idle"
                className="pointer-events-none absolute inset-0 -z-10 rounded-[2px] opacity-15"
              />
              {t.mark && !round.isBarred(t) && (
                <i
                  aria-hidden="true"
                  className="absolute top-[3px] left-1 h-1.5 w-1.5 rounded-full"
                  style={{ background: MARK_DOT[t.mark] }}
                />
              )}
              {t.mark && MARK_OVERLAY_SHEET[t.mark] && !round.isBarred(t) && (
                <Sprite
                  sheet={MARK_OVERLAY_SHEET[t.mark]!}
                  pose="idle"
                  className="absolute inset-0 rounded-[2px]"
                />
              )}
              {round.isBarred(t) && (
                <i
                  aria-hidden="true"
                  className="absolute top-1/2 right-1.5 left-1.5 h-px"
                  style={{ background: 'var(--rubric)' }}
                />
              )}
              {t.letter === '?' ? '␣' : t.letter}
              <sub
                className={SUB_BASE}
                style={
                  round.isBarred(t) ? { color: 'var(--leaf-dim)' } : undefined
                }
              >
                {letterValues[t.letter] || 0}
              </sub>
            </Button>
          ),
        )}
      </div>
    </div>
  );
}
