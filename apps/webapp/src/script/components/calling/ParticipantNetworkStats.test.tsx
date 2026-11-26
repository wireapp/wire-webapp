import {render, screen, within, waitFor} from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import {ParticipantNetworkStats, ParticipantNetworkStatsProvider} from './ParticipantNetworkStats';

describe('participant network statistics preview', () => {
  const renderStats = (): void => {
    render(
      <ParticipantNetworkStatsProvider>
        <ParticipantNetworkStats name="Me" isSelf variant="toolbar" />
        <ParticipantNetworkStats name="Alice" isSelf={false} />
      </ParticipantNetworkStatsProvider>,
    );
  };

  it('shows per-participant dummy values and only one panel at a time', async () => {
    const user = userEvent.setup();
    renderStats();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', {name: 'My connection statistics'}));
    expect(within(screen.getByRole('dialog')).getByText('My connection')).toBeInTheDocument();
    expect(within(screen.getByRole('dialog')).getByText('1.24 Mbit/s')).toBeInTheDocument();
    expect(within(screen.getByRole('dialog')).getByText(/Demo data/)).toBeInTheDocument();
    await user.click(screen.getByRole('button', {name: 'Network statistics for Alice'}));
    expect(screen.getAllByRole('dialog')).toHaveLength(1);
    expect(screen.getByRole('dialog', {name: 'Network statistics for Alice'})).toBeInTheDocument();
    expect(within(screen.getByRole('dialog')).getByText('1.08 Mbit/s')).toBeInTheDocument();
    await user.click(screen.getByRole('button', {name: 'Close network statistics'}));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('opens with the keyboard, closes on Escape and restores focus', async () => {
    const user = userEvent.setup();
    renderStats();
    const trigger = screen.getByRole('button', {name: 'My connection statistics'});
    await user.tab();
    await user.keyboard('{Enter}');
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    await user.keyboard('{Escape}');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    await waitFor(() => {
      expect(trigger).toHaveFocus();
    });
  });
});
