/*
 * Wire
 * Copyright (C) 2019 Wire Swiss GmbH
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

import {actionRoot} from '.';
import {mockStoreFactory} from '../../util/test/mockStoreFactory';
import {UserActionCreator} from './creator';

describe('UserAction', () => {
  it('requests activation code', async () => {
    const email = 'mail@mail.com';
    const mockedActions = {};
    const mockedApiClient = {
      user: {api: {postActivationCode: () => Promise.resolve()}},
    };

    const store = mockStoreFactory({
      actions: mockedActions,
      apiClient: mockedApiClient,
    })({});
    await store.dispatch(actionRoot.userAction.doSendActivationCode(email));

    expect(store.getActions()).toEqual([
      UserActionCreator.startSendActivationCode(),
      UserActionCreator.successfulSendActivationCode(),
    ]);
  });

  it('handles failed request for activation code', async () => {
    const error = new Error('test error');
    const email = 'mail@mail.com';
    const mockedActions = {};
    const mockedApiClient = {
      user: {api: {postActivationCode: () => Promise.reject(error)}},
    };

    const store = mockStoreFactory({
      actions: mockedActions,
      apiClient: mockedApiClient,
    })({});
    try {
      await store.dispatch(actionRoot.userAction.doSendActivationCode(email));
      fail();
    } catch (backendError) {
      expect(store.getActions()).toEqual([
        UserActionCreator.startSendActivationCode(),
        UserActionCreator.failedSendActivationCode(error),
      ]);
    }
  });
});
