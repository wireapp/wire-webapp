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

import {act, render, screen} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {Maybe} from 'true-myth';
import {ThemeProvider} from '@wireapp/react-ui-kit';

import {
  callLogsServerAddressSchema,
  defaultCallLogsServerAddress,
  useCallLogsUploadSettings,
} from 'Repositories/calling/callLogsUploadSettings';

import {CallLogsUploadSettings} from './callLogsUploadSettings';

describe('Call log upload settings', () => {
  beforeEach(() => {
    localStorage.clear();
    useCallLogsUploadSettings.setState({mode: 'mock', serverAddress: defaultCallLogsServerAddress});
  });

  it('changes mode immediately, saves the server address, and restores both settings', async () => {
    render(
      <ThemeProvider>
        <CallLogsUploadSettings />
      </ThemeProvider>,
    );
    await userEvent.selectOptions(screen.getByLabelText('Upload mode'), 'server');
    expect(useCallLogsUploadSettings.getState().mode).toBe('server');
    const input = screen.getByLabelText('Server address');
    await userEvent.clear(input);
    await userEvent.type(input, 'https://localhost:9090/');
    await userEvent.click(screen.getByRole('button', {name: 'Save server address'}));
    expect(useCallLogsUploadSettings.getState().serverAddress).toBe('https://localhost:9090');
    const saved = Maybe.of(localStorage.getItem('wire-call-logs-upload-settings')).unwrapOr('');
    expect(saved).not.toBe('');
    await act(async () => {
      useCallLogsUploadSettings.setState({mode: 'mock', serverAddress: defaultCallLogsServerAddress});
      localStorage.setItem('wire-call-logs-upload-settings', saved);
      await useCallLogsUploadSettings.persist.rehydrate();
    });
    expect(useCallLogsUploadSettings.getState()).toMatchObject({
      mode: 'server',
      serverAddress: 'https://localhost:9090',
    });
  });

  it.each([
    'invalid',
    'ftp://localhost:8080',
    'https://user:pass@localhost:8080',
    'https://localhost:8080/api/logs',
    'https://localhost:8080?force=true',
  ])('rejects invalid server address %s', address => {
    expect(callLogsServerAddressSchema.safeParse(address).success).toBe(false);
  });

  it('does not enable a server from malformed persisted settings', async () => {
    localStorage.setItem(
      'wire-call-logs-upload-settings',
      JSON.stringify({state: {mode: 'server', serverAddress: 'invalid'}, version: 0}),
    );
    await useCallLogsUploadSettings.persist.rehydrate();
    expect(useCallLogsUploadSettings.getState().mode).toBe('mock');
  });
});
