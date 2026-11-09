/*
 * Wire
 * Copyright (C) 2026 Wire Swiss GmbH
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program. If not, see http://www.gnu.org/licenses/.
 *
 */

import {createDeterministicClock} from '@enormora/clock/deterministic-clock';
import {act, fireEvent, render, screen, type RenderResult} from '@testing-library/react';
import {Maybe} from 'true-myth';

import type {ConnectionTestResult} from '@wireapp/avs';
import {ThemeProvider} from '@wireapp/react-ui-kit';

import {
  createTroubleshooterRepository,
  type TroubleshooterRepository,
} from '../../../../repositories/troubleshooter/troubleshooterRepository';
import {
  createAvsTroubleshooterService,
  createMockTroubleshooterService,
  MOCK_CONNECTION_DELAY_MILLISECONDS,
  MOCK_SCAN_DELAY_MILLISECONDS,
  type TroubleshooterService,
} from '../../../../repositories/troubleshooter/troubleshooterService';
import {Config} from '../../../../Config';
import {
  createRootContextValueForTest,
  createRootProviderWrapperForTest,
} from '../../../testSupport/rootContextTestSupport';
import * as clipboard from '../../../../util/clipboardUtil';
import * as utilities from '../../../../util/util';
import {translateForTest} from '../../../../util/test/translateForTest';

import {TroubleshootingPreferences} from './troubleshootingPreferences';

const setup = (
  service?: TroubleshooterService,
): RenderResult & {
  clock: ReturnType<typeof createDeterministicClock>;
  repository: TroubleshooterRepository;
} => {
  const clock = createDeterministicClock({initialUnixEpochMicroseconds: 0n});
  const repository = createTroubleshooterRepository(service ?? createMockTroubleshooterService(clock), clock);
  const wrapper = createRootProviderWrapperForTest(createRootContextValueForTest({clock, translate: translateForTest}));
  const view = render(
    <ThemeProvider>
      <TroubleshootingPreferences repository={repository} />
    </ThemeProvider>,
    {wrapper},
  );
  return {clock, repository, ...view};
};

