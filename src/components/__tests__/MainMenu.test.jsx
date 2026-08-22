import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import MainMenu from '../MainMenu.jsx';

describe('MainMenu', () => {
  it('renders the title, version, and both nav buttons', () => {
    render(<MainMenu onNewRun={() => {}} onHowToPlay={() => {}} />);
    expect(screen.getByText('WORDBOUND: CRESCENDO')).toBeInTheDocument();
    expect(screen.getByText('v0.3')).toBeInTheDocument();
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
