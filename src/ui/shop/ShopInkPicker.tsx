// The shop's "buy an ink, apply it on the spot" picker -- extracted from
// Shop.jsx (READ_SLOWLY_PLAN.md A4, mechanical extraction), ported to
// .tsx.
import type { Selecting } from '../fight/FightScreen';

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
      <span className="sb-eyebrow">
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
        <div className="sb-rack">
          {(selecting.hand as Tile[]).map((t) => (
            <button
              key={t.id}
              type="button"
              className={
                'sb-tile' +
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
              <sub>
                {SB.LETTER_VALUES
                  ? SB.LETTER_VALUES[t.letter]
                  : window.Wordbound.Lexicon.LETTER_VALUES[t.letter]}
              </sub>
            </button>
          ))}
        </div>
      )}
      {ink.needsVowel && selecting.ids.length > 0 && (
        <span className="sb-vowels">
          {SB.VOWELS.map((v) => (
            <button
              key={v}
              type="button"
              className={'sb-vowel' + (selecting.vowel === v ? ' is-on' : '')}
              onClick={() => toggleSelectTile(null, v)}
            >
              {v}
            </button>
          ))}
        </span>
      )}
      <div className="sb-shop-row">
        <button
          type="button"
          onClick={() => commitSelecting(false)}
          disabled={run.consumables.length >= slots}
        >
          Buy ({run.consumables.length}/{slots} slots)
        </button>
        <button
          type="button"
          className="sb-go"
          onClick={() => commitSelecting(true)}
          disabled={
            ink.targets > 0 &&
            (!selecting.ids.length || (!!ink.needsVowel && !selecting.vowel))
          }
        >
          Buy &amp; apply
          {selecting.ids.length ? ' to ' + selecting.ids.length : ''}
        </button>
        <button type="button" onClick={cancelSelecting}>
          Never mind
        </button>
      </div>
    </div>
  );
}
