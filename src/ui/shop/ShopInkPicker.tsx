// The shop's "buy an ink, apply it on the spot" picker -- extracted from
// Shop.jsx (READ_SLOWLY_PLAN.md A4, mechanical extraction), ported to
// .tsx.
import type { Selecting } from '../fight/FightScreen';
import { Button } from '@/ui/primitives/button';

interface Tile {
  id: string;
  letter: string;
  mark?: string;
}

export default function ShopInkPicker({
  selecting,
  SB,
  run,
  toggleSelectTile,
  commitSelecting,
  cancelSelecting,
}: {
  selecting: Selecting;
  SB: {
    MARK_DEFS: Record<string, { name: string; hint: string }>;
    VOWELS: string[];
    LETTER_VALUES?: Record<string, number>;
  };
  run: {
    consumables: readonly unknown[];
    tune: Record<string, number | boolean | undefined>;
  };
  toggleSelectTile: (id: string | null, vowel?: string) => void;
  commitSelecting: (apply: boolean) => void;
  cancelSelecting: () => void;
}) {
  const ink = selecting.ink as {
    targets: number;
    needsVowel?: boolean;
    hint: string;
  };
  const slots = Number(run.tune.CONSUMABLE_SLOTS);
  return (
    <div className="sb-pack-open sb-ink-decide">
      <span className="sb-eyebrow text-[10px] font-semibold tracking-[0.22em] whitespace-nowrap text-[var(--leaf-dim)] uppercase">
        {selecting.name}
        {selecting.from === 'shop' ? ' · ' + selecting.price + ' gold' : ''}
      </span>
      <span className="sb-hint">
        {ink.targets === 0
          ? ink.hint
          : (ink.targets === 1
              ? 'Tap one of your tiles to apply on the spot, or just buy it — '
              : 'Tap up to ' +
                ink.targets +
                ' of your tiles to apply on the spot, or just buy it — ') +
            ink.hint}
      </span>
      {ink.targets > 0 && (
        <div className="sb-rack mb-3.5 flex flex-auto flex-wrap gap-[7px] max-[620px]:mb-2 max-[620px]:gap-[5px]">
          {(selecting.hand as Tile[]).map((t) => (
            <Button
              key={t.id}
              type="button"
              variant="paper"
              className={
                // Tailwind port of the base .sb-tile look (sandbox.css A6
                // slice 5) -- see Rack.tsx for the full comment. Nothing
                // here may set transform/translate/scale/rotate.
                'sb-tile relative h-[52px] min-w-[46px] touch-none rounded-[2px] border border-[var(--leaf)] bg-[var(--leaf)] p-0 text-[22px] font-[var(--display)] font-semibold tracking-normal text-[var(--ink)] normal-case shadow-[0_2px_0_rgba(0,0,0,0.45)] select-none not-disabled:hover:border-[var(--brass-hot)] not-disabled:hover:bg-[var(--brass-hot)] not-disabled:hover:text-[var(--ink)] not-disabled:hover:shadow-[0_4px_0_rgba(0,0,0,0.45),0_0_0_1px_var(--brass-hot)] max-[620px]:h-[46px] max-[620px]:min-w-[40px] max-[620px]:text-[19px]' +
                (t.mark ? ' is-mark-' + t.mark : '') +
                (selecting.ids.includes(t.id) ? ' is-inking' : '')
              }
              title={
                t.mark
                  ? SB.MARK_DEFS[t.mark]!.name +
                    ' — ' +
                    SB.MARK_DEFS[t.mark]!.hint
                  : undefined
              }
              onClick={() => toggleSelectTile(t.id)}
            >
              {t.letter === '?' ? '␣' : t.letter}
              <sub className="absolute right-1 bottom-[3px] text-[9px] font-[var(--figure)] text-[rgba(26,23,16,0.55)]">
                {SB.LETTER_VALUES
                  ? SB.LETTER_VALUES[t.letter]
                  : window.Wordbound.Lexicon.LETTER_VALUES[t.letter]}
              </sub>
            </Button>
          ))}
        </div>
      )}
      {ink.needsVowel && selecting.ids.length > 0 && (
        <span className="sb-vowels">
          {SB.VOWELS.map((v) => (
            <Button
              key={v}
              type="button"
              variant="paper"
              className={'sb-vowel' + (selecting.vowel === v ? ' is-on' : '')}
              onClick={() => toggleSelectTile(null, v)}
            >
              {v}
            </Button>
          ))}
        </span>
      )}
      <div className="sb-shop-row">
        <Button
          type="button"
          variant="paper"
          onClick={() => commitSelecting(false)}
          disabled={run.consumables.length >= slots}
        >
          Buy ({run.consumables.length}/{slots} slots)
        </Button>
        <Button
          type="button"
          variant="paperPrimary"
          className="sb-go border-[var(--leaf)] bg-[var(--leaf)] text-[var(--ink)] hover:border-[var(--brass-hot)] hover:bg-[var(--brass-hot)] hover:text-[var(--ink)]"
          onClick={() => commitSelecting(true)}
          disabled={
            ink.targets > 0 &&
            (!selecting.ids.length || (!!ink.needsVowel && !selecting.vowel))
          }
        >
          Buy &amp; apply
          {selecting.ids.length ? ' to ' + selecting.ids.length : ''}
        </Button>
        <Button type="button" variant="paperGhost" onClick={cancelSelecting}>
          Never mind
        </Button>
      </div>
    </div>
  );
}
