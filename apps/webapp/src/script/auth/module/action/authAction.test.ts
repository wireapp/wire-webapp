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

import {VerificationActionType} from '../../../apiClient/auth/verificationActionType';
import {ClientType} from '../../../apiClient/client/clientType';
import {BackendError} from '../../../apiClient/http/backendError';
import {BackendErrorLabel, SyntheticErrorLabel} from '../../../apiClient/http/backendErrorLabel';
import {RecursivePartial} from '../../../commons/util/TypeUtil';
import {StatusCodes as HTTP_STATUS} from 'http-status-codes';

import type {APIClient} from '../../../apiClient/apiClient';
import type {TypeUtil} from '../../../commons/util';

import {AuthActionCreator} from './creator/';
import {conversationAction} from './conversationAction';

import {getJoinLink} from '../../util/joinLink';
import {mockStoreFactory} from '../../util/test/mockStoreFactory';
import {initialRootState} from '../reducer';

import {ActionRoot, actionRoot} from './';

describe.each(['password', 'SSO'] as const)('Meeting link login with %s', mode => {
  const conversation = {id: 'conversation-id', domain: 'example.com'};
  const meeting = {
    qualified_id: {id: 'meeting-id', domain: 'example.com'},
    qualified_conversation: conversation,
    title: 'Meeting',
    start_time: '2026-01-01T12:00:00Z',
  };

  beforeEach(() => {
    window.history.replaceState(
      {},
      '',
      '/auth/?meeting_domain=example.com&meeting_key=key&meeting_code=code#/join-meeting',
    );
  });

  afterEach(() => {
    jest.restoreAllMocks();
    window.history.replaceState({}, '', '/');
    window.localStorage.removeItem('LOGIN_CONVERSATION_KEY');
    window.localStorage.removeItem('__amplify__z.storage.StorageKey.AUTH.PERSIST');
  });

  const createLogin = (initializeClient: () => Promise<void>): {login: () => Promise<void>; sendJSON: jest.Mock} => {
    const sendJSON = jest.fn().mockResolvedValue({data: meeting});
    const store = mockStoreFactory({
      apiClient: {backendFeatures: {version: 19}, transport: {http: {sendJSON}}},
      core: {login: jest.fn().mockResolvedValue(undefined), init: jest.fn().mockResolvedValue(undefined)},
      actions: {
        ...actionRoot,
        authAction: {
          ...actionRoot.authAction,
          doSilentLogout: () => {
            return async () => {
              return undefined;
            };
          },
        },
        selfAction: {
          fetchSelf: () => {
            return async () => {
              return undefined;
            };
          },
        },
        clientAction: {
          doInitializeClient: () => {
            return async () => {
              return initializeClient();
            };
          },
        },
      },
      localStorage: window.localStorage,
    })(initialRootState);
    const login = (): Promise<void> => {
      const link = getJoinLink();
      if (mode === 'SSO') {
        return store.dispatch(
          actionRoot.authAction.doFinalizeSSOLogin({
            clientType: ClientType.PERMANENT,
            ...(link.kind === 'meeting' ? {meetingLink: link, password: 'secret'} : {}),
          }),
        );
      }
      return store.dispatch(
        actionRoot.authAction.doLoginAndJoin(
          {email: 'test@example.com', password: 'login-password', clientType: ClientType.PERMANENT},
          'key',
          'code',
          undefined,
          undefined,
          'secret',
        ),
      );
    };
    return {login, sendJSON};
  };

  it('keeps meeting credentials after client initialization fails and retries the meeting endpoint', async () => {
    const error = new Error('Client initialization failed');
    const initializeClient = jest.fn().mockRejectedValueOnce(error).mockResolvedValueOnce(undefined);
    const conversationJoin = jest.spyOn(conversationAction, 'doJoinConversationByCode');
    const {login, sendJSON} = createLogin(initializeClient);

    await expect(login()).rejects.toBe(error);
    expect(getJoinLink()).toEqual({
      kind: 'meeting',
      domain: 'example.com',
      key: 'key',
      code: 'code',
    });

    await login();

    expect(initializeClient).toHaveBeenCalledTimes(2);
    expect(sendJSON).toHaveBeenCalledTimes(2);
    expect(sendJSON).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        method: 'post',
        url: '/meeting/example.com/key/code/join',
        params: {password: 'secret'},
      }),
    );
    expect(conversationJoin).not.toHaveBeenCalled();
    expect(window.location.search).toBe('');
    expect(JSON.parse(window.localStorage.getItem('LOGIN_CONVERSATION_KEY') ?? '{}').data).toEqual({
      conversation: conversation.id,
      domain: conversation.domain,
      meetingPrep: {
        meetingTitle: meeting.title,
        meetingStartTime: meeting.start_time,
        qualifiedMeetingId: meeting.qualified_id,
        qualifiedConversationId: conversation,
      },
    });
  });

  it('clears meeting credentials at the device-limit handoff and keeps the destination', async () => {
    const error = new BackendError('Device limit', BackendErrorLabel.TOO_MANY_CLIENTS, HTTP_STATUS.FORBIDDEN);
    const {login} = createLogin(jest.fn().mockRejectedValue(error));

    await expect(login()).rejects.toBe(error);

    expect(window.location.search).toBe('');
    expect(JSON.parse(window.localStorage.getItem('LOGIN_CONVERSATION_KEY') ?? '{}').data.meetingPrep).toEqual(
      expect.objectContaining({qualifiedConversationId: conversation}),
    );
  });
});

