// READ_SLOWLY_PLAN.md A4: pure code-move out of RoundSandbox.jsx. The
// tuning panel -- a live editor over every ROUND_DEFAULTS constant, no
// persistence (copy numbers into round.ts by hand once you like them).
// Ported to .tsx (READ_SLOWLY_PLAN.md A1 remainder). Grouped onto shadcn
// Tabs (READ_SLOWLY_PLAN.md A6) -- a standalone settings panel never
// touched mid-drag/tap, so regrouping it carries none of the risk the A6
// ledger note flags for the tile/scoreboard/shop chrome.
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../primitives/tabs';

const TUNE_GROUPS: { id: string; label: string; keys: string[] }[] = [
  {
    id: 'round',
    label: 'Round',
    keys: [
      'MOVEMENT_BASE_1',
      'MOVEMENT_BASE_2',
      'MOVEMENT_BASE_3',
      'BIG_MULT',
      'BOSS_MULT',
      'PLAYS',
      'CHANGEOUTS',
      'RACK_SIZE',
    ],
  },
  {
    id: 'tiers',
    label: 'Tiers',
    keys: [
      'PTS_2',
      'MULT_2',
      'PTS_3',
      'MULT_3',
      'PTS_4',
      'MULT_4',
      'PTS_5',
      'MULT_5',
      'PTS_6',
      'MULT_6',
      'PTS_7',
      'MULT_7',
    ],
  },
  {
    id: 'shop',
    label: 'Shop',
    keys: [
      'ITEM_SLOTS',
      'CONSUMABLE_SLOTS',
      'CARD_SLOTS',
      'CARD_ITEM',
      'CARD_MARK',
      'CARD_ETUDE',
      'PACK_SLOTS',
      'PACK_PRICE',
      'PACK_CHOICES',
      'MARK_PRICE',
      'ETUDE_PRICE',
      'REROLL_PRICE',
      'REROLL_STEP',
    ],
  },
  {
    id: 'marginalia',
    label: 'Marginalia',
    keys: ['MARK_GILT', 'MARK_BOLD', 'MARK_STEEL', 'MARK_COIN_CAP'],
  },
  {
    id: 'ink',
    label: 'Ink & gold',
    keys: [
      'BOUNTY_INK',
      'INK_SMALL',
      'INK_BIG',
      'INK_BOSS',
      'INK_PER_WORD_LEFT',
      'START_INK',
      'INTEREST_PER',
      'INTEREST_CAP',
    ],
  },
  {
    id: 'premium',
    label: 'Premium slot',
    keys: ['PREMIUM_CHANCE', 'PREMIUM_DL', 'PREMIUM_TL', 'PREMIUM_DW'],
  },
  {
    id: 'character',
    label: 'Character',
    keys: ['CHAR_LETTER_MULT', 'CHAR_MULT'],
  },
];

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
  const allKeys = Object.keys(SB.ROUND_DEFAULTS);
  const grouped = new Set(TUNE_GROUPS.flatMap((g) => g.keys));
  const leftover = allKeys.filter((k) => !grouped.has(k));
  const groups = leftover.length
    ? [...TUNE_GROUPS, { id: 'other', label: 'Other', keys: leftover }]
    : TUNE_GROUPS;

  const field = (key: string) => (
    <label key={key}>
      {TUNE_LABELS[key] || key}
      <input
        type="number"
        step={1}
        value={Number(tune[key])}
        onChange={(e) => setConst(key, Number(e.target.value))}
      />
    </label>
  );

  return (
    <div className="sb-gear-panel sb-gear-panel-tune">
      <details className="sb-tune">
        <summary>Tuning · every constant, live</summary>
        <Tabs defaultValue={groups[0]!.id} className="sb-tune-tabs">
          <TabsList>
            {groups.map((g) => (
              <TabsTrigger key={g.id} value={g.id}>
                {g.label}
              </TabsTrigger>
            ))}
          </TabsList>
          {groups.map((g) => (
            <TabsContent key={g.id} value={g.id} className="sb-tune-grid">
              {g.keys.map((key) => field(key))}
            </TabsContent>
          ))}
        </Tabs>
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
