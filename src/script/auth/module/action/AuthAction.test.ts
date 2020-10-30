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

import type {APIClient} from '@wireapp/api-client';
import {ClientType} from '@wireapp/api-client/src/client';
import type {TypeUtil} from '@wireapp/commons';
import {StatusCodes as HTTP_STATUS} from 'http-status-codes';

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
    await store.dispatch(actionRoot.authAction.doLoginPlain({clientType: ClientType.PERMANENT, email, password}));

    expect(store.getActions()).toEqual([AuthActionCreator.startLogin(), AuthActionCreator.successfulLogin()]);
    expect(spies.setLocalStorage.calls.count()).toEqual(5);
    expect(spies.setCookie.calls.count()).toEqual(1);
    expect(spies.fetchSelf.calls.count()).toEqual(1);
    expect(spies.generateClientPayload.calls.count()).toEqual(1);
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
      await store.dispatch(actionRoot.authAction.doLoginPlain({clientType: ClientType.PERMANENT, email, password}));
      fail('TOO_MANY_CLIENTS error was not thrown');
    } catch (error) {
      expect(error.label).withContext('Error is of type TOO_MANY_CLIENTS').toEqual(BackendError.LABEL.TOO_MANY_CLIENTS);

      expect(store.getActions()).toEqual([AuthActionCreator.startLogin(), AuthActionCreator.successfulLogin()]);
      expect(spies.doInitializeClient.calls.count()).toEqual(1);
    }
  });

  it('handles failed authentication', async () => {
    const email = 'test@example.com';
    const backendError = new Error() as any;
    backendError.code = HTTP_STATUS.FORBIDDEN;
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
        actionRoot.authAction.doLoginPlain({clientType: ClientType.PERMANENT, email, password: 'password'}),
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

    expect(store.getActions()).toEqual([AuthActionCreator.startLogout(), AuthActionCreator.failedLogout(backendError)]);
  });

  it('requests phone login code', async () => {
    const phoneNumber = '+08723568';
    const expiresIn = 60;
    const mockedApiClient = {
      auth: {
        api: {
          postLoginSend: () => Promise.resolve({expires_in: expiresIn}),
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

  it('handles failed request for phone login code', async () => {
    const error = new Error('test error');
    const phoneNumber = '+08723568';
    const mockedApiClient = {
      auth: {
        api: {
          postLoginSend: () => Promise.reject(error),
        },
      },
    };

    const store = mockStoreFactory({
      apiClient: mockedApiClient,
    })({});
    try {
      await store.dispatch(actionRoot.authAction.doSendPhoneLoginCode({phone: phoneNumber}));
    } catch (backendError) {
      expect(store.getActions()).toEqual([
        AuthActionCreator.startSendPhoneLoginCode(),
        AuthActionCreator.failedSendPhoneLoginCode(error),
      ]);
    }
  });

  it('validates SSO code', async () => {
    const ssoCode = 'wire-uuid';
    const mockedApiClient = {
      auth: {
        api: {
          headInitiateLogin: () => Promise.resolve(),
        },
      },
    };

    const store = mockStoreFactory({
      apiClient: mockedApiClient,
    })({});
    await store.dispatch(actionRoot.authAction.validateSSOCode(ssoCode));
  });

  it('handles failed request for phone login code (not found)', async () => {
    const error = {response: {status: HTTP_STATUS.NOT_FOUND}};
    const expectedNotFoundError = new BackendError({
      code: HTTP_STATUS.NOT_FOUND,
      label: BackendError.SSO_ERRORS.SSO_NOT_FOUND,
    });
    const ssoCode = 'wire-uuid';
    const mockedApiClient = {
      auth: {
        api: {
          headInitiateLogin: () => Promise.reject(error),
        },
      },
    };

    const store = mockStoreFactory({
      apiClient: mockedApiClient,
    })({});
    try {
      await store.dispatch(actionRoot.authAction.validateSSOCode(ssoCode));
    } catch (backendError) {
      expect(store.getActions()).toEqual([AuthActionCreator.failedLogin(expectedNotFoundError)]);
    }
  });

  it('handles failed request for phone login code (server error)', async () => {
    const error = {response: {status: HTTP_STATUS.INTERNAL_SERVER_ERROR}};
    const expectedServerError = new BackendError({
      code: HTTP_STATUS.INTERNAL_SERVER_ERROR,
      label: BackendError.SSO_ERRORS.SSO_SERVER_ERROR,
    });
    const ssoCode = 'wire-uuid';
    const mockedApiClient = {
      auth: {
        api: {
          headInitiateLogin: () => Promise.reject(error),
        },
      },
    };

    const store = mockStoreFactory({
      apiClient: mockedApiClient,
    })({});
    try {
      await store.dispatch(actionRoot.authAction.validateSSOCode(ssoCode));
    } catch (backendError) {
      expect(store.getActions()).toEqual([AuthActionCreator.failedLogin(expectedServerError)]);
    }
  });

  it('handles failed request for phone login code (generic error)', async () => {
    const error = {response: {status: HTTP_STATUS.FORBIDDEN}};
    const expectedGenericError = new BackendError({
      code: HTTP_STATUS.INTERNAL_SERVER_ERROR,
      label: BackendError.SSO_ERRORS.SSO_GENERIC_ERROR,
    });
    const ssoCode = 'wire-uuid';
    const mockedApiClient = {
      auth: {
        api: {
          headInitiateLogin: () => Promise.reject(error),
        },
      },
    };

    const store = mockStoreFactory({
      apiClient: mockedApiClient,
    })({});
    try {
      await store.dispatch(actionRoot.authAction.validateSSOCode(ssoCode));
    } catch (backendError) {
      expect(store.getActions()).toEqual([AuthActionCreator.failedLogin(expectedGenericError)]);
    }
  });
});
