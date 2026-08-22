import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import MainMenu from '../MainMenu.jsx';

describe('MainMenu', () => {
  it('renders the title, version, and both nav buttons', () => {
    render(<MainMenu onNewRun={() => {}} onHowToPlay={() => {}} />);
    expect(screen.getByText('WORDBOUND: CRESCENDO')).toBeInTheDocument();
    expect(screen.getByText('v0.7')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'New Run' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'How to Play' })).toBeInTheDocument();
  });

  it('calls onNewRun when New Run is clicked', async () => {
    const onNewRun = vi.fn();
    const user = userEvent.setup();
    render(<MainMenu onNewRun={onNewRun} onHowToPlay={() => {}} />);
    await user.click(screen.getByRole('button', { name: 'New Run' }));
    expect(onNewRun).toHaveBeenCalledTimes(1);
  });

  it('calls onHowToPlay when How to Play is clicked', async () => {
    const onHowToPlay = vi.fn();
    const user = userEvent.setup();
    render(<MainMenu onNewRun={() => {}} onHowToPlay={onHowToPlay} />);
    await user.click(screen.getByRole('button', { name: 'How to Play' }));
    expect(onHowToPlay).toHaveBeenCalledTimes(1);
  });

  it('reads real achievement progress off window.Wordbound.Achievements', () => {
    const Achievements = window.Wordbound.Achievements;
    const totalCount = Object.keys(Achievements.ACHIEVEMENTS).length;
    render(<MainMenu onNewRun={() => {}} onHowToPlay={() => {}} />);
    // Fresh jsdom localStorage each test file run -> nothing unlocked yet.
    expect(screen.getByText(`Achievements unlocked: 0 / ${totalCount}`)).toBeInTheDocument();
  });
});

// STOLEN LETTERS META-PROGRESSION ticket (GOALS.md): the main menu's
// Alphabet display, reading the real window.Wordbound.StolenLetters module
// (see its own header for the starting-set/recovery-mapping reasoning).
// StolenLetters.reset() at the start of each test guarantees isolation --
// it's a real module-level singleton, shared across every test in this
// file (Vitest's jsdom environment is per-FILE, not per-test).
describe('AlphabetDisplay', () => {
  const StolenLetters = window.Wordbound.StolenLetters;

  it('renders all 26 letters, styling the 8 starting-stolen ones as locked', () => {
    StolenLetters.reset();
    render(<MainMenu onNewRun={() => {}} onHowToPlay={() => {}} />);
    expect(screen.getByText('The Alphabet')).toBeInTheDocument();
    'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('').forEach((letter) => {
      const el = screen.getByText(letter, { selector: '.alphabet-letter' });
      const stolen = StolenLetters.STARTING_STOLEN.indexOf(letter) !== -1;
      expect(el.className.includes('alphabet-letter-stolen')).toBe(stolen);
      expect(el.className.includes('alphabet-letter-recovered')).toBe(false); // nothing recovered yet
    });
  });

  it('re-renders a recovered letter as highlighted, not locked', () => {
    StolenLetters.reset();
    StolenLetters.recoverByBossDefId('boss_vowelmaw'); // recovers K, per stolenLetters.js's own mapping
    render(<MainMenu onNewRun={() => {}} onHowToPlay={() => {}} />);
    const k = screen.getByText('K', { selector: '.alphabet-letter' });
    expect(k.className.includes('alphabet-letter-recovered')).toBe(true);
    expect(k.className.includes('alphabet-letter-stolen')).toBe(false);
    // An untouched stolen letter (Z, the Maestro's hostage) stays locked.
    const z = screen.getByText('Z', { selector: '.alphabet-letter' });
    expect(z.className.includes('alphabet-letter-stolen')).toBe(true);
    StolenLetters.reset();
  });

  it('recovered letters persist across a real simulated reload (real localStorage, not jsdom\'s file:// limitation dom-check.js hits)', () => {
    StolenLetters.reset();
    StolenLetters.recoverByBossDefId('boss_sovereign'); // recovers V
    // Simulate a fresh page load: a NEW in-memory state that only knows
    // what loadProgress() reads back from the SAME real localStorage.
    StolenLetters.reset(); // also clears localStorage -- re-seed it directly, as if from a prior real session
    window.localStorage.setItem('wordbound_stolen_letters_v1', JSON.stringify({ V: true }));
    StolenLetters.loadProgress();
    expect(StolenLetters.isStolen('V')).toBe(false);
    expect(StolenLetters.isStolen('K')).toBe(true); // untouched, still stolen
    StolenLetters.reset();
  });
});
