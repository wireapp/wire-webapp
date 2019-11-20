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

import {APIClient} from '@wireapp/api-client';
import {ClientType} from '@wireapp/api-client/dist/commonjs/client';
import {TypeUtil} from '@wireapp/commons';
import {mockStoreFactory} from '../../util/test/mockStoreFactory';
import {actionRoot} from './';
import {BackendError} from './BackendError';
import {AuthActionCreator} from './creator/';

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
      setCookie: jasmine.createSpy().and.returnValue(() => Promise.resolve()),
      setLocalStorage: jasmine.createSpy().and.returnValue(() => Promise.resolve()),
    };
    const mockedActions = {
      clientAction: {
        doInitializeClient: spies.doInitializeClient,
        generateClientPayload: spies.generateClientPayload,
      },
      cookieAction: {
        setCookie: spies.setCookie,
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
    await store.dispatch(actionRoot.authAction.doLoginPlain({email, password, clientType: ClientType.PERMANENT}));
    expect(store.getActions()).toEqual([AuthActionCreator.startLogin(), AuthActionCreator.successfulLogin()]);
    expect(spies.setLocalStorage.calls.count()).toEqual(5);
    expect(spies.setCookie.calls.count()).toEqual(1);
    expect(spies.fetchSelf.calls.count()).toEqual(1);
    expect(spies.generateClientPayload.calls.count()).toEqual(1);
    expect(spies.doInitializeClient.calls.count()).toEqual(1);
  });

  it('authentication is successful with too many clients error', async () => {
    const email = 'test@example.com';
    const password = 'password';
    const accessToken =
      'Ntc8CsuNMeGFaRCqhah1dSyDFmNq6m8zL1R2h5TEtLQy_4Up8jLI8CA==.v=1.k=1.d=1494355813.tda7f3557-b40c-4b00-9a4c-4710fdc07709.c=16347884158313001066';
    const response = JSON.parse(`{"expires_in":900,"access_token":"${accessToken}","token_type":"Bearer"}`);
    const spies = {
      doInitializeClient: jasmine
        .createSpy()
        .and.returnValue(() => Promise.reject({label: BackendError.LABEL.TOO_MANY_CLIENTS})),
      fetchSelf: jasmine.createSpy().and.returnValue(() => Promise.resolve()),
      generateClientPayload: jasmine.createSpy().and.returnValue({}),
      setCookie: jasmine.createSpy().and.returnValue(() => Promise.resolve()),
      setLocalStorage: jasmine.createSpy().and.returnValue(() => Promise.resolve()),
    };
    const mockedActions = {
      clientAction: {
        doInitializeClient: spies.doInitializeClient,
        generateClientPayload: spies.generateClientPayload,
      },
      cookieAction: {
        setCookie: spies.setCookie,
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
    try {
      await store.dispatch(actionRoot.authAction.doLoginPlain({email, password, clientType: ClientType.PERMANENT}));
      fail('TOO_MANY_CLIENTS error was not thrown');
    } catch (error) {
      expect(error.label)
        .withContext('Error is of type TOO_MANY_CLIENTS')
        .toEqual(BackendError.LABEL.TOO_MANY_CLIENTS);
      expect(store.getActions()).toEqual([AuthActionCreator.startLogin(), AuthActionCreator.successfulLogin()]);
      expect(spies.doInitializeClient.calls.count()).toEqual(1);
    }
  });

  it('handles failed authentication', async () => {
    const email = 'test@example.com';
    const backendError = new Error() as any;
    backendError.code = 403;
    backendError.label = 'invalid-credentials';
    backendError.message = 'Authentication failed.';
    const spies = {
      generateClientPayload: jasmine.createSpy().and.returnValue({}),
    };
    const mockedActions = {
      clientAction: {
        generateClientPayload: spies.generateClientPayload,
      },
    };
    const mockedCore = {
      login: () => Promise.reject(backendError),
    };
    const store = mockStoreFactory({
      actions: mockedActions,
      apiClient: {},
      core: mockedCore,
    })();
    try {
      await store.dispatch(
        actionRoot.authAction.doLoginPlain({email, password: 'password', clientType: ClientType.PERMANENT}),
      );
      fail();
    } catch (expectedError) {
      expect(expectedError).toBeDefined();
      expect(expectedError.message).toEqual(backendError.message);
      expect(expectedError.code).toEqual(backendError.code);
      expect(expectedError.label).toEqual(backendError.label);
      expect(store.getActions()).toEqual([AuthActionCreator.startLogin(), AuthActionCreator.failedLogin(backendError)]);
      expect(spies.generateClientPayload.calls.count()).toEqual(1);
    }
  });

  it('handles failed logout', async () => {
    const backendError = new Error() as any;
    backendError.code = 403;
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
    expect(store.getActions()).toEqual([AuthActionCreator.startLogout(), AuthActionCreator.failedLogout(backendError)]);
  });

  it('authenticates a user successfully', async () => {
    const phoneNumber = '+08723568';
    const expiresIn = 60;
    const mockedApiClient = {
      auth: {
        api: {
          postLoginSend: () => Promise.resolve({data: {expires_in: expiresIn}}),
        },
      },
    };

    const store = mockStoreFactory({
      apiClient: mockedApiClient,
    })({});
    await store.dispatch(actionRoot.authAction.doSendPhoneLoginCode({phone: phoneNumber}));
    expect(store.getActions()).toEqual([
      AuthActionCreator.startSendPhoneLoginCode(),
      AuthActionCreator.successfulSendPhoneLoginCode(expiresIn),
    ]);
  });
});
