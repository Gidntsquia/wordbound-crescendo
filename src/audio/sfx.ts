// TS port of src/sandbox/sfx.js (READ_SLOWLY_PLAN.md A2/A5 step 3): input
// sounds and the scoring cascade's hits -- a tiny SYNTHESIZED layer (WebAudio
// oscillators and filtered noise only, no samples). Still attaches to
// window.Wordbound.Sandbox for RoundSandbox.jsx, which creates and drives it.

export const SFX_DEFAULTS = {
  LEVEL: 0.55, // x the music volume; SFX sit a touch under the music
  // tick: a wooden click, pitch rising with stick position
  TICK_HZ: 640, // first stick position
  TICK_STEP: 1.06, // x per position (about a semitone); 7th tile ~ 1.4x
  TICK_MS: 55,
  TICK_GAIN: 0.55,
  TICK_DOWN_GAIN: 0.38, // stick -> case, a little softer
  TICK_DROP_GAIN: 0.25, // a drag drop, muted
  // shuffle: filtered-noise taps
  SHUFFLE_TAPS: 4,
  SHUFFLE_MS: 120,
  SHUFFLE_GAIN: 0.9,
  // thud
  THUD_HZ: 110,
  THUD_MS: 90,
  THUD_GAIN: 0.5,
  // coin
  COIN_HZ: 1046, // C6; the second sine a fifth up
  COIN_MS: 70,
  COIN_GAP_MS: 55,
  COIN_GAIN: 0.3,
  // shimmer
  SHIMMER_HZ: 1320,
  SHIMMER_DETUNE: 9, // Hz between the pair
  SHIMMER_MS: 220,
  SHIMMER_GAIN: 0.22,
  // Phase 4 -- the scoring cascade
  LOCK_HZ: 90,
  LOCK_MS: 120,
  LOCK_GAIN: 0.6,
  LETTER_HZ: 520,
  LETTER_SPAN: 1.9, // pitch ratio from the first letter to the last
  LETTER_MS: 60,
  LETTER_GAIN: 0.45,
  LETTER_INK_RATIO: 1.5, // an inked tile ticks a fifth higher
  ITEM_HZ_PTS: 660,
  ITEM_HZ_MULT: 990,
  ITEM_MS: 180,
  ITEM_GAIN: 0.4,
  RULE_HZ: 1175,
  RULE_MS: 160,
  RULE_GAIN: 0.35,
  HIT_SUB_HZ: 55,
  HIT_MS: 320,
  HIT_GAIN: 0.9,
  HIT_NOISE_GAIN: 0.5,
  HIT_CHORD_HZ: 220, // the chord's root; size follows intensity
  RESOLVE_HZ: 262,
  RESOLVE_MS: 700,
  RESOLVE_GAIN: 0.35,
  RIFFLE_TAPS: 5,
  RIFFLE_MS: 160,
  RIFFLE_GAIN: 0.5,
  // page: a soft paper turn
  PAGE_TAPS: 3,
  PAGE_MS: 90,
  PAGE_GAIN: 0.3,
  PAGE_HZ: 3200,
};

export interface Sfx {
  out: GainNode;
  enabled: boolean;
  tick(pos: number, dir: number): void;
  shuffle(): void;
  thud(): void;
  coin(): void;
  shimmer(kind?: 'tl' | 'dw' | string): void;
  lock(intensity: number): void;
  letter(i: number, n: number, inked: boolean): void;
  item(kind: 'pts' | 'mult' | string): void;
  rule(): void;
  hit(intensity: number): void;
  resolve(): void;
  riffle(): void;
  page(): void;
  setEnabled(v: boolean): void;
  setLevel(v: number | null | undefined): void;
}

