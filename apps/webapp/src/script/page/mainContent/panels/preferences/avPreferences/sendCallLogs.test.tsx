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
import {task} from 'true-myth';
import {ThemeProvider} from '@wireapp/react-ui-kit';
import {fireEvent, render, screen} from '@testing-library/react';

import {PrimaryModal} from 'Components/Modals/PrimaryModal';
import type {CallingRepository} from 'Repositories/calling/CallingRepository';
import {CallLogsErrorStatus, createMockCallLogsService} from 'Repositories/calling/callLogsService';
import {
  createRootContextValueForTest,
  createRootProviderWrapperForTest,
} from 'src/script/page/testSupport/rootContextTestSupport';
import {translateForTest} from 'Util/test/translateForTest';

import {Config} from '../../../../../Config';
import {UserState} from 'Repositories/user/userState';

import {SendCallLogs} from './sendCallLogs';

const userState = {
  self: () => {
    return {id: 'c44a01bd'};
  },
} as unknown as UserState;

describe('SendCallLogs', () => {
  beforeEach(() => {
    const config = Config.getConfig();
    jest.spyOn(Config, 'getConfig').mockReturnValue({...config, BRAND_NAME: 'Wire'});
  });
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('requires confirmation before starting the upload and blocks dismissal while sending', async () => {
    const clock = createDeterministicClock({initialUnixEpochMicroseconds: 0n});
    const service = createMockCallLogsService(clock);
    const send = jest.spyOn(service, 'sendCallLogs');
    const show = jest.spyOn(PrimaryModal, 'show').mockReturnValue(undefined);
    const wrapper = createRootProviderWrapperForTest(
      createRootContextValueForTest({translate: translateForTest, clock}),
    );
    const callingRepository = {
      getCallLog: () => {
        return ['test log'];
      },
    } as CallingRepository;
    render(
      <ThemeProvider>
        <SendCallLogs callingRepository={callingRepository} callLogsService={service} userState={userState} />
      </ThemeProvider>,
      {wrapper},
    );

    fireEvent.click(screen.getByRole('button'));
    expect(send).not.toHaveBeenCalled();
    expect(show.mock.calls[0][0]).toBe(PrimaryModal.type.OPTION);

    const replace = jest.spyOn(PrimaryModal, 'replace').mockReturnValue(undefined);
    const completion = show.mock.calls[0][1].primaryAction?.action?.(true);
    expect(send).toHaveBeenCalledTimes(1);
    expect(send.mock.calls[0][0]).toBeInstanceOf(File);
    expect(send.mock.calls[0][0].name).toMatch(/-c44a-Calling_1970-01-01\.log$/);
    expect(send.mock.calls[0][1]).toEqual({force: true});
    expect(replace.mock.calls[0][0]).toBe(PrimaryModal.type.LOADING);
    expect(replace.mock.calls[0][1]).toMatchObject({preventClose: true, hideCloseBtn: true});
    clock.advanceByMilliseconds(2_000);
    await completion;
    expect(show.mock.calls[1][0]).toBe(PrimaryModal.type.ACKNOWLEDGE);
    expect(show.mock.calls[1][1].text?.title).toBe(translateForTest('modalCallLogsSuccessTitle'));
    render(<>{show.mock.calls[1][1].text?.message}</>);
    expect(screen.getByText(translateForTest('modalCallLogsMockNotice'))).toBeDefined();
    expect(screen.getByText('mock-client@mock-domain')).toBeDefined();
  });

  it('shows the empty log message without offering to send', () => {
    const show = jest.spyOn(PrimaryModal, 'show').mockReturnValue(undefined);
    const wrapper = createRootProviderWrapperForTest(createRootContextValueForTest({translate: translateForTest}));
    const callingRepository = {
      getCallLog: () => {
        return [];
      },
    } as unknown as CallingRepository;
    render(
      <ThemeProvider>
        <SendCallLogs callingRepository={callingRepository} userState={userState} />
      </ThemeProvider>,
      {wrapper},
    );
    fireEvent.click(screen.getByRole('button'));
    expect(show.mock.calls[0][0]).toBe(PrimaryModal.type.ACKNOWLEDGE);
  });

  it.each([
    [400, 'modalCallLogsError400'],
    [409, 'modalCallLogsError409'],
    [413, 'modalCallLogsError413'],
    [422, 'modalCallLogsError422'],
    [502, 'modalCallLogsError502'],
    [500, 'modalCallLogsError500'],
    ['network', 'modalCallLogsErrorNetwork'],
  ] as const)('shows the appropriate retry guidance for %s', async (status, key) => {
    const show = jest.spyOn(PrimaryModal, 'show').mockReturnValue(undefined);
    const wrapper = createRootProviderWrapperForTest(createRootContextValueForTest({translate: translateForTest}));
    const callingRepository = {
      getCallLog: () => {
        return ['test log'];
      },
    } as unknown as CallingRepository;
    const sendCallLogs = jest.fn(() => {
      return task.reject({status: status as CallLogsErrorStatus});
    });
    render(
      <ThemeProvider>
        <SendCallLogs callingRepository={callingRepository} userState={userState} callLogsService={{sendCallLogs}} />
      </ThemeProvider>,
      {wrapper},
    );
    fireEvent.click(screen.getByRole('button'));
    await show.mock.calls[0][1].primaryAction?.action?.(false);
    expect(sendCallLogs.mock.calls[0]).toEqual([expect.any(File), {force: false}]);
    expect(show.mock.calls[1][1].text?.message).toBe(translateForTest(key));
  });
});
