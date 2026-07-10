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

import {render, waitFor} from '@testing-library/react';

import {PrimaryModal, removeCurrentModal} from 'Components/Modals/PrimaryModal';
import {ClientState} from 'Repositories/client/ClientState';
import {User} from 'Repositories/entity/User';
import * as RootProvider from 'src/script/page/rootProvider';
import {RootContextValue} from 'src/script/page/rootProvider';
import {MainViewModel} from 'src/script/view_model/MainViewModel';

import {HistoryExport} from './historyExport';
import {translateForTest} from 'Util/test/translateForTest';

describe('HistoryExport', () => {
  beforeEach(() => {
    removeCurrentModal();
  });

  afterEach(() => {
    removeCurrentModal();
    jest.restoreAllMocks();
  });

  it('uses a stable modal id so rerenders do not queue duplicate password modals', async () => {
    const showSpy = jest.spyOn(PrimaryModal, 'show').mockImplementation(() => {});
    const user = new User('', '', translateForTest);
    const switchContent = jest.fn();
    const clientState = new ClientState();
    const mainViewModel = {content: {repositories: {backup: {}}}} as unknown as MainViewModel;

    jest.spyOn(RootProvider, 'useApplicationContext').mockImplementation(
      () =>
        ({
          mainViewModel,
          translate: translateForTest,
        }) as unknown as RootContextValue,
    );

    const {rerender} = render(<HistoryExport switchContent={switchContent} user={user} clientState={clientState} />);

    await waitFor(() => {
      expect(showSpy).toHaveBeenCalledTimes(1);
    });

    expect(showSpy.mock.calls[0]?.[2]).toBe('history-export-password-modal');

    rerender(<HistoryExport switchContent={switchContent} user={user} clientState={clientState} />);

    await waitFor(() => {
      expect(showSpy).toHaveBeenCalledTimes(1);
    });
  });
});
