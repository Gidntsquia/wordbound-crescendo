// Owns the AudioContext/GainNode/Sfx/AudioPiece lifecycle: opening the
// device, rebuilding after a mobile browser CLOSES the context outright
// (iOS Safari after a few minutes backgrounded -- a closed context can
// never resume), the visibility/focus/gesture-driven resume, and playing
// or swapping the current recording. Extracted from FightScreen.tsx
// (READ_SLOWLY_PLAN.md A2 audio-lifecycle item) so FightScreen.tsx holds
// no AudioContext reference of its own; still tightly coupled to the
// mutable `fight` ref it's handed, so this is a lift-and-shift, not a
// redesign -- the mobile background/resume behaviour itself is unverified
// by anything automated and needs a real phone check (Waiting on Jaxon).
import { useCallback, useEffect, useRef } from 'react';
import { createSfx } from '../../audio/sfx';
import type { Sfx } from '../../audio/sfx';
import { createAudioPiece, prefetchAudio } from '../../audio/recordingPlayer';
import type { AudioPiece, RecordedPiece } from '../../audio/recordingPlayer';
import type { Fight } from '../../app/store';

declare global {
  interface Window {
    webkitAudioContext?: typeof AudioContext;
  }
}

function errMessage(err: unknown): string {
  return err instanceof Error
    ? err.message
    : typeof err === 'string'
      ? err
      : String(err);
}

export interface AudioHandles {
  ctx: AudioContext;
  gain: GainNode;
  sfx: Sfx;
}

export function useAudio(
  fight: React.RefObject<Fight | null>,
  volumeRef: React.RefObject<number>,
  sfxOnRef: React.RefObject<boolean>,
  say: (line: string) => void,
) {
  const onCtxStateChangeRef = useRef<() => void>(() => {});

  const openAudio = useCallback((): AudioHandles | null => {
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)!();
      const gain = ctx.createGain();
      gain.connect(ctx.destination);
      gain.gain.value = volumeRef.current;
      const sfx = createSfx(ctx, ctx.destination);
      sfx.setLevel(volumeRef.current);
      sfx.setEnabled(sfxOnRef.current);
      ctx.onstatechange = () => onCtxStateChangeRef.current();
      return { ctx, gain, sfx };
    } catch {
      return null;
    }
  }, [volumeRef, sfxOnRef]);

  // Plays `piece` on `ctx`/`gain`, looping and re-narrating on load failure,
  // same as the previous inline logic in start()/startStage()/rebuildClosed().
  const playPiece = useCallback(
    (
      ctx: AudioContext,
      gain: GainNode,
      piece: RecordedPiece,
      opts?: { fadeIn?: number },
    ): AudioPiece => {
      const seq = createAudioPiece(ctx, gain, piece);
      seq.on('load-failed', (err) =>
        say(
          'The recording did not load (' +
            errMessage(err) +
            ') — Restart to try again.',
        ),
      );
      seq.on('piece-ended', () => {
        const g = fight.current;
        if (!g || g.seq !== seq) return;
        seq.stop();
        seq.play();
      });
      seq.play();
      if (opts?.fadeIn)
        seq.whenReady?.then(() => {
          if (fight.current?.seq === seq) seq.fadeIn(opts.fadeIn!);
        });
      return seq;
    },
    [fight, say],
  );

  // Mobile browsers suspend the AudioContext when the tab is backgrounded and
  // do not always resume it on their own when it comes back to the
  // foreground -- leaving both music and sfx silent until the player
  // manually restarts the run. Resume on return to visibility instead.
  useEffect(() => {
    const rebuildClosed = () => {
      const f = fight.current;
      if (!f || !f.ctx || f.ctx.state !== 'closed') return;
      const opened = openAudio();
      if (!opened) return;
      const { ctx, gain, sfx } = opened;
      let seq: AudioPiece | null = null;
      if (f.piece) {
        seq = playPiece(ctx, gain, f.piece);
      }
      fight.current = { ...f, ctx, gain, sfx, seq };
      if (seq)
        say(
          'The soundtrack dropped out while the tab was in the background — restarted.',
        );
    };
    const tryResume = () => {
      const ctx = fight.current?.ctx;
      if (ctx && ctx.state === 'closed') {
        rebuildClosed();
        return;
      }
      if (ctx && ctx.state !== 'running') {
        ctx.resume().catch(() => {});
      }
    };
    const onVisible = () => {
      if (document.visibilityState !== 'visible') return;
      tryResume();
    };
    // Event-driven, not polled: the AudioContext itself fires 'statechange'
    // the instant the browser suspends/closes it (or lets it resume), so
    // reacting there catches it immediately with no interval tick to wait
    // out. onCtxStateChangeRef is called from ctx.onstatechange, wired at
    // every place a context gets created (this effect doesn't own that
    // object -- openAudio()/rebuildClosed() each make their own).
    onCtxStateChangeRef.current = () => {
      if (document.visibilityState === 'visible') tryResume();
    };
    document.addEventListener('visibilitychange', onVisible);
    window.addEventListener('focus', onVisible);
    window.addEventListener('pageshow', onVisible);
    // A tab backgrounded for a few minutes can leave some mobile browsers
    // (Firefox on Android in particular) refusing resume() unless it rides
    // on an actual user gesture -- visibilitychange/statechange alone does
    // not count. The player's first tap back on the page doubles as that
    // gesture. Capture phase, not bubble: most taps land on a disabled
    // <button> (Play/Swap/tiles mid-scoring) whose pointerdown never
    // bubbles to document, so a bubble-phase listener alone misses most
    // real taps.
    document.addEventListener('pointerdown', tryResume, true);
    document.addEventListener('touchstart', tryResume, true);
    return () => {
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener('focus', onVisible);
      window.removeEventListener('pageshow', onVisible);
      document.removeEventListener('pointerdown', tryResume, true);
      document.removeEventListener('touchstart', tryResume, true);
    };
  }, [fight, openAudio, playPiece, say]);

  // Warm the recording for an enemy (bytes only; the decode waits for the
  // fight). Nine excerpts are ~25 MB, too much to pull up front on a phone,
  // so only the enemy on stage and the one after it are warmed.
  const warm = useCallback((piece: RecordedPiece | undefined) => {
    if (piece && piece.audio) prefetchAudio(piece.audio).catch(() => {});
  }, []);

  return { openAudio, playPiece, warm };
}
