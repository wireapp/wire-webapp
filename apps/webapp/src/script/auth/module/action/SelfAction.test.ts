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

import type {Self} from '@wireapp/api-client/lib/self/';
import {StatusCodes as HTTP_STATUS} from 'http-status-codes';

import {SelfActionCreator} from './creator/';

import {mockStoreFactory} from '../../util/test/mockStoreFactory';

import {actionRoot} from '.';

describe('SelfAction', () => {
  it('fetches the self user', async () => {
    const selfUser = {assets: [], id: 'selfUserId'} as unknown as Self;
    const team = {teams: [{id: 'team'}]};
    const expectedSelfUser = {assets: [], id: 'selfUserId'} as unknown as Self;
    const spies = {
      doCheckPasswordState: jasmine.createSpy().and.returnValue(() => Promise.resolve()),
    };
    const mockedActions = {
      selfAction: {
        doCheckPasswordState: spies.doCheckPasswordState,
      },
    };
    const mockedApiClient = {
      api: {
        self: {
          getSelf: () => Promise.resolve(selfUser),
        },
        teams: {
          team: {
            getTeam: (teamId: string) => Promise.resolve(team),
          },
        },
      },
    };
    const mockedCore = {};

    const store = mockStoreFactory({
      actions: mockedActions,
      apiClient: mockedApiClient,
      core: mockedCore,
    })({});
    await store.dispatch(actionRoot.selfAction.fetchSelf());

    expect(store.getActions()).toEqual([
      SelfActionCreator.startFetchSelf(),
      SelfActionCreator.successfulFetchSelf(expectedSelfUser),
    ]);

    expect(spies.doCheckPasswordState.calls.count()).toEqual(1);
  });

  it('handles failed self user fetch', async () => {
    const error = new Error('test error');

    const mockedActions = {
      selfAction: {},
    };
    const mockedApiClient = {
      api: {
        self: {
          getSelf: () => Promise.reject(error),
        },
      },
    };

    const store = mockStoreFactory({
      actions: mockedActions,
      apiClient: mockedApiClient,
    })({});
    await expect(store.dispatch(actionRoot.selfAction.fetchSelf())).rejects.toThrow();
    expect(store.getActions()).toEqual([SelfActionCreator.startFetchSelf(), SelfActionCreator.failedFetchSelf(error)]);
  });

  it('fetches the set password state', async () => {
    const mockedApiClient = {
      api: {
        self: {headPassword: () => Promise.resolve({status: HTTP_STATUS.OK})},
      },
    };

    const store = mockStoreFactory({
      apiClient: mockedApiClient,
    })({});
    await store.dispatch(actionRoot.selfAction.doCheckPasswordState());

    expect(store.getActions()).toEqual([
      SelfActionCreator.startSetPasswordState(),
      SelfActionCreator.successfulSetPasswordState({hasPassword: true}),
    ]);
  });

  it('fetches the unset password state', async () => {
    const mockedApiClient = {
      api: {self: {headPassword: () => Promise.reject({response: {status: HTTP_STATUS.NOT_FOUND}})}},
    };

    const store = mockStoreFactory({
      apiClient: mockedApiClient,
    })({});
    await store.dispatch(actionRoot.selfAction.doCheckPasswordState());

    expect(store.getActions()).toEqual([
      SelfActionCreator.startSetPasswordState(),
      SelfActionCreator.successfulSetPasswordState({hasPassword: false}),
    ]);
  });

  it('handles failed password check', async () => {
    const error = {response: {status: HTTP_STATUS.BAD_REQUEST}} as unknown as Error;
    const mockedApiClient = {
      api: {self: {headPassword: () => Promise.reject(error)}},
    };

    const store = mockStoreFactory({
      apiClient: mockedApiClient,
    })({});
    try {
      await store.dispatch(actionRoot.selfAction.doCheckPasswordState());
      fail();
    } catch (backendError) {
      // TODO: Check for thrown error with jest error helpers (`await expect(Promise).rejects.toThrow()`)
      // eslint-disable-next-line jest/no-conditional-expect
      expect(store.getActions()).toEqual([
        SelfActionCreator.startSetPasswordState(),
        SelfActionCreator.failedSetPasswordState(error),
      ]);
    }
  });

  it('can set the self email', async () => {
    const email = 'myemail@mail.com';
    const mockedApiClient = {
      api: {auth: {putEmail: () => Promise.resolve()}},
    };

    const store = mockStoreFactory({
      apiClient: mockedApiClient,
    })({});
    await store.dispatch(actionRoot.selfAction.doSetEmail(email));

    expect(store.getActions()).toEqual([
      SelfActionCreator.startSetSelfEmail(),
      SelfActionCreator.successfulSetSelfEmail(email),
    ]);
  });

  it('handles failed attempt to set self email', async () => {
    const email = 'myemail@mail.com';
    const error = new Error('test error');
    const mockedApiClient = {
      api: {auth: {putEmail: () => Promise.reject(error)}},
    };

    const store = mockStoreFactory({
      apiClient: mockedApiClient,
    })({});
    await expect(store.dispatch(actionRoot.selfAction.doSetEmail(email))).rejects.toThrow();
    expect(store.getActions()).toEqual([
      SelfActionCreator.startSetSelfEmail(),
      SelfActionCreator.failedSetSelfEmail(error),
    ]);
  });

  it('can set the self password', async () => {
    const password = 'password';
    const mockedApiClient = {
      api: {self: {putPassword: () => Promise.resolve()}},
    };

    const store = mockStoreFactory({
      apiClient: mockedApiClient,
    })({});
    await store.dispatch(actionRoot.selfAction.doSetPassword({new_password: password}));

    expect(store.getActions()).toEqual([
      SelfActionCreator.startSetSelfPassword(),
      SelfActionCreator.successfulSetSelfPassword(),
    ]);
  });

  it('handles failed attempt to set self password', async () => {
    const password = 'password';
    const error = new Error('test error');
    const mockedApiClient = {
      api: {self: {putPassword: () => Promise.reject(error)}},
    };

    const store = mockStoreFactory({
      apiClient: mockedApiClient,
    })({});
    await expect(store.dispatch(actionRoot.selfAction.doSetPassword({new_password: password}))).rejects.toThrow();
    expect(store.getActions()).toEqual([
      SelfActionCreator.startSetSelfPassword(),
      SelfActionCreator.failedSetSelfPassword(error),
    ]);
  });
});
