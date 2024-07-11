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

import {ClientType} from '@wireapp/api-client/lib/client/';
import {BackendErrorLabel} from '@wireapp/api-client/lib/http/';
import {RecursivePartial} from '@wireapp/commons/lib/util/TypeUtil';
import {StatusCodes as HTTP_STATUS} from 'http-status-codes';

import type {APIClient} from '@wireapp/api-client';
import type {TypeUtil} from '@wireapp/commons';

import {AuthActionCreator} from './creator/';

import {mockStoreFactory} from '../../util/test/mockStoreFactory';

import {ActionRoot, actionRoot} from './';

describe('AuthAction', () => {
  it('authenticates a user successfully', async () => {
    const email = 'test@example.com';
    const password = 'password';
    const accessToken =
      'Ntc8CsuNMeGFaRCqhah1dSyDFmNq6m8zL1R2h5TEtLQy_4Up8jLI8CA==.v=1.k=1.d=1494355813.tda7f3557-b40c-4b00-9a4c-4710fdc07709.c=16347884158313001066';
    const response = JSON.parse(`{"expires_in":900,"access_token":"${accessToken}","token_type":"Bearer"}`);
    const spies = {
      doInitializeClient: jasmine.createSpy().and.returnValue(() => Promise.resolve()),
      fetchSelf: jasmine.createSpy().and.returnValue(() => Promise.resolve()),
      generateClientPayload: jasmine.createSpy().and.returnValue({}),
      setLocalStorage: jasmine.createSpy().and.returnValue(() => Promise.resolve()),
    };
    const mockedActions = {
      clientAction: {
        doInitializeClient: spies.doInitializeClient,
        generateClientPayload: spies.generateClientPayload,
      },
      localStorageAction: {
        setLocalStorage: spies.setLocalStorage,
      },
      selfAction: {
        fetchSelf: spies.fetchSelf,
      },
    };
    const mockedApiClient = {
      accessTokenStore: {accessToken: response},
    };
    const mockedCore = {
      login: () => Promise.resolve({}),
    };

    const store = mockStoreFactory({
      actions: mockedActions,
      apiClient: mockedApiClient as TypeUtil.RecursivePartial<APIClient>,
      core: mockedCore,
    })({});
    await store.dispatch(actionRoot.authAction.doLoginPlain({clientType: ClientType.PERMANENT, email, password}));

    expect(store.getActions()).toEqual([AuthActionCreator.startLogin(), AuthActionCreator.successfulLogin()]);
    expect(spies.setLocalStorage.calls.count()).toEqual(1);
    expect(spies.fetchSelf.calls.count()).toEqual(1);
    expect(spies.doInitializeClient.calls.count()).toEqual(1);
  });

  it('successful authenticates with too many clients error', async () => {
    const email = 'test@example.com';
    const password = 'password';
    const accessToken =
      'Ntc8CsuNMeGFaRCqhah1dSyDFmNq6m8zL1R2h5TEtLQy_4Up8jLI8CA==.v=1.k=1.d=1494355813.tda7f3557-b40c-4b00-9a4c-4710fdc07709.c=16347884158313001066';
    const response = JSON.parse(`{"expires_in":900,"access_token":"${accessToken}","token_type":"Bearer"}`);
    const spies = {
      doInitializeClient: jasmine
        .createSpy()
        .and.returnValue(() => Promise.reject({label: BackendErrorLabel.TOO_MANY_CLIENTS})),
      fetchSelf: jasmine.createSpy().and.returnValue(() => Promise.resolve()),
      generateClientPayload: jasmine.createSpy().and.returnValue({}),
      setLocalStorage: jasmine.createSpy().and.returnValue(() => Promise.resolve()),
    };
    const mockedActions = {
      clientAction: {
        doInitializeClient: spies.doInitializeClient,
        generateClientPayload: spies.generateClientPayload,
      },
      localStorageAction: {
        setLocalStorage: spies.setLocalStorage,
      },
      selfAction: {
        fetchSelf: spies.fetchSelf,
      },
    };
    const mockedApiClient = {
      accessTokenStore: {accessToken: response},
    };
    const mockedCore = {
      login: () => Promise.resolve({}),
    };

    const store = mockStoreFactory({
      actions: mockedActions,
      apiClient: mockedApiClient as TypeUtil.RecursivePartial<APIClient>,
      core: mockedCore,
    })({});

    await expect(
      store.dispatch(actionRoot.authAction.doLoginPlain({clientType: ClientType.PERMANENT, email, password})),
    ).rejects.toMatchObject({
      label: BackendErrorLabel.TOO_MANY_CLIENTS,
    });
    expect(store.getActions()).toEqual([AuthActionCreator.startLogin(), AuthActionCreator.successfulLogin()]);
    expect(spies.doInitializeClient.calls.count()).toEqual(1);
  });

  it('handles failed authentication', async () => {
    const email = 'test@example.com';
    const backendError = new Error() as any;
    backendError.code = HTTP_STATUS.FORBIDDEN;
    backendError.label = 'invalid-credentials';
    backendError.message = 'Authentication failed.';

    const mockedActions = {
      clientAction: {
        generateClientPayload: jest.fn().mockReturnValue({}),
      },
    } as RecursivePartial<ActionRoot>;
    const mockedCore = {
      login: () => Promise.reject(backendError),
    };
    const store = mockStoreFactory({
      actions: mockedActions,
      apiClient: {},
      core: mockedCore,
    })();
    await expect(
      store.dispatch(
        actionRoot.authAction.doLoginPlain({clientType: ClientType.PERMANENT, email, password: 'password'}),
      ),
    ).rejects.toMatchObject({
      code: backendError.code,
      label: backendError.label,
      message: backendError.message,
    });
    expect(store.getActions()).toEqual([AuthActionCreator.startLogin(), AuthActionCreator.failedLogin(backendError)]);
  });

  it('handles failed logout', async () => {
    const backendError = new Error() as any;
    backendError.code = HTTP_STATUS.FORBIDDEN;
    backendError.label = 'invalid-credentials';
    backendError.message = 'Missing token';
    const mockedCore = {
      logout: () => Promise.reject(backendError),
    };
    const store = mockStoreFactory({
      actions: {},
      apiClient: {},
      core: mockedCore,
    })({});
    await store.dispatch(actionRoot.authAction.doLogout());

    expect(store.getActions()).toEqual([AuthActionCreator.failedLogout(backendError)]);
  });

  it('validates SSO code', async () => {
    const ssoCode = 'wire-uuid';
    const mockedApiClient = {
      api: {
        auth: {
          headInitiateLogin: () => Promise.resolve(),
        },
      },
    };

    const store = mockStoreFactory({
      apiClient: mockedApiClient,
    })({});
    await store.dispatch(actionRoot.authAction.validateSSOCode(ssoCode));
  });
});