describe('TroubleshootingPreferences', () => {
  beforeEach(() => {
    const config = Config.getConfig();
    jest.spyOn(Config, 'getConfig').mockReturnValue({...config, BRAND_NAME: 'Wire', VERSION: 'test-version'});
  });
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('keeps the failed AVS step visible and enables retry', async () => {
    const pending = Promise.withResolvers<ConnectionTestResult>();
    const candidates = {localCandidateFound: true, relayCandidateFound: false};
    const service = createAvsTroubleshooterService(
      onProgress => {
        onProgress({step: 'ice_gathering_finished', status: 'ok', candidates});
        return pending.promise.catch((error: unknown) => {
          onProgress({step: 'connected', status: 'error', candidates, error: 'Setup failed'});
          throw error;
        });
      },
      async () => {
        return {schemaVersion: 1, runs: []};
      },
    );
    setup(service);
    fireEvent.click(screen.getByRole('button', {name: 'troubleshooter.testConnection'}));
    expect(screen.getByRole('progressbar')).toHaveAttribute('value', '1');
    expect(screen.getByText('troubleshooter.connectionStep.connected').closest('li')).toHaveAttribute(
      'aria-current',
      'step',
    );
    await act(async () => {
      pending.reject(new Error('Setup failed'));
    });
    expect(screen.getByText('Setup failed')).toBeVisible();
    expect(screen.getByText('troubleshooter.connectionFailed')).toBeVisible();
    expect(screen.getByRole('button', {name: 'troubleshooter.testConnection'})).toBeEnabled();
  });

  it.each([
    {rtt: 42, jitter: null, loss: 0, expected: 'status.good'},
    {rtt: 50, jitter: 9, loss: 0, expected: 'qualityFair'},
    {rtt: 150, jitter: 50, loss: 10, expected: 'qualityFair'},
    {rtt: 42, jitter: 51, loss: 0, expected: 'qualityPoor'},
    {rtt: 42, jitter: 0, loss: 11, expected: 'qualityPoor'},
  ])('shows quality $expected for RTT $rtt, jitter $jitter, and loss $loss', async ({rtt, jitter, loss, expected}) => {
    const service = createAvsTroubleshooterService(
      async onProgress => {
        const candidates = {localCandidateFound: true, relayCandidateFound: false};
        for (const step of ['ice_gathering_finished', 'connected', 'media_flow', 'measurement_finished'] as const) {
          onProgress({step, status: 'ok', candidates});
        }
        return {
          measurementDurationMs: 20_000,
          device: {status: 'ok', microphone: 'ready', localCandidates: []},
          network: {
            status: 'ok',
            selectedCandidateProtocol: 'udp',
            roundTripTimeMs: rtt,
            jitterMs: jitter,
            packetLossPercent: loss,
          },
          wireServer: {
            status: 'ok',
            target: 'sft',
            connectionStatus: 'connected',
            route: 'direct',
            failureReason: null,
          },
        };
      },
      async () => {
        return {schemaVersion: 1, runs: []};
      },
    );
    setup(service);
    await act(async () => {
      fireEvent.click(screen.getByRole('button', {name: 'troubleshooter.testConnection'}));
    });
    expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
    expect(screen.getByText('troubleshooter.connectionMicrophoneReady')).toBeInTheDocument();
    expect(screen.getByText('troubleshooter.connectionSft')).toBeInTheDocument();
    expect(screen.getByText('troubleshooter.group.quality.title').closest('summary')).toHaveTextContent(
      `troubleshooter.${expected}`,
    );
    expect(screen.getByText(`${rtt} ms`)).toBeInTheDocument();
    expect(screen.getByText(`${loss} %`)).toBeInTheDocument();
  });

  it('starts results collapsed and resets them when leaving troubleshooting', async () => {
    const {clock, unmount, repository} = setup();
    expect(screen.queryByText('troubleshooter.warningTitle')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', {name: 'troubleshooter.testConnection'}));
    expect(screen.getByRole('button', {name: 'troubleshooter.runScan'})).toBeDisabled();
    expect(screen.getByText('troubleshooter.testing')).toBeInTheDocument();
    await act(async () => {
      clock.advanceByMilliseconds(MOCK_CONNECTION_DELAY_MILLISECONDS);
    });
    expect(screen.getByText('troubleshooter.warningTitle')).toBeInTheDocument();
    expect(screen.getByRole('button', {name: 'troubleshooter.testAgain'})).toBeEnabled();
    const quality = screen.getByText('troubleshooter.group.quality.title').closest('summary');
    expect(quality?.closest('section')).toHaveAttribute('aria-labelledby', 'connection-test-title');
    expect(quality?.closest('details')).not.toHaveAttribute('open');
    if (quality) {
      fireEvent.click(quality);
    }
    expect(quality?.closest('details')).toHaveAttribute('open');
    expect(screen.getByText('42 ms')).toBeVisible();
    fireEvent.click(screen.getByRole('button', {name: 'troubleshooter.runScan'}));
    await act(async () => {
      clock.advanceByMilliseconds(MOCK_SCAN_DELAY_MILLISECONDS);
    });
    expect(screen.getByText('troubleshooter.check.udp.title')).toBeInTheDocument();
    expect(screen.getByRole('button', {name: 'troubleshooter.scanAgain'})).toBeEnabled();
    const networkSummary = screen.getByText('troubleshooter.group.network.title').closest('summary');
    expect(networkSummary?.closest('details')).not.toHaveAttribute('open');
    if (networkSummary) {
      fireEvent.click(networkSummary);
    }
    expect(networkSummary?.closest('details')).toHaveAttribute('open');
    fireEvent.click(screen.getByRole('button', {name: 'troubleshooter.scanAgain'}));
    await act(async () => {
      clock.advanceByMilliseconds(MOCK_SCAN_DELAY_MILLISECONDS);
    });
    expect(screen.getByText('troubleshooter.group.network.title').closest('details')).not.toHaveAttribute('open');
    unmount();
    const wrapper = createRootProviderWrapperForTest(
      createRootContextValueForTest({clock, translate: translateForTest}),
    );
    render(
      <ThemeProvider>
        <TroubleshootingPreferences repository={repository} />
      </ThemeProvider>,
      {wrapper},
    );
    expect(screen.queryByText('troubleshooter.warningTitle')).not.toBeInTheDocument();
    expect(screen.queryByText('troubleshooter.group.network.title')).not.toBeInTheDocument();
    expect(screen.getByRole('button', {name: 'troubleshooter.testConnection'})).toBeEnabled();
    expect(screen.getByRole('button', {name: 'troubleshooter.runScan'})).toBeEnabled();
  });

  it('copies and saves the shared simulated report', async () => {
    const copied = jest.spyOn(clipboard, 'copyText').mockResolvedValue();
    const saved = jest.spyOn(utilities, 'downloadBlob').mockReturnValue(0);
    const {clock} = setup();
    fireEvent.click(screen.getByRole('button', {name: 'troubleshooter.testConnection'}));
    await act(async () => {
      clock.advanceByMilliseconds(MOCK_CONNECTION_DELAY_MILLISECONDS);
    });
    await act(async () => {
      fireEvent.click(screen.getByRole('button', {name: 'troubleshooter.copyResults'}));
    });
    expect(JSON.parse(copied.mock.calls[0][0])).toMatchObject({simulated: true, version: 'test-version'});
    expect(screen.getByText('troubleshooter.copied')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', {name: 'troubleshooter.saveReport'}));
    expect(saved).toHaveBeenCalledWith(expect.any(Blob), 'troubleshooting-report.json');
  });

  it('shows missing checks as neutral results instead of hiding them', () => {
    const {repository} = setup();
    act(() => {
      repository.store.setState({scan: Maybe.just({data: {checks: []}, completedAt: 0, durationMilliseconds: 0})});
    });
    expect(screen.getByText('troubleshooter.reachabilityPreview.unknown')).toBeInTheDocument();
    expect(screen.getByText('troubleshooter.check.sft.title').closest('li')).toHaveTextContent(
      'troubleshooter.reachabilityPreview.notTested',
    );
    expect(screen.queryByText('troubleshooter.status.good')).not.toBeInTheDocument();
    expect(screen.queryByText('troubleshooter.status.allowed')).not.toBeInTheDocument();
  });

  it('shows local addresses and a TCP relay without treating the relay address as public', () => {
    const {repository} = setup();
    const serverUrl = 'turn:relay.example.invalid:3478?transport=tcp';
    act(() => {
      repository.store.setState({
        scan: Maybe.just({
          completedAt: 0,
          durationMilliseconds: 180,
          data: {
            checks: [],
            report: {
              schemaVersion: 1,
              runs: [
                {
                  serverUrl,
                  requestedTransport: 'tcp',
                  status: 'complete',
                  gatheringDurationMs: 180,
                  localCandidates: [
                    {id: 'host', type: 'host', ip: '192.0.2.1', port: 9, protocol: 'tcp', serverUrl: null},
                    {
                      id: 'mdns',
                      type: 'host',
                      ip: null,
                      hostname: 'device.local',
                      port: 12345,
                      protocol: 'udp',
                      serverUrl: null,
                    },
                    {
                      id: 'relay',
                      type: 'relay',
                      ip: '203.0.113.1',
                      port: 50000,
                      protocol: 'udp',
                      serverUrl: 'turns:relay.example.invalid:3478?transport=tcp',
                    },
                  ],
                  errors: [{url: 'stun:relay.example.invalid:3478', code: 1, message: 'Unauthorized'}],
                },
                {
                  serverUrl: 'turns:relay.example.invalid:5349?transport=tcp',
                  requestedTransport: 'tcp',
                  status: 'complete',
                  gatheringDurationMs: 96,
                  localCandidates: [],
                  errors: [
                    {url: 'turns:relay.example.invalid:5349?transport=tcp', code: 701, message: ''},
                    {url: 'turns:other-relay.example.invalid:5349?transport=tcp', code: 701, message: ''},
                  ],
                },
                {
                  serverUrl: 'turns:relay.example.invalid:5349?transport=tcp',
                  requestedTransport: 'tcp',
                  status: 'complete',
                  gatheringDurationMs: 98,
                  localCandidates: [],
                  errors: [{url: null, code: 701, message: ''}],
                },
              ],
            },
          },
        }),
      });
    });
    expect(screen.getByText('192.0.2.1')).toBeInTheDocument();
    expect(screen.getAllByText('device.local (mDNS)')).toHaveLength(2);
    expect(screen.getAllByText('troubleshooter.networkPreview.mdnsAddressFamily')).toHaveLength(2);
    expect(screen.getByText('troubleshooter.check.udp.title').closest('details')?.querySelector('ul')).toBeNull();
    expect(screen.getByText('troubleshooter.check.tcp.title').closest('details')?.querySelector('ul')).toBeNull();
    expect(screen.getAllByText('relay.example.invalid')).toHaveLength(2);
    expect(screen.getByText('troubleshooter.reachabilityPreview.endpoint')).toBeInTheDocument();
    expect(screen.getByText('troubleshooter.check.tls.title').closest('summary')).toHaveTextContent(
      'troubleshooter.networkPreview.notFound',
    );
    expect(screen.getByText('troubleshooter.networkPreview.tlsErrorCode')).toBeInTheDocument();
    expect(screen.getByText('troubleshooter.networkPreview.tlsComingSoon')).toBeInTheDocument();
    expect(screen.getByText('Unauthorized').closest('details')?.querySelector('h4')).toBeNull();
    expect(screen.getByText('troubleshooter.reachabilityPreview.relay')).toBeInTheDocument();
    expect(screen.getByText('troubleshooter.reachabilityPreview.notReachable')).toBeInTheDocument();
    expect(screen.queryByText('troubleshooter.reachabilityPreview.stunPublicEndpoint')).not.toBeInTheDocument();
    expect(JSON.parse(repository.getReport('test-version')).simulated).toBe(false);
  });
});
