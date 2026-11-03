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
import {ThemeProvider} from '@wireapp/react-ui-kit';

import {
  createTroubleshooterRepository,
  type TroubleshooterRepository,
} from 'Repositories/troubleshooter/troubleshooterRepository';
import {
  createMockTroubleshooterService,
  MOCK_CONNECTION_DELAY_MILLISECONDS,
  MOCK_SCAN_DELAY_MILLISECONDS,
} from 'Repositories/troubleshooter/troubleshooterService';
import {Config} from 'src/script/Config';
import {
  createRootContextValueForTest,
  createRootProviderWrapperForTest,
} from 'src/script/page/testSupport/rootContextTestSupport';
import * as clipboard from 'Util/clipboardUtil';
import * as utilities from 'Util/util';
import {translateForTest} from 'Util/test/translateForTest';

import {TroubleshootingPreferences} from './troubleshootingPreferences';

const setup = (): RenderResult & {
  clock: ReturnType<typeof createDeterministicClock>;
  repository: TroubleshooterRepository;
} => {
  const clock = createDeterministicClock({initialUnixEpochMicroseconds: 0n});
  const repository = createTroubleshooterRepository(createMockTroubleshooterService(clock), clock);
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

  it('starts empty, runs the connection test and then expands the scan results', async () => {
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
    fireEvent.click(screen.getByRole('button', {name: 'troubleshooter.runScan'}));
    await act(async () => {
      clock.advanceByMilliseconds(MOCK_SCAN_DELAY_MILLISECONDS);
    });
    expect(screen.getByText('troubleshooter.check.udp.title')).toBeInTheDocument();
    const quality = screen.getByText('troubleshooter.group.quality.title').closest('summary');
    expect(quality?.closest('details')).not.toHaveAttribute('open');
    if (quality) {
      fireEvent.click(quality);
    }
    expect(quality?.closest('details')).toHaveAttribute('open');
    expect(screen.getByText('42 ms')).toBeVisible();
    expect(screen.getByRole('button', {name: 'troubleshooter.scanAgain'})).toBeEnabled();
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
    expect(screen.getByText('troubleshooter.warningTitle')).toBeInTheDocument();
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
    expect(screen.getByText('troubleshooter.check.udp.title')).toBeInTheDocument();
    expect(screen.getByText('troubleshooter.check.udp.title').closest('li')).toHaveTextContent(
      'troubleshooter.noResult',
    );
    expect(screen.queryByText('troubleshooter.status.good')).not.toBeInTheDocument();
    expect(screen.queryByText('troubleshooter.status.allowed')).not.toBeInTheDocument();
  });
});
