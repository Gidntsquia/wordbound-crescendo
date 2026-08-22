#!/usr/bin/env node
//
// test/duel-balance-simulation.js -- DUEL-GAUGE COMBAT ticket's own VERIFY
// line ("virtual-clock duel simulation: deterministic intensity schedule +
// bot with configurable word-rate/reaction profiles; confirm each tier is
// winnable/losable as intended"). Pure Node, no jsdom/Playwright: duel.js
// and music.js are both framework-agnostic plain-JS modules (per the header
// FRAMEWORK decision) with zero DOM/WebAudio calls on the code paths this
// script exercises (Duel.create/tick/applyPlayerPush/registerCrescendoPeak/
// attemptParry, Music.intensityAt, and reading a piece's plain data object)
// -- so a trivial `window = global` shim is enough to load the real engine
// modules and drive the real math, same "don't reimplement the thing you're
// testing" principle test/balance-simulation.js's own header states for the
// turn-based sim.
//
// SCOPE, flagged plainly:
//   - ALL FOUR tiers now use real sequenced pieces, no synthetic schedule
//     left anywhere in this script: Mountain King ('mid' tier, the floor-1
//     boss -- js/wordbound/pieces/mountain-king.js), the Valkyrie Marshal
//     ('late' tier, the floor-3 boss -- js/wordbound/pieces/
//     valkyrie-marshal.js), the final boss's own Beethoven's 5th ('final'
//     tier -- js/wordbound/pieces/beethoven-5th.js), and, as of the REGULAR
//     ENEMIES ticket (GOALS.md), Morning Mood ('early' tier, one of
//     THEME.md's three early-tier regulars now sequenced --
//     js/wordbound/pieces/morning-mood.js) -- picked as the early-tier
//     representative specifically because it's the tier's only real piece
//     with a genuine crescendo marker (Gymnopédie's is a tiny late nudge,
//     Air on the G String has none at all), making the tier comparison
//     against mid/late/final meaningful. The other two early regulars
//     (Gymnopédie, Air on the G String) don't have dedicated sim/unit
//     coverage yet -- see this run's own PROGRESS.md entry. Beethoven's 5th
//     is wired into a real, reachable boss def too (boss_maestro, floor
//     4/"the Podium" -- DUEL-GAUGE COMBAT's floor/def-plumbing run, which
//     also bumped Floor.TOTAL_FLOORS to 4) -- the final-tier numbers below
//     are real player-reachable balance data, not just schedulable/
//     simmable-only numbers.
//   - Each simulated duel starts fresh at Duel.DEFAULT_HEALTH_BLOCKS (5).
//     Cross-fight health attrition across a whole run (player.healthBlocks
//     carried between duels) is explicitly out of scope here -- this
//     confirms a SINGLE duel of a given tier is winnable/losable as
//     intended, which is what the ticket's VERIFY line asks for.
//   - pushesToDefeat: 1 for "regular" (game.js's own default for a
//     non-boss), 3 for "boss" (game.js's own `monster.isBoss ? 3 : 1`
//     default, and the exact value all four real bosses use today --
//     Mountain King, the Unabridged Terror, the Valkyrie Marshal, and the
//     Maestro alike).
//   - Largo (the tempo-scale accessibility assist) is NOT modeled here --
//     already has its own real-browser verification (test:react-duel-loss).
//
// BOT PROFILES (word-rate/reaction, per the VERIFY line): weak/average/
// skilled, each a (word interval, word-score distribution, parry-timing
// skill) tuple. "Timing skill" lets average/skilled bots snap their next
// word toward a known upcoming crescendo peak (simulating a player reading
// the TELEGRAPH bullet's UI and readying a word for it) rather than
// ignoring peaks entirely, same spirit as a human reacting to the gauge's
// visible warning.
//
// Deterministic: a seeded PRNG (mulberry32) means the exact same run
// reproduces the exact same numbers -- rerun this script and diff the
// results file to confirm a tuning change actually moved the needle.
//
// Usage: node test/duel-balance-simulation.js [trialsPerCombo]  (default 40)

const fs = require('fs');
const path = require('path');

global.window = global;
window.Wordbound = window.Wordbound || {};

