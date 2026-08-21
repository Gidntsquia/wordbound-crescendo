import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import CharacterSelect from '../CharacterSelect.jsx';

describe('CharacterSelect', () => {
  it('renders one option per real character from window.Wordbound.Characters', () => {
    const Characters = window.Wordbound.Characters;
    render(<CharacterSelect onSelect={() => {}} onBack={() => {}} />);
    Characters.getCharacterIds().forEach((id) => {
      const def = Characters.getCharacter(id);
      expect(screen.getByText(def.name)).toBeInTheDocument();
      expect(screen.getByText(def.description)).toBeInTheDocument();
    });
  });

  it('calls onSelect with the clicked character id and the typed seed', async () => {
    const Characters = window.Wordbound.Characters;
    const firstId = Characters.getCharacterIds()[0];
    const firstDef = Characters.getCharacter(firstId);
    const onSelect = vi.fn();
    const user = userEvent.setup();
    render(<CharacterSelect onSelect={onSelect} onBack={() => {}} />);
    await user.type(screen.getByLabelText('Seed (optional)'), 'my-test-seed');
    await user.click(screen.getByText(firstDef.name));
    expect(onSelect).toHaveBeenCalledWith(firstId, 'my-test-seed');
  });

  it('is keyboard-activatable (Enter) as well as clickable', async () => {
    const Characters = window.Wordbound.Characters;
    const firstId = Characters.getCharacterIds()[0];
    const firstDef = Characters.getCharacter(firstId);
    const onSelect = vi.fn();
    const user = userEvent.setup();
    render(<CharacterSelect onSelect={onSelect} onBack={() => {}} />);
    screen.getByText(firstDef.name).closest('[role="button"]').focus();
    await user.keyboard('{Enter}');
    expect(onSelect).toHaveBeenCalledWith(firstId, '');
  });

  it('calls onBack when Back to Menu is clicked', async () => {
    const onBack = vi.fn();
    const user = userEvent.setup();
    render(<CharacterSelect onSelect={() => {}} onBack={onBack} />);
    await user.click(screen.getByRole('button', { name: 'Back to Menu' }));
    expect(onBack).toHaveBeenCalledTimes(1);
  });
});
