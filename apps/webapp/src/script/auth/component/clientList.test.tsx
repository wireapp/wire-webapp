/*
 * Wire
 * Copyright (C) 2023 Wire Swiss GmbH
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

import {fireEvent, waitFor} from '@testing-library/react';
import {ClientClassification, ClientType} from '@wireapp/api-client/lib/client';

import {ClientList} from './clientList';

import {actionRoot} from '../module/action';
import {initialRootState} from '../module/reducer';
import {ROUTE} from '../route';
import {mockStoreFactory} from '../util/test/mockStoreFactory';
import {mountComponent} from '../util/test/testUtil';

const queries = [
  '',
  '?scope=read%3Aself&client_id=test&state=a%2Bb&code_challenge=challenge&code_challenge_method=S256',
  '?client_id=test&scope=read%3Aself&state=a%2Bb&code_challenge=challenge&code_challenge_method=S256',
];

describe('ClientList device-limit recovery', () => {
  const originalUrl = window.location.href;
  afterEach(() => {
    window.history.replaceState({}, '', originalUrl);
  });

  it.each(queries)('continues after device removal with the original request (%s)', async query => {
    window.history.replaceState({}, '', `#${ROUTE.CLIENTS}${query}`);
    const push = spyOn(history, 'pushState');
    spyOn(actionRoot.clientAction, 'doRemoveClient').and.returnValue(() => {
      return Promise.resolve();
    });
    spyOn(actionRoot.clientAction, 'doInitializeClient').and.returnValue(() => {
      return Promise.resolve();
    });
    const store = mockStoreFactory()({
      ...initialRootState,
      selfState: {
        ...initialRootState.selfState,
        self: {...initialRootState.selfState.self, sso_id: {subject: 'sso-user', tenant: 'test-tenant'}},
      },
      clientState: {
        ...initialRootState.clientState,
        clients: [
          {
            id: 'old-device',
            capabilities: [],
            cookie: 'test-cookie',
            mls_public_keys: {},
            type: ClientType.PERMANENT,
            time: '2026-01-01T00:00:00Z',
            model: 'Old browser',
            class: ClientClassification.DESKTOP,
          },
        ],
      },
    });
    const {getByTestId} = mountComponent(<ClientList />, store);
    fireEvent.click(getByTestId('do-remove-device'));

    await waitFor(() => {
      expect(push).toHaveBeenCalledWith(
        expect.any(Object),
        expect.any(String),
        `#${query.length > 0 ? ROUTE.AUTHORIZE + query : ROUTE.HISTORY_INFO}`,
      );
    });
    expect(actionRoot.clientAction.doRemoveClient).toHaveBeenCalledWith('old-device', undefined);
    expect(actionRoot.clientAction.doInitializeClient).toHaveBeenCalledTimes(1);
  });
});