require('../js/wordbound/duel.js');
require('../js/wordbound/music.js');
require('../js/wordbound/pieces/mountain-king.js');
require('../js/wordbound/pieces/valkyrie-marshal.js');
require('../js/wordbound/pieces/beethoven-5th.js');
// REGULAR ENEMIES ticket (GOALS.md): early tier's real-piece representative
// -- see the SCOPE note above for why Morning Mood specifically.
require('../js/wordbound/pieces/morning-mood.js');

const Duel = window.Wordbound.Duel;
const Music = window.Wordbound.Music;
const mountainKing = window.Wordbound.Pieces.mountainKing;
const valkyrieMarshal = window.Wordbound.Pieces.valkyrieMarshal;
const beethoven5th = window.Wordbound.Pieces.beethoven5th;
const morningMood = window.Wordbound.Pieces.morningMood;

const TRIALS = parseInt(process.argv[2], 10) || 40;
const DT_SEC = 0.05;
// 300s (5min) rather than a shorter round number: a "nearly-safe" early-tier
// duel against a DISENGAGED (weak-profile) player is, by design, a slow
// near-zero-net-drift random walk (positive drift, but small relative to its
// own variance) -- a real but heavy-tailed minority of trials legitimately
// take several minutes to resolve even though they're in zero danger (0%
// loss rate). A short horizon just mislabels those slow-but-safe tails as
// "stalemate", which would read as a false danger signal. 300s was picked by
// running this script at 240s first (see PROGRESS.md), observing that exact
// tail on early/weak, and raising it enough to clear it in practice --
// tuned by measurement, not guessed upfront.
const HORIZON_SEC = 300;

// ---- seeded PRNG ------------------------------------------------------

