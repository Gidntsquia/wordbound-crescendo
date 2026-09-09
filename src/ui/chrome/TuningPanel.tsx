// READ_SLOWLY_PLAN.md A4: pure code-move out of RoundSandbox.jsx. The
// tuning panel -- a live editor over every ROUND_DEFAULTS constant, no
// persistence (copy numbers into round.ts by hand once you like them).
// Ported to .tsx (READ_SLOWLY_PLAN.md A1 remainder).
const TUNE_LABELS: Record<string, string> = {
  MOVEMENT_BASE_1: 'Target base, movement I',
  MOVEMENT_BASE_2: 'Target base, movement II',
  MOVEMENT_BASE_3: 'Target base, movement III',
  BIG_MULT: 'Big enemy × base',
  BOSS_MULT: 'Boss × base',
  PLAYS: 'Words per round',
  CHANGEOUTS: 'Swaps per fight',
  RACK_SIZE: 'Rack size',
  PTS_2: 'Short (1–2) · points',
  MULT_2: 'Short · mult',
  PTS_3: 'Three · points',
  MULT_3: 'Three · mult',
  PTS_4: 'Four · points',
  MULT_4: 'Four · mult',
  PTS_5: 'Five · points',
  MULT_5: 'Five · mult',
  PTS_6: 'Six · points',
  MULT_6: 'Six · mult',
  PTS_7: 'Seven+ · points',
  MULT_7: 'Seven+ · mult',
  ITEM_SLOTS: 'Quill slots',
  CONSUMABLE_SLOTS: 'Consumable slots',
  CARD_SLOTS: 'Shop card slots',
  CARD_ITEM: 'Card roll · quill weight',
  CARD_MARK: 'Card roll · marginalia weight',
  CARD_ETUDE: 'Card roll · étude weight',
  PACK_SLOTS: 'Shop pack slots',
  PACK_PRICE: 'Pack price',
  PACK_CHOICES: 'Pack · choices shown',
  MARK_PRICE: 'Marginalia price',
  ETUDE_PRICE: 'Reread price',
  REROLL_PRICE: 'Reroll price',
  REROLL_STEP: 'Reroll price step',
  MARK_GILT: 'Gilt · points per tile',
  MARK_BOLD: 'Bold · mult per tile',
  MARK_STEEL: 'Steel · × mult held',
  MARK_COIN_CAP: 'Coin · ink cap',
  BOUNTY_INK: 'Skip bonus · ink',
  INK_SMALL: 'Ink, small enemy',
  INK_BIG: 'Ink, big enemy',
  INK_BOSS: 'Ink, boss',
  INK_PER_WORD_LEFT: 'Ink per word left',
  START_INK: 'Starting ink',
  INTEREST_PER: 'Interest: 1 gold per',
  INTEREST_CAP: 'Interest cap',
  PREMIUM_CHANCE: 'Premium slot · odds per round',
  PREMIUM_DL: 'Premium · double letter ×',
  PREMIUM_TL: 'Premium · triple letter ×',
  PREMIUM_DW: 'Premium · double word ×',
};

export default function TuningPanel({
  SB,
  tune,
  setConst,
}: {
  SB: { ROUND_DEFAULTS: Record<string, number | boolean | undefined> };
  tune: Record<string, number | boolean | undefined>;
  setConst: (key: string, value: number | boolean | undefined) => void;
}) {
  return (
    <div className="sb-gear-panel sb-gear-panel-tune">
      <details className="sb-tune">
        <summary>Tuning · every constant, live</summary>
        <div className="sb-tune-grid">
          {Object.keys(SB.ROUND_DEFAULTS).map((key) => (
            <label key={key}>
              {TUNE_LABELS[key] || key}
              <input
                type="number"
                step={1}
                value={Number(tune[key])}
                onChange={(e) => setConst(key, Number(e.target.value))}
              />
            </label>
          ))}
        </div>
        <p className="sb-tune-note">
          Targets, words, swaps and rack size take effect on the next round; the
          tier figures apply to the next word; the gold figures are read at the
          win. Nothing is saved — copy the numbers you want to keep into
          src/sandbox/round.js.
        </p>
      </details>
    </div>
  );
}
