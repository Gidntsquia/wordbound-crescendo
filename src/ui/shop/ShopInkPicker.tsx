// The shop's "buy an ink, apply it on the spot" picker -- extracted from
// Shop.jsx (READ_SLOWLY_PLAN.md A4, mechanical extraction), ported to
// .tsx.
interface Tile {
  id: string;
  letter: string;
  mark?: string;
}

interface Ink {
  targets: number;
  needsVowel?: boolean;
  hint: string;
}

interface Selecting {
  name: string;
  from: string;
  price: number;
  ink: Ink;
  hand: Tile[];
  ids: string[];
  vowel: string | null;
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
  run: { consumables: unknown[]; tune: { CONSUMABLE_SLOTS: number } };
  toggleSelectTile: (id: string | null, vowel?: string) => void;
  commitSelecting: (apply: boolean) => void;
  cancelSelecting: () => void;
}) {
  return (
    <div className="sb-pack-open sb-ink-decide">
      <span className="sb-eyebrow">
        {selecting.name}
        {selecting.from === 'shop' ? ' · ' + selecting.price + ' gold' : ''}
      </span>
      <span className="sb-hint">
        {selecting.ink.targets === 0
          ? selecting.ink.hint
          : (selecting.ink.targets === 1
              ? 'Tap one of your tiles to apply on the spot, or just buy it — '
              : 'Tap up to ' +
                selecting.ink.targets +
                ' of your tiles to apply on the spot, or just buy it — ') +
            selecting.ink.hint}
      </span>
      {selecting.ink.targets > 0 && (
        <div className="sb-rack">
          {selecting.hand.map((t) => (
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
      {selecting.ink.needsVowel && selecting.ids.length > 0 && (
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
          disabled={run.consumables.length >= run.tune.CONSUMABLE_SLOTS}
        >
          Buy ({run.consumables.length}/{run.tune.CONSUMABLE_SLOTS} slots)
        </button>
        <button
          type="button"
          className="sb-go"
          onClick={() => commitSelecting(true)}
          disabled={
            selecting.ink.targets > 0 &&
            (!selecting.ids.length ||
              (selecting.ink.needsVowel && !selecting.vowel))
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