function mulberry32(seed) {
  return function () {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ---- real pieces (mid: Mountain King, late: Valkyrie Marshal) ---------
// Mirrors music.js's own private unscaledTimeAtBeat/beatAtUnscaledTime
// (tempoScale=1, i.e. no Largo modeled -- see header note) since that
// conversion isn't part of Music's public API. Generalized (not
// Mountain-King-specific) so a real piece with MULTIPLE crescendo markers
// -- Valkyrie Marshal has four, unlike Mountain King's one continuous ramp
// -- schedules every one of its own peaks correctly, not just the first.

function buildTempoSegments(piece) {
  const segs = typeof piece.tempo === 'number' ? [{ beat: 0, bpm: piece.tempo }] : piece.tempo;
  const times = [0];
  for (let i = 1; i < segs.length; i++) {
    const beats = segs[i].beat - segs[i - 1].beat;
    times.push(times[i - 1] + (beats * 60) / segs[i - 1].bpm);
  }
  return { segs, times };
}
function timeAtBeat(tempoSegs, beat) {
  const { segs, times } = tempoSegs;
  let i = 0;
  while (i + 1 < segs.length && segs[i + 1].beat <= beat) i++;
  return times[i] + (beat - segs[i].beat) * (60 / segs[i].bpm);
}
function beatAtTime(tempoSegs, time) {
  const { segs, times } = tempoSegs;
  let i = 0;
  while (i + 1 < times.length && times[i + 1] <= time) i++;
  return segs[i].beat + (time - times[i]) * (segs[i].bpm / 60);
}

function realPieceTier(piece) {
  const tempo = buildTempoSegments(piece);
  const loopDurationSec = timeAtBeat(tempo, piece.lengthBeats);
  // Every crescendo marker's peak time within one loop, ascending -- a
  // single-crescendo piece (Mountain King) yields a 1-element array, a
  // multi-crescendo piece (Valkyrie Marshal) yields all of them.
  const peakTimesInLoop = piece.dynamics.crescendos
    .map((c) => timeAtBeat(tempo, c.peakBeat))
    .sort((a, b) => a - b);

  function intensityFn(t) {
    const tt = ((t % loopDurationSec) + loopDurationSec) % loopDurationSec;
    return Music.intensityAt(piece, beatAtTime(tempo, tt));
  }
  function peakTimes(count) {
    const loops = Math.ceil(count / peakTimesInLoop.length) + 1;
    const arr = [];
    for (let k = 0; k < loops; k++) {
      peakTimesInLoop.forEach((pt) => arr.push(k * loopDurationSec + pt));
    }
    return arr.filter((x) => x > 0).sort((a, b) => a - b);
  }
  return { loopDurationSec, intensityFn, peakTimes };
}

const mkTier = realPieceTier(mountainKing);
const vmTier = realPieceTier(valkyrieMarshal);
const b5Tier = realPieceTier(beethoven5th);
const earlyTier = realPieceTier(morningMood);

// ---- tier setup ---------------------------------------------------------

const TIERS = {
  early: {
    intensityFn: earlyTier.intensityFn,
    peaks: earlyTier.peakTimes(Math.ceil((HORIZON_SEC + 50) / earlyTier.loopDurationSec) + 1),
  },
  mid: {
    intensityFn: mkTier.intensityFn,
    peaks: mkTier.peakTimes(Math.ceil((HORIZON_SEC + 50) / mkTier.loopDurationSec) + 1),
  },
  late: {
    intensityFn: vmTier.intensityFn,
    peaks: vmTier.peakTimes(Math.ceil((HORIZON_SEC + 50) / vmTier.loopDurationSec) + 1),
  },
  final: {
    intensityFn: b5Tier.intensityFn,
    peaks: b5Tier.peakTimes(Math.ceil((HORIZON_SEC + 50) / b5Tier.loopDurationSec) + 1),
  },
};

// ---- bot profiles ---------------------------------------------------------

const PROFILES = {
  weak: {
    name: 'weak', interval: 4.2, jitter: 1.0,
    scoreMean: 11, scoreSpread: 5, scoreMin: 4, scoreMax: 20,
    parryReactionChance: 0, timingSkill: 0, bonusEvery: 0, bonusScore: 0,
  },
  average: {
    name: 'average', interval: 3.0, jitter: 0.8,
    scoreMean: 18, scoreSpread: 7, scoreMin: 8, scoreMax: 32,
    parryReactionChance: 0.5, timingSkill: 0.4, bonusEvery: 8, bonusScore: 38,
  },
  skilled: {
    name: 'skilled', interval: 2.1, jitter: 0.6,
    scoreMean: 25, scoreSpread: 8, scoreMin: 14, scoreMax: 45,
    parryReactionChance: 0.9, timingSkill: 0.85, bonusEvery: 5, bonusScore: 48,
  },
};

function sampleWordScore(profile, rng, wordsPlayed) {
  if (profile.bonusEvery && wordsPlayed > 0 && wordsPlayed % profile.bonusEvery === 0) {
    return profile.bonusScore;
  }
  const raw = profile.scoreMean + (rng() - 0.5) * 2 * profile.scoreSpread;
  return Math.max(profile.scoreMin, Math.min(profile.scoreMax, Math.round(raw)));
}

function nearestPeakDelta(now, peaks) {
  let best = Infinity;
  for (const p of peaks) {
    const d = Math.abs(p - now);
    if (d < best) best = d;
    if (p > now + 5) break; // peaks sorted ascending; stop once well past `now`
  }
  return best;
}

function nextWordDelay(profile, rng, peaks, now) {
  if (profile.timingSkill > 0 && rng() < profile.timingSkill) {
    const upcoming = peaks.find((p) => p > now && p - now <= profile.interval * 1.8);
    if (upcoming) return Math.max(0.1, upcoming - now + (rng() - 0.5) * 0.1);
  }
  const base = profile.interval + (rng() - 0.5) * 2 * profile.jitter;
  return Math.max(0.3, base);
}

// ---- one duel -------------------------------------------------------------

function simulateDuel({ tier, pushesToDefeat, profile, seed }) {
  const { intensityFn, peaks } = TIERS[tier];
  const rng = mulberry32(seed);
  const duel = Duel.create({ stageTier: tier, pushesToDefeat, healthBlocks: Duel.DEFAULT_HEALTH_BLOCKS });

  let now = 0;
  let nextPeakIdx = 0;
  let nextWordAt = nextWordDelay(profile, rng, peaks, now);
  let wordsPlayed = 0;
  let parriesAttempted = 0;
  let parriesLanded = 0;

  while (now < HORIZON_SEC && !duel.isTerminal()) {
    while (nextPeakIdx < peaks.length && peaks[nextPeakIdx] <= now) {
      duel.registerCrescendoPeak(peaks[nextPeakIdx]);
      nextPeakIdx++;
    }

    duel.tick(now, DT_SEC, intensityFn(now));
    if (duel.isTerminal()) break;

    if (now >= nextWordAt) {
      wordsPlayed++;
      if (profile.parryReactionChance > 0 && nearestPeakDelta(now, peaks) <= Duel.PARRY_WINDOW_SEC) {
        parriesAttempted++;
        if (rng() < profile.parryReactionChance && duel.attemptParry(now)) parriesLanded++;
      }
      duel.applyPlayerPush(now, sampleWordScore(profile, rng, wordsPlayed));
      nextWordAt = now + nextWordDelay(profile, rng, peaks, now);
    }

    now += DT_SEC;
  }

  return {
    won: duel.defeated,
    lost: duel.playerDefeated,
    stalemate: !duel.isTerminal(),
    duration: now,
    wordsPlayed,
    blocksLost: Duel.DEFAULT_HEALTH_BLOCKS - duel.healthBlocks,
    parriesAttempted,
    parriesLanded,
  };
}

// ---- run all combos + report ----------------------------------------------

function pct(x) { return (x * 100).toFixed(0) + '%'; }
function avg(arr) { return arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0; }

function main() {
  const tierNames = ['early', 'mid', 'late', 'final'];
  const profileNames = ['weak', 'average', 'skilled'];
  const encounterKinds = [{ label: 'regular', pushesToDefeat: 1 }, { label: 'boss', pushesToDefeat: 3 }];
  // Combos with no real designed counterpart yet in THEME.md's roster (no
  // boss is stageTier 'early', and no regular monster def is stageTier
  // 'mid' -- that tier is Mountain King's alone today). Still simulated
  // (cheap, and useful engine-tuning-sanity across the whole possible
  // space), but excluded from the sanity-flag checks below so a slow or
  // unusual result on a pairing nobody plans to ship doesn't read as a real
  // balance bug.
  const NON_DESIGNED = new Set(['early|boss']);

  const allResults = [];
  const flags = [];

  console.log('\n================ DUEL-GAUGE VIRTUAL-CLOCK BALANCE SIMULATION ================');
  console.log(`trials per combo: ${TRIALS}   dt: ${DT_SEC}s   horizon: ${HORIZON_SEC}s`);
  console.log(`early-tier real piece: Morning Mood, loop ${earlyTier.loopDurationSec.toFixed(1)}s, ${morningMood.dynamics.crescendos.length} crescendo/loop`);
  console.log(`mid-tier real piece: Mountain King, loop ${mkTier.loopDurationSec.toFixed(1)}s, 1 crescendo/loop`);
  console.log(`late-tier real piece: Valkyrie Marshal, loop ${vmTier.loopDurationSec.toFixed(1)}s, ${valkyrieMarshal.dynamics.crescendos.length} crescendos/loop`);
  console.log(`final-tier real piece: Symphony No. 5 (Beethoven), loop ${b5Tier.loopDurationSec.toFixed(1)}s, ${beethoven5th.dynamics.crescendos.length} crescendos/loop`);

  for (const tier of tierNames) {
    for (const kind of encounterKinds) {
      for (const profileName of profileNames) {
        const profile = PROFILES[profileName];
        const trials = [];
        for (let i = 0; i < TRIALS; i++) {
          const seed = tierNames.indexOf(tier) * 100000 + kind.pushesToDefeat * 10000 + profileNames.indexOf(profileName) * 1000 + i;
          trials.push(simulateDuel({ tier, pushesToDefeat: kind.pushesToDefeat, profile, seed }));
        }
        const wins = trials.filter((t) => t.won);
        const losses = trials.filter((t) => t.lost);
        const stalemates = trials.filter((t) => t.stalemate);
        const winRate = wins.length / trials.length;
        const parryAtt = trials.reduce((s, t) => s + t.parriesAttempted, 0);
        const parryLand = trials.reduce((s, t) => s + t.parriesLanded, 0);

        const nonDesigned = NON_DESIGNED.has(`${tier}|${kind.label}`);
        const row = {
          tier, kind: kind.label, profile: profileName, nonDesigned,
          winRate, lossRate: losses.length / trials.length, stalemateRate: stalemates.length / trials.length,
          avgWinDuration: avg(wins.map((t) => t.duration)),
          avgLossDuration: avg(losses.map((t) => t.duration)),
          avgBlocksLostOnWin: avg(wins.map((t) => t.blocksLost)),
          avgWordsPlayed: avg(trials.map((t) => t.wordsPlayed)),
          parryLandRate: parryAtt ? parryLand / parryAtt : null,
        };
        allResults.push(row);

        console.log(
          `  ${tier.padEnd(6)} ${kind.label.padEnd(8)} ${profileName.padEnd(8)} ` +
          `win ${pct(row.winRate).padStart(4)}  loss ${pct(row.lossRate).padStart(4)}` +
          (row.stalemateRate ? `  STALEMATE ${pct(row.stalemateRate)}` : '') +
          `  avgWords ${row.avgWordsPlayed.toFixed(1)}` +
          (row.avgBlocksLostOnWin ? `  blocksLostOnWin ${row.avgBlocksLostOnWin.toFixed(2)}` : '') +
          (row.parryLandRate != null ? `  parry ${pct(row.parryLandRate)}` : '') +
          (nonDesigned ? '  (no real pairing yet)' : '')
        );
      }
    }
  }

  // ---- sanity flags against the header curve decision -------------------
  // "early ~always winnable, final brutal" (ticket's own VERIFY line).
  const get = (tier, kind, profile) => allResults.find((r) => r.tier === tier && r.kind === kind && r.profile === profile);

  // "Nearly-safe" is about DANGER (loss rate), not resolution speed -- a
  // slow-but-0%-loss fight is exactly what "nearly safe" should look like
  // for a weak/disengaged player, just a pacing curiosity, not a threat. The
  // stalemate check above already flags resolution-speed separately.
  const earlyWeakRegular = get('early', 'regular', 'weak');
  if (earlyWeakRegular.lossRate > 0.05) {
    flags.push(`SAFETY: EARLY tier isn't "nearly-safe": weak-bot regular loss rate is ${pct(earlyWeakRegular.lossRate)} (want ~0%).`);
  }
  const finalWeakBoss = get('final', 'boss', 'weak');
  if (finalWeakBoss.winRate > 0.25) {
    flags.push(`DIFFICULTY: FINAL tier isn't "brutal" against weak play: weak-bot boss win rate ${pct(finalWeakBoss.winRate)} (want <=25%).`);
  }
  const finalSkilledBoss = get('final', 'boss', 'skilled');
  if (finalSkilledBoss.winRate === 0) {
    flags.push(`DIFFICULTY: FINAL tier may be UNWINNABLE even for this script's idealized skilled bot: win rate is 0%.`);
  } else if (finalSkilledBoss.winRate >= 0.98 && finalSkilledBoss.avgBlocksLostOnWin >= 2) {
    flags.push(`INFO (not necessarily a problem): FINAL tier's skilled-bot boss win rate is ${pct(finalSkilledBoss.winRate)}, but costs an avg ${finalSkilledBoss.avgBlocksLostOnWin.toFixed(1)}/${Duel.DEFAULT_HEALTH_BLOCKS} Verses even for this script's idealized 90%-parry-reaction bot -- reads as "the strongest survive, barely" rather than trivial, but worth Jaxon's real playtest to confirm it FEELS brutal, not just costly on paper.`);
  } else if (finalSkilledBoss.winRate >= 0.98) {
    flags.push(`DIFFICULTY: FINAL tier may be trivial even for skilled play: skilled-bot boss win rate ${pct(finalSkilledBoss.winRate)} with low health cost (avg ${finalSkilledBoss.avgBlocksLostOnWin.toFixed(1)} Verses lost) -- worth a real balance look.`);
  }
  for (const r of allResults) {
    if (r.stalemateRate > 0 && !r.nonDesigned) {
      flags.push(`${r.tier}/${r.kind}/${r.profile}: ${pct(r.stalemateRate)} of trials hit the ${HORIZON_SEC}s horizon without resolving (stalemate) -- investigate before trusting this combo's win/loss numbers.`);
    }
  }

  console.log('\n---- sanity flags vs. header curve decision ("early ~always winnable, final brutal") ----');
  if (flags.length) flags.forEach((f) => console.log('  FLAG: ' + f));
  else console.log('  (none -- all checked tiers/profiles land within the expected band)');

  fs.writeFileSync(
    path.join(__dirname, 'duel-balance-simulation-results.json'),
    JSON.stringify({ trialsPerCombo: TRIALS, dtSec: DT_SEC, horizonSec: HORIZON_SEC, results: allResults, flags }, null, 2)
  );
  console.log('\nFull results: test/duel-balance-simulation-results.json');
  console.log('===============================================================================\n');
}

main();