describe('AuthAction', () => {
  it('authenticates a user successfully', async () => {
    const email = 'test@example.com';
    const password = 'password';
    const accessToken =
      'Ntc8CsuNMeGFaRCqhah1dSyDFmNq6m8zL1R2h5TEtLQy_4Up8jLI8CA==.v=1.k=1.d=1494355813.tda7f3557-b40c-4b00-9a4c-4710fdc07709.c=16347884158313001066';
    const response = JSON.parse(`{"expires_in":900,"access_token":"${accessToken}","token_type":"Bearer"}`);
    const spies = {
      doInitializeClient: jasmine.createSpy().and.returnValue(() => {
        return Promise.resolve();
      }),
      fetchSelf: jasmine.createSpy().and.returnValue(() => {
        return Promise.resolve();
      }),
      generateClientPayload: jasmine.createSpy().and.returnValue({}),
      setLocalStorage: jasmine.createSpy().and.returnValue(() => {
        return Promise.resolve();
      }),
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
      login: () => {
        return Promise.resolve({});
      },
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
      doInitializeClient: jasmine.createSpy().and.returnValue(() => {
        return Promise.reject({label: BackendErrorLabel.TOO_MANY_CLIENTS});
      }),
      fetchSelf: jasmine.createSpy().and.returnValue(() => {
        return Promise.resolve();
      }),
      generateClientPayload: jasmine.createSpy().and.returnValue({}),
      setLocalStorage: jasmine.createSpy().and.returnValue(() => {
        return Promise.resolve();
      }),
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
      login: () => {
        return Promise.resolve({});
      },
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

  it('treats a rate-limited two-factor login code as successfully sent', async () => {
    const emailAddress = 'test@example.com';
    const verificationCodeRequests: {
      readonly email: string;
      readonly action: VerificationActionType;
    }[] = [];
    const rateLimitError = new BackendError(
      'Verification code was already sent',
      SyntheticErrorLabel.TOO_MANY_REQUESTS,
      HTTP_STATUS.TOO_MANY_REQUESTS,
    );
    const mockedApiClient = {
      api: {
        user: {
          postVerificationCode: (email: string, action: VerificationActionType): Promise<void> => {
            verificationCodeRequests.push({email, action});
            return Promise.reject(rateLimitError);
          },
        },
      },
    } as TypeUtil.RecursivePartial<APIClient>;
    const store = mockStoreFactory({apiClient: mockedApiClient})();

    await store.dispatch(actionRoot.authAction.doSendTwoFactorLoginCode(emailAddress));

    expect(verificationCodeRequests).toEqual([
      {
        action: VerificationActionType.LOGIN,
        email: emailAddress,
      },
    ]);

    const actualActions = store.getActions();
    const expectedActions = [
      AuthActionCreator.startSendTwoFactorCode(),
      AuthActionCreator.successfulSendTwoFactorCode(),
    ];

    expect(actualActions).toEqual(expectedActions);
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
      login: () => {
        return Promise.reject(backendError);
      },
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
      logout: () => {
        return Promise.reject(backendError);
      },
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
          headInitiateLogin: () => {
            return Promise.resolve();
          },
        },
      },
    };

    const store = mockStoreFactory({
      apiClient: mockedApiClient,
    })({});
    await store.dispatch(actionRoot.authAction.validateSSOCode(ssoCode));
  });
});
