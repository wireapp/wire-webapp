import {render, screen, within, waitFor} from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import {ParticipantNetworkStats, ParticipantNetworkStatsProvider} from './ParticipantNetworkStats';
import type {ParticipantNetworkSample} from '../../repositories/calling/participantNetworkStats';

const selfSample: ParticipantNetworkSample = {
  receivedAt: 1000,
  quality: 1,
  rttMs: 24,
  peer: 'Server',
  connection: {candidate: 'Relay', protocol: 'UDP', local_proto: 'TLS', local_cand: 'Relay'},
  audio: [{bitrate: 32000, jitter: 3, loss: 0}],
  video: [{bitrate: 1240000, jitter: 8, loss: 0, width: 1280, height: 720, fps: 30}],
};
const peerSample: ParticipantNetworkSample = {
  receivedAt: 1000,
  quality: null,
  rttMs: null,
  audio: [{bitrate: 32000, jitter: 5, loss: 0}],
  video: [{bitrate: 1080000, jitter: 12, loss: 0.12, width: 1280, height: 720, fps: 30}],
};

describe('participant network statistics preview', () => {
  const renderStats = (): void => {
    render(
      <ParticipantNetworkStatsProvider>
        <ParticipantNetworkStats name="Me" isSelf variant="toolbar" sample={selfSample} />
        <ParticipantNetworkStats name="Alice" isSelf={false} sample={peerSample} />
      </ParticipantNetworkStatsProvider>,
    );
  };

  it('shows live per-participant values and only one panel at a time', async () => {
    const user = userEvent.setup();
    renderStats();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', {name: 'My connection statistics'}));
    expect(within(screen.getByRole('dialog')).getByText('My connection')).toBeInTheDocument();
    expect(within(screen.getByRole('dialog')).getByText('1.24 Mbit/s')).toBeInTheDocument();
    expect(within(screen.getByRole('dialog')).getByText('TURN relay')).toBeInTheDocument();
    expect(within(screen.getByRole('dialog')).getByText('TLS')).toBeInTheDocument();
    await user.click(screen.getByRole('button', {name: 'Network statistics for Alice'}));
    expect(screen.getAllByRole('dialog')).toHaveLength(1);
    expect(screen.getByRole('dialog', {name: 'Network statistics for Alice'})).toBeInTheDocument();
    expect(within(screen.getByRole('dialog')).getByText('1.08 Mbit/s')).toBeInTheDocument();
    expect(within(screen.getByRole('dialog')).getByText('0.12%')).toBeInTheDocument();
    expect(within(screen.getByRole('dialog')).queryByText('24 ms')).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', {name: 'Close network statistics'}));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('shows waiting and unavailable values instead of fabricated statistics', async () => {
    const user = userEvent.setup();
    const view = render(<ParticipantNetworkStats name="Me" isSelf variant="toolbar" />);
    await user.click(screen.getByRole('button', {name: 'My connection statistics'}));
    expect(screen.getByRole('status')).toHaveTextContent('Waiting for AVS statistics');
    view.rerender(
      <ParticipantNetworkStats
        name="Me"
        isSelf
        variant="toolbar"
        sample={{
          ...selfSample,
          quality: 3,
          rttMs: null,
          video: [{bitrate: -1, jitter: -1, loss: -1, width: 0, height: 0, fps: -1}],
        }}
      />,
    );
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
    expect(screen.getByText('Poor')).toBeInTheDocument();
    expect(within(screen.getByRole('region', {name: 'Video statistics'})).getAllByText('—')).toHaveLength(5);
    expect(screen.queryByText('-1%')).not.toBeInTheDocument();
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

  it('shows separate received video tracks without inventing an aggregate', async () => {
    const user = userEvent.setup();
    render(
      <ParticipantNetworkStats
        name="Alice"
        isSelf={false}
        sample={{
          ...peerSample,
          video: [...peerSample.video, {bitrate: 420000, jitter: 20, loss: 1, width: 640, height: 360, fps: 15}],
        }}
      />,
    );
    await user.click(screen.getByRole('button', {name: 'Network statistics for Alice'}));
    expect(screen.getByText('Video · Track 1')).toBeInTheDocument();
    expect(screen.getByText('Video · Track 2')).toBeInTheDocument();
    expect(screen.getByText('420 kbit/s')).toBeInTheDocument();
    expect(screen.getByText('640 × 360')).toBeInTheDocument();
  });
});