export function createSfx(
  ctx: AudioContext,
  destination: AudioNode,
  opts?: Partial<typeof SFX_DEFAULTS>,
): Sfx {
  const T = Object.assign({}, SFX_DEFAULTS, opts || {});
  const out = ctx.createGain();
  out.gain.value = T.LEVEL;
  out.connect(destination);
  let level = 1;
  const api = { out, enabled: true } as Sfx;

  let noiseBuf: AudioBuffer | null = null;
  function noise(): AudioBufferSourceNode {
    if (!noiseBuf) {
      const n = Math.floor(ctx.sampleRate * 0.5);
      noiseBuf = ctx.createBuffer(1, n, ctx.sampleRate);
      const d = noiseBuf.getChannelData(0);
      for (let i = 0; i < n; i++) d[i] = Math.random() * 2 - 1;
    }
    const src = ctx.createBufferSource();
    src.buffer = noiseBuf;
    return src;
  }
  function now(): number {
    return ctx.currentTime;
  }
  // An envelope gain: instant attack (<5 ms), exponential decay to silence.
  function env(
    gain: number,
    at: number,
    ms: number,
    attackMs?: number,
  ): GainNode {
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, at);
    g.gain.exponentialRampToValueAtTime(
      Math.max(0.0001, gain),
      at + (attackMs || 3) / 1000,
    );
    g.gain.exponentialRampToValueAtTime(0.0001, at + ms / 1000);
    g.connect(out);
    return g;
  }
  function tone(
    type: OscillatorType,
    hz: number,
    gain: number,
    at: number,
    ms: number,
    attackMs?: number,
  ) {
    const o = ctx.createOscillator();
    o.type = type;
    o.frequency.setValueAtTime(hz, at);
    o.connect(env(gain, at, ms, attackMs));
    o.start(at);
    o.stop(at + ms / 1000 + 0.02);
    return o;
  }
  function burst(hz: number, q: number, gain: number, at: number, ms: number) {
    const src = noise();
    const f = ctx.createBiquadFilter();
    f.type = 'bandpass';
    f.frequency.value = hz;
    f.Q.value = q;
    src.connect(f);
    f.connect(env(gain, at, ms));
    src.start(at);
    src.stop(at + ms / 1000 + 0.02);
  }
  function on(): boolean {
    if (!api.enabled) return false;
    if (ctx.state === 'suspended') ctx.resume().catch(() => {});
    return true;
  }

  // A wooden click: a short triangle with a pitch drop plus a noise tap.
  function click(hz: number, gain: number, at: number, ms: number) {
    const o = ctx.createOscillator();
    o.type = 'triangle';
    o.frequency.setValueAtTime(hz, at);
    o.frequency.exponentialRampToValueAtTime(hz * 0.6, at + ms / 1000);
    o.connect(env(gain, at, ms));
    o.start(at);
    o.stop(at + ms / 1000 + 0.02);
    burst(hz * 3, 2, gain * 0.5, at, Math.min(ms, 30));
  }

  api.tick = (pos, dir) => {
    if (!on()) return;
    let hz = T.TICK_HZ * Math.pow(T.TICK_STEP, Math.max(0, pos || 0));
    const g =
      dir < 0 ? T.TICK_DOWN_GAIN : dir === 0 ? T.TICK_DROP_GAIN : T.TICK_GAIN;
    if (dir < 0) hz *= 0.84;
    click(hz, g * level, now(), T.TICK_MS);
  };
  api.shuffle = () => {
    if (!on()) return;
    const t = now();
    for (let i = 0; i < T.SHUFFLE_TAPS; i++) {
      burst(
        1800 + i * 300,
        1.2,
        T.SHUFFLE_GAIN * level,
        t + (i * T.SHUFFLE_MS) / T.SHUFFLE_TAPS / 1000,
        40,
      );
    }
  };
  api.thud = () => {
    if (!on()) return;
    const t = now();
    const o = ctx.createOscillator();
    o.type = 'sine';
    o.frequency.setValueAtTime(T.THUD_HZ, t);
    o.frequency.exponentialRampToValueAtTime(
      T.THUD_HZ * 0.5,
      t + T.THUD_MS / 1000,
    );
    o.connect(env(T.THUD_GAIN * level, t, T.THUD_MS));
    o.start(t);
    o.stop(t + T.THUD_MS / 1000 + 0.02);
  };
  api.coin = () => {
    if (!on()) return;
    const t = now();
    tone('sine', T.COIN_HZ, T.COIN_GAIN * level, t, T.COIN_MS);
    tone(
      'sine',
      T.COIN_HZ * 1.5,
      T.COIN_GAIN * level,
      t + T.COIN_GAP_MS / 1000,
      T.COIN_MS,
    );
  };
  api.shimmer = (kind) => {
    if (!on()) return;
    const t = now();
    // A distinct shimmer per premium kind (NEXT_LEVEL_PLAN.md stage 5):
    // dl is the plain pair, tl adds a third voice a fifth above (three
    // letters, three notes), dw widens the detune into a fuller chord
    // (the whole word, not one tile). Any other caller (ink/étude use,
    // a crescendo opening) gets the plain pair, unchanged.
    if (kind === 'tl') {
      tone(
        'triangle',
        T.SHIMMER_HZ,
        T.SHIMMER_GAIN * level,
        t,
        T.SHIMMER_MS,
        8,
      );
      tone(
        'triangle',
        T.SHIMMER_HZ + T.SHIMMER_DETUNE,
        T.SHIMMER_GAIN * level,
        t,
        T.SHIMMER_MS,
        8,
      );
      tone(
        'triangle',
        T.SHIMMER_HZ * 1.5,
        T.SHIMMER_GAIN * level * 0.85,
        t,
        T.SHIMMER_MS,
        8,
      );
    } else if (kind === 'dw') {
      tone(
        'triangle',
        T.SHIMMER_HZ,
        T.SHIMMER_GAIN * level,
        t,
        T.SHIMMER_MS * 1.4,
        8,
      );
      tone(
        'triangle',
        T.SHIMMER_HZ + T.SHIMMER_DETUNE * 2.5,
        T.SHIMMER_GAIN * level,
        t,
        T.SHIMMER_MS * 1.4,
        8,
      );
      tone(
        'triangle',
        T.SHIMMER_HZ * 1.25,
        T.SHIMMER_GAIN * level * 0.7,
        t,
        T.SHIMMER_MS * 1.4,
        8,
      );
    } else {
      tone(
        'triangle',
        T.SHIMMER_HZ,
        T.SHIMMER_GAIN * level,
        t,
        T.SHIMMER_MS,
        8,
      );
      tone(
        'triangle',
        T.SHIMMER_HZ + T.SHIMMER_DETUNE,
        T.SHIMMER_GAIN * level,
        t,
        T.SHIMMER_MS,
        8,
      );
    }
  };

  // ---- Phase 4: the scoring cascade ----
  api.lock = (intensity) => {
    if (!on()) return;
    const k = 0.4 + 0.6 * (intensity || 0);
    const t = now();
    const o = ctx.createOscillator();
    o.type = 'sine';
    o.frequency.setValueAtTime(T.LOCK_HZ, t);
    o.frequency.exponentialRampToValueAtTime(
      T.LOCK_HZ * 0.55,
      t + T.LOCK_MS / 1000,
    );
    o.connect(env(T.LOCK_GAIN * k * level, t, T.LOCK_MS));
    o.start(t);
    o.stop(t + T.LOCK_MS / 1000 + 0.02);
  };
  api.letter = (i, n, inked) => {
    if (!on()) return;
    const f = n > 1 ? i / (n - 1) : 0;
    const hz =
      T.LETTER_HZ *
      Math.pow(T.LETTER_SPAN, f) *
      (inked ? T.LETTER_INK_RATIO : 1);
    click(hz, T.LETTER_GAIN * level, now(), T.LETTER_MS);
  };
  api.item = (kind) => {
    if (!on()) return;
    const hz = kind === 'mult' ? T.ITEM_HZ_MULT : T.ITEM_HZ_PTS;
    const t = now();
    // Marimba-ish: a sine with a quick, quieter octave partial.
    tone('sine', hz, T.ITEM_GAIN * level, t, T.ITEM_MS);
    tone('sine', hz * 2, T.ITEM_GAIN * 0.3 * level, t, T.ITEM_MS * 0.4);
  };
  api.rule = () => {
    if (!on()) return;
    const t = now();
    tone('triangle', T.RULE_HZ, T.RULE_GAIN * level, t, T.RULE_MS);
    tone(
      'triangle',
      T.RULE_HZ * 1.25,
      T.RULE_GAIN * level,
      t + 0.06,
      T.RULE_MS,
    );
  };
  api.hit = (intensity) => {
    if (!on()) return;
    const k = intensity || 0;
    const t = now();
    const ms = T.HIT_MS * (0.6 + 0.4 * k);
    const g = T.HIT_GAIN * (0.35 + 0.65 * k) * level;
    const sub = ctx.createOscillator();
    sub.type = 'sine';
    sub.frequency.setValueAtTime(T.HIT_SUB_HZ * 2, t);
    sub.frequency.exponentialRampToValueAtTime(T.HIT_SUB_HZ, t + 0.08);
    sub.connect(env(g, t, ms));
    sub.start(t);
    sub.stop(t + ms / 1000 + 0.02);
    burst(900, 0.7, T.HIT_NOISE_GAIN * (0.3 + 0.7 * k) * level, t, 90 + 90 * k);
    // The chord grows with the play: root, then fifth, octave, third, ninth.
    const ratios = [1, 1.5, 2, 2.5, 4.5];
    const voices = 1 + Math.round(k * (ratios.length - 1));
    for (let i = 0; i < voices; i++) {
      tone(
        'triangle',
        T.HIT_CHORD_HZ * ratios[i]!,
        g * 0.25,
        t + i * 0.012,
        ms * 0.9,
        6,
      );
    }
  };
  api.resolve = () => {
    if (!on()) return;
    const t = now();
    [1, 1.25, 1.5, 2].forEach((r, i) => {
      tone(
        'triangle',
        T.RESOLVE_HZ * r,
        T.RESOLVE_GAIN * level,
        t + i * 0.05,
        T.RESOLVE_MS,
        15,
      );
    });
  };
  api.riffle = () => {
    if (!on()) return;
    const t = now();
    for (let i = 0; i < T.RIFFLE_TAPS; i++) {
      burst(
        2400,
        1.5,
        T.RIFFLE_GAIN * level,
        t + (i * T.RIFFLE_MS) / T.RIFFLE_TAPS / 1000,
        30,
      );
    }
  };

  api.page = () => {
    if (!on()) return;
    const t = now();
    for (let i = 0; i < T.PAGE_TAPS; i++) {
      burst(
        T.PAGE_HZ,
        1.1,
        T.PAGE_GAIN * level,
        t + (i * T.PAGE_MS) / T.PAGE_TAPS / 1000,
        T.PAGE_MS,
      );
    }
  };

  api.setEnabled = (v) => {
    api.enabled = !!v;
  };
  api.setLevel = (v) => {
    level = Math.max(0, Math.min(1, v == null ? 1 : v));
  };
  return api;
}
