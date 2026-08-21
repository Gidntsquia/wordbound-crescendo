import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import HowToPlayOverlay from '../HowToPlayOverlay.jsx';

describe('HowToPlayOverlay', () => {
  it('carries the hidden class when closed', () => {
    render(<HowToPlayOverlay open={false} onClose={() => {}} />);
    expect(document.getElementById('howto-overlay')).toHaveClass('hidden');
  });

  it('drops the hidden class and shows content when open', () => {
    render(<HowToPlayOverlay open onClose={() => {}} />);
    expect(document.getElementById('howto-overlay')).not.toHaveClass('hidden');
    expect(screen.getByText('How to Play')).toBeInTheDocument();
  });

  it('calls onClose when "Got it" is clicked', async () => {
    const onClose = vi.fn();
    const user = userEvent.setup();
    render(<HowToPlayOverlay open onClose={onClose} />);
    await user.click(screen.getByRole('button', { name: 'Got it' }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
