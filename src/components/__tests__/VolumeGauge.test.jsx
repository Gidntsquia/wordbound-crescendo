import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { VolumeGauge } from '../VolumeGauge.jsx';

// DUEL-GAUGE COMBAT ticket (GOALS.md): drives the REAL js/wordbound/duel.js
// engine (window.Wordbound.Duel, wired by src/test/setup.js) through
// duel.tick()/applyPlayerPush()/registerCrescendoPeak()/attemptParry() and
// asserts on the real resulting DOM -- no mocked duel-shaped fixture, same
// "drive the real engine" convention every other src/components/__tests__
// suite already follows. `now`/`dt` are plain numbers duel.js takes directly
// (no real timers, no AudioContext, per duel.test.js's own precedent), so
// this stays fully synchronous.
const Duel = window.Wordbound.Duel;

describe('VolumeGauge', () => {
  it('renders centered with a full Verses row and no warnings at duel start', () => {
    const duel = Duel.create({ stageTier: 'mid', healthBlocks: 5 });
    render(<VolumeGauge duel={duel} now={0} />);

    const meter = screen.getByRole('meter', { name: 'The Volume' });
    expect(meter).toHaveAttribute('aria-valuenow', String(Duel.GAUGE_CENTER));
    expect(screen.getByLabelText('5 of 5 Verses remaining')).toBeInTheDocument();
    expect(document.querySelectorAll('.verse-pip-filled')).toHaveLength(5);
    expect(document.querySelectorAll('.verse-pip-lost')).toHaveLength(0);
    expect(screen.queryByText(/Crescendo in/)).not.toBeInTheDocument();
    expect(screen.queryByText(/Grace period/)).not.toBeInTheDocument();
    // A regular (pushesToDefeat: 1, the create() default) still gets a
    // segmented enemy bar -- one pip, since one push IS its whole health.
    expect(screen.getByLabelText('1 of 1 enemy segments remaining')).toBeInTheDocument();
    expect(document.querySelectorAll('.enemy-segment-pip-filled')).toHaveLength(1);
    expect(document.querySelectorAll('.enemy-segment-pip-lost')).toHaveLength(0);
  });

  it('leans the fill toward the danger side as real music push drives the gauge down', () => {
    const duel = Duel.create({ stageTier: 'final', healthBlocks: 5 });
    duel.tick(0, 1, 1); // one real second at max intensity, final tier -- pushes toward
    // GAUGE_MIN but deliberately stays short of it (25 points off a push rate of
    // STAGE_TIER_BASE_PUSH.final=9 + 1*INTENSITY_PUSH_SCALE=16), so this exercises
    // the "leaning" fill state, not a block loss (covered by its own test below).
    expect(duel.gauge).toBeGreaterThan(Duel.GAUGE_MIN);
    expect(duel.gauge).toBeLessThan(Duel.GAUGE_CENTER);
    expect(duel.healthBlocks).toBe(5); // confirms no block was lost this tick

    render(<VolumeGauge duel={duel} now={1} />);
    const fill = document.querySelector('.volume-gauge-fill');
    expect(fill).toHaveClass('volume-gauge-fill-danger');
    expect(screen.getByRole('meter')).toHaveAttribute('aria-valuenow', String(Math.round(duel.gauge)));
  });

  it('leans the fill toward the safe side after a real player push', () => {
    const duel = Duel.create({ stageTier: 'early', healthBlocks: 5 });
    duel.applyPlayerPush(0, 20); // a real ~20-point word, per Duel.WORD_PUSH_SCALE
    expect(duel.gauge).toBeGreaterThan(Duel.GAUGE_CENTER);

    render(<VolumeGauge duel={duel} now={0} />);
    expect(document.querySelector('.volume-gauge-fill')).toHaveClass('volume-gauge-fill-safe');
  });

  it('shows the grace-period state and a distinct track style while real i-frames are active', () => {
    const duel = Duel.create({ stageTier: 'final', healthBlocks: 5 });
    // Drive a real block loss: enough ticks at max push to bottom out the gauge.
    duel.tick(0, 10, 1);
    expect(duel.healthBlocks).toBe(4);
    expect(duel.isIframeActive(0.1)).toBe(true);

    const { rerender } = render(<VolumeGauge duel={duel} now={0.1} />);
    expect(screen.getByText("Grace period -- the music can't touch you")).toBeInTheDocument();
    expect(document.querySelector('.volume-gauge-track')).toHaveClass('volume-gauge-iframe');
    expect(document.querySelectorAll('.verse-pip-lost')).toHaveLength(1);

    // And the grace state clears once real i-frames actually expire.
    const afterIframes = duel.iframeUntil + 0.01;
    rerender(<VolumeGauge duel={duel} now={afterIframes} />);
    expect(screen.queryByText("Grace period -- the music can't touch you")).not.toBeInTheDocument();
    expect(document.querySelector('.volume-gauge-track')).not.toHaveClass('volume-gauge-iframe');
  });

  it('surfaces a real parry and shows a real boss enemy-segment bar (pushesToDefeat > 1)', () => {
    const duel = Duel.create({ stageTier: 'final', healthBlocks: 5, pushesToDefeat: 4 });
    duel.registerCrescendoPeak(5.0);
    const parried = duel.attemptParry(5.05); // within the real PARRY_WINDOW_SEC
    expect(parried).toBe(true);

    render(<VolumeGauge duel={duel} now={5.05} approachingCrescendoSecondsAway={3.2} />);
    expect(document.querySelector('.volume-gauge-fill')).toHaveClass('volume-gauge-parried');
    expect(screen.getByText('Crescendo in 3.2s')).toBeInTheDocument();
    expect(screen.getByLabelText('4 of 4 enemy segments remaining')).toBeInTheDocument();
    expect(document.querySelectorAll('.enemy-segment-pip-filled')).toHaveLength(4);
    expect(document.querySelectorAll('.enemy-segment-pip-lost')).toHaveLength(0);
  });

  it('drops one enemy segment pip per real won push', () => {
    const duel = Duel.create({ stageTier: 'early', healthBlocks: 5, pushesToDefeat: 3 });
    duel.applyPlayerPush(0, 100); // a real push win (score >> GAUGE_MAX - GAUGE_CENTER)
    expect(duel.pushesWon).toBe(1);

    render(<VolumeGauge duel={duel} now={0} />);
    expect(screen.getByLabelText('2 of 3 enemy segments remaining')).toBeInTheDocument();
    expect(document.querySelectorAll('.enemy-segment-pip-filled')).toHaveLength(2);
    expect(document.querySelectorAll('.enemy-segment-pip-lost')).toHaveLength(1);
  });
});
