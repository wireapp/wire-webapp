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

import {BackendError, BackendErrorLabel} from '../../apiClient/http';
import {fireEvent, render, type RenderResult, waitFor} from '@testing-library/react';
import {asyncNoop} from 'noop-esm';
import {Provider} from 'react-redux';
import {HashRouter} from 'react-router';
import {applyMiddleware, combineReducers, legacy_createStore, type Reducer} from 'redux';
import {withExtraArgument} from 'redux-thunk';

import {Login} from './login/login';
import {SingleSignOnForm} from './login/singleSignOnForm';
import {MeetingJoin} from './meetingJoin';
import {MeetingLinkGate, MeetingLinkSession} from './meetingLinkGate';

import {Config} from '../../Config';
import {actionRoot} from '../module/action';
import {MeetingAdmissionError} from '../module/action/authAction';
import {type AppActions} from '../module/action/creator';
import {initialRootState, reducers, type RootState} from '../module/reducer';
import {mockStoreFactory} from '../util/test/mockStoreFactory';
import {mountComponent, withIntl, withTheme} from '../util/test/testUtil';
import {clearMeetingJoinParameters} from '../util/joinLink';

const conversation = {id: 'conversation-id', domain: 'example.com'};
const metadata = {
  qualified_id: {id: 'meeting-id', domain: 'example.com'},
  title: 'Private meeting title',
  start_time: '2099-01-01T12:00:00Z',
};
const prep = {
  meetingTitle: metadata.title,
  meetingStartTime: metadata.start_time,
  qualifiedMeetingId: metadata.qualified_id,
  qualifiedConversationId: conversation,
};

describe('dedicated meeting link flow', () => {
  const joinResponse = {data: {...metadata, qualified_conversation: conversation}};

  beforeEach(() => {
    window.history.replaceState(
      {},
      '',
      '/auth/?meeting_domain=example.com&meeting_key=key&meeting_code=code#/join-meeting',
    );
    const config = Config.getConfig();
    jest.spyOn(Config, 'getConfig').mockReturnValue({
      ...config,
      FEATURE: {...config.FEATURE, ENABLE_EXTRA_CLIENT_ENTROPY: false, ENABLE_DOMAIN_DISCOVERY: false},
    });
    jest.spyOn(actionRoot.authAction, 'doInit').mockReturnValue(asyncNoop);
  });

  afterEach(() => {
    jest.restoreAllMocks();
    window.history.replaceState({}, '', '/');
    window.localStorage.removeItem('LOGIN_CONVERSATION_KEY');
  });

  const setup = (sendJSON: jest.Mock, isAuthenticated = false, apiVersion = 19): RenderResult => {
    const store = mockStoreFactory({
      apiClient: {backendFeatures: {version: apiVersion}, transport: {http: {sendJSON}}},
      actions: actionRoot,
    })({...initialRootState, authState: {...initialRootState.authState, isAuthenticated}});
    return mountComponent(
      <MeetingLinkSession>
        <MeetingJoin />
      </MeetingLinkSession>,
      store,
    );
  };

  const setupRestoredSession = (
    sendJSON: jest.Mock,
    {
      name,
      expiresAt,
      logout = jest.fn().mockResolvedValue(undefined),
    }: {
      name: string;
      expiresAt?: string;
      logout?: jest.Mock;
    },
  ): {page: RenderResult; logout: jest.Mock} => {
    const initialState: RootState = {
      ...initialRootState,
      authState: {...initialRootState.authState, isAuthenticated: true},
      selfState: {
        ...initialRootState.selfState,
        self: {...initialRootState.selfState.self, name, expires_at: expiresAt},
      },
    };
    const reduce = combineReducers(reducers);
    const rootReducer: Reducer<RootState, AppActions> = (state, action) => {
      return reduce(state, action);
    };
    const store = legacy_createStore(
      rootReducer,
      initialState,
      applyMiddleware(
        withExtraArgument({
          apiClient: {backendFeatures: {version: 19}, transport: {http: {sendJSON}}},
          core: {logout},
          actions: actionRoot,
          localStorage: window.localStorage,
        }),
      ),
    );
    const page = render(
      <Provider store={store}>
        <HashRouter>
          {withTheme(
            withIntl(
              <MeetingLinkSession>
                <MeetingJoin />
              </MeetingLinkSession>,
            ),
          )}
        </HashRouter>
      </Provider>,
    );
    return {page, logout};
  };

  it('registers a new temporary guest and hands off the linked meeting', async () => {
    const sendJSON = jest.fn().mockResolvedValue(joinResponse);
    const register = jest.spyOn(actionRoot.authAction, 'doRegisterWireless').mockReturnValue(asyncNoop);
    const page = setup(sendJSON);
    const name = await page.findByTestId('enter-name');
    expect(page.getByTestId('status-join-headline')).toHaveTextContent('Join meeting');
    expect(sendJSON).toHaveBeenCalledTimes(1);

    fireEvent.change(name, {target: {value: 'Guest'}});
    fireEvent.click(page.getByTestId('do-accept-terms'));
    fireEvent.click(page.getByTestId('do-join-as-guest'));

    await waitFor(() => {
      return expect(window.location.search).toBe('');
    });
    expect(register).toHaveBeenCalledWith(
      expect.objectContaining({name: 'Guest'}),
      {shouldInitializeClient: true},
      undefined,
    );
    expect(JSON.parse(window.localStorage.getItem('LOGIN_CONVERSATION_KEY') ?? '{}').data.meetingPrep).toEqual(prep);
  });

  it('keeps the registered guest when admission requires a new password', async () => {
    const sendJSON = jest
      .fn()
      .mockResolvedValueOnce(joinResponse)
      .mockRejectedValueOnce(new BackendError('Password required', BackendErrorLabel.INVALID_MEETING_PASSWORD, 403))
      .mockResolvedValue(joinResponse);
    const register = jest.spyOn(actionRoot.authAction, 'doRegisterWireless').mockReturnValue(asyncNoop);
    const page = setup(sendJSON);

    fireEvent.change(await page.findByTestId('enter-name'), {target: {value: 'Guest'}});
    fireEvent.click(page.getByTestId('do-accept-terms'));
    fireEvent.click(page.getByTestId('do-join-as-guest'));

    const passwordInput = await page.findByTestId('guest-link-join-password-input');
    expect(register).toHaveBeenCalledTimes(1);
    fireEvent.change(passwordInput, {target: {value: 'new-password'}});
    fireEvent.click(page.getByTestId('guest-link-join-submit-button'));

    await waitFor(() => {
      return expect(window.location.search).toBe('');
    });
    expect(register).toHaveBeenCalledTimes(1);
    expect(
      sendJSON.mock.calls.map(([request]) => {
        return request.method;
      }),
    ).toEqual(['get', 'post', 'get', 'post']);
  });

  it('keeps the existing-account warning available after meeting login', async () => {
    jest.spyOn(actionRoot.authAction, 'doLoginAndJoin').mockReturnValue(async () => {
      clearMeetingJoinParameters();
    });
    const sendJSON = jest.fn().mockResolvedValue(joinResponse);
    const store = mockStoreFactory({
      apiClient: {backendFeatures: {version: 19}, transport: {http: {sendJSON}}},
      actions: actionRoot,
    })({
      ...initialRootState,
      authState: {
        ...initialRootState.authState,
        account: {...initialRootState.authState.account, shouldDisplayWarning: true},
      },
    });
    const page = mountComponent(
      <MeetingLinkSession>
        <MeetingLinkGate>
          <Login embedded />
        </MeetingLinkGate>
      </MeetingLinkSession>,
      store,
    );

    fireEvent.change(await page.findByTestId('enter-email'), {target: {value: 'member@example.com'}});
    fireEvent.change(page.getByTestId('enter-password'), {target: {value: 'login-password'}});
    fireEvent.click(page.getByTestId('do-sign-in'));

    expect(await page.findByText('Email claimed by an on-premises backend')).toBeInTheDocument();
    expect(window.location.search).toBe('');
  });

  it('waits for account confirmation before admitting an active session', async () => {
    const sendJSON = jest.fn().mockResolvedValue(joinResponse);
    const register = jest.spyOn(actionRoot.authAction, 'doRegisterWireless');
    const page = setup(sendJSON, true);

    const joinButton = await page.findByRole('button', {name: 'Join meeting'});
    expect(
      sendJSON.mock.calls.map(([request]) => {
        return request.method;
      }),
    ).toEqual(['get']);
    fireEvent.click(joinButton);

    await waitFor(() => {
      return expect(window.location.search).toBe('');
    });
    expect(page.queryByTestId('enter-name')).toBeNull();
    expect(register).not.toHaveBeenCalled();
    expect(
      sendJSON.mock.calls.map(([request]) => {
        return request.method;
      }),
    ).toEqual(['get', 'post']);
  });

  it.each([
    {name: 'Member', expiresAt: undefined},
    {name: 'Temporary Guest', expiresAt: '2099-01-01T12:00:00Z'},
  ])('shows the account chooser and guest form for restored $name', async ({name, expiresAt}) => {
    const sendJSON = jest.fn().mockResolvedValue(joinResponse);
    const {page} = setupRestoredSession(sendJSON, {name, expiresAt});

    expect(await page.findByText(`You are logged in as ${name}`)).toBeInTheDocument();
    expect(page.getByTestId('enter-name')).toBeInTheDocument();
    expect(page.getByTestId('go-logout')).toHaveTextContent('Join with another account');
    expect(page.getByTestId('do-join-as-member')).toHaveTextContent('Join meeting');
    expect(
      sendJSON.mock.calls.map(([request]) => {
        return request.method;
      }),
    ).toEqual(['get']);

    fireEvent.click(page.getByTestId('do-join-as-member'));
    await waitFor(() => {
      return expect(
        sendJSON.mock.calls.map(([request]) => {
          return request.method;
        }),
      ).toEqual(['get', 'post']);
    });
  });

  it('switches to sign-in on the same page and retains the verified link', async () => {
    const sendJSON = jest.fn().mockResolvedValue(joinResponse);
    jest.spyOn(actionRoot.authAction, 'doRegisterWireless').mockReturnValue(asyncNoop);
    const {page, logout} = setupRestoredSession(sendJSON, {name: 'Member'});

    fireEvent.click(await page.findByTestId('go-logout'));

    expect(await page.findByTestId('enter-email')).toBeInTheDocument();
    expect(page.queryByTestId('do-join-as-member')).toBeNull();
    expect(page.getByTestId('enter-name')).toBeInTheDocument();
    expect(window.location.search).toContain('meeting_key=key');
    expect(
      sendJSON.mock.calls.map(([request]) => {
        return request.method;
      }),
    ).toEqual(['get']);
    expect(logout).toHaveBeenCalledTimes(1);

    fireEvent.change(page.getByTestId('enter-name'), {target: {value: 'New Guest'}});
    fireEvent.click(page.getByTestId('do-accept-terms'));
    fireEvent.click(page.getByTestId('do-join-as-guest'));
    await waitFor(() => {
      return expect(
        sendJSON.mock.calls.map(([request]) => {
          return request.method;
        }),
      ).toEqual(['get', 'post']);
    });
  });

  it('keeps the account chooser and shows the logout failure', async () => {
    const sendJSON = jest.fn().mockResolvedValue(joinResponse);
    const logout = jest.fn().mockRejectedValue(new Error('Logout unavailable'));
    const {page} = setupRestoredSession(sendJSON, {name: 'Member', logout});

    fireEvent.click(await page.findByTestId('go-logout'));

    expect(await page.findByRole('alert')).toHaveTextContent('Logout unavailable');
    expect(page.getByTestId('do-join-as-member')).toBeInTheDocument();
    expect(page.getByTestId('go-logout')).toBeInTheDocument();
    expect(page.queryByTestId('enter-email')).toBeNull();
    expect(
      sendJSON.mock.calls.map(([request]) => {
        return request.method;
      }),
    ).toEqual(['get']);
  });

  it('shows the account layout after password verification and uses that password for admission', async () => {
    const sendJSON = jest
      .fn()
      .mockRejectedValueOnce(new BackendError('Password required', BackendErrorLabel.INVALID_MEETING_PASSWORD, 403))
      .mockResolvedValue(joinResponse);
    const {page} = setupRestoredSession(sendJSON, {name: 'Member'});

    const input = await page.findByTestId('guest-link-join-password-input');
    expect(page.queryByTestId('do-join-as-member')).toBeNull();
    fireEvent.change(input, {target: {value: 'meeting-password'}});
    fireEvent.click(page.getByTestId('guest-link-join-submit-button'));

    expect(await page.findByText('You are logged in as Member')).toBeInTheDocument();
    expect(page.getByTestId('enter-name')).toBeInTheDocument();
    expect(
      sendJSON.mock.calls.map(([request]) => {
        return request.method;
      }),
    ).toEqual(['get', 'get']);

    fireEvent.click(page.getByTestId('do-join-as-member'));
    await waitFor(() => {
      return expect(sendJSON).toHaveBeenCalledWith(
        expect.objectContaining({method: 'post', params: {password: 'meeting-password'}}),
      );
    });
  });

  it('verifies the password before starting sign-in and passes it to the join request', async () => {
    const invalidPassword = new BackendError('Wrong password', BackendErrorLabel.INVALID_MEETING_PASSWORD, 403);
    const sendJSON = jest
      .fn()
      .mockRejectedValueOnce(invalidPassword)
      .mockRejectedValueOnce(new BackendError('Wrong password', BackendErrorLabel.INVALID_MEETING_PASSWORD, 403))
      .mockResolvedValue(joinResponse);
    const page = setup(sendJSON);

    const input = await page.findByTestId('guest-link-join-password-input');
    expect(actionRoot.authAction.doInit).not.toHaveBeenCalled();
    expect(page.queryByTestId('enter-name')).toBeNull();

    fireEvent.change(input, {target: {value: 'wrong-password'}});
    fireEvent.click(page.getByTestId('guest-link-join-submit-button'));
    expect(await page.findByText('Unable to join the meeting. Check the password and try again.')).toBeInTheDocument();
    expect(actionRoot.authAction.doInit).not.toHaveBeenCalled();

    fireEvent.change(input, {target: {value: 'meeting-password'}});
    fireEvent.click(page.getByTestId('guest-link-join-submit-button'));
    fireEvent.change(await page.findByTestId('enter-name'), {target: {value: 'Guest'}});
    fireEvent.click(page.getByTestId('do-accept-terms'));
    jest.spyOn(actionRoot.authAction, 'doRegisterWireless').mockReturnValue(asyncNoop);
    fireEvent.click(page.getByTestId('do-join-as-guest'));

    await waitFor(() => {
      return expect(window.location.search).toBe('');
    });
    expect(
      sendJSON.mock.calls.slice(1).map(([request]) => {
        return [request.method, request.params];
      }),
    ).toEqual([
      ['get', {password: 'wrong-password'}],
      ['get', {password: 'meeting-password'}],
      ['post', {password: 'meeting-password'}],
    ]);
  });

  it('returns to the password prompt if protection changes between validation and admission', async () => {
    const sendJSON = jest
      .fn()
      .mockResolvedValueOnce(joinResponse)
      .mockRejectedValueOnce(new BackendError('Password required', BackendErrorLabel.INVALID_MEETING_PASSWORD, 403));
    const page = setup(sendJSON, true);

    fireEvent.click(await page.findByRole('button', {name: 'Join meeting'}));

    expect(await page.findByTestId('guest-link-join-password-input')).toBeInTheDocument();
    expect(
      sendJSON.mock.calls.map(([request]) => {
        return request.method;
      }),
    ).toEqual(['get', 'post']);
  });

  it('shows an unavailable link before restoring the session', async () => {
    const page = setup(
      jest.fn().mockRejectedValue(new BackendError('Not found', BackendErrorLabel.MEETING_NOT_FOUND, 404)),
    );

    expect(await page.findByText('Meeting not found')).toBeInTheDocument();
    expect(actionRoot.authAction.doInit).not.toHaveBeenCalled();
    expect(page.queryByTestId('enter-name')).toBeNull();
  });

  it('lets an active session retry after a transient admission failure', async () => {
    const sendJSON = jest
      .fn()
      .mockResolvedValueOnce(joinResponse)
      .mockRejectedValueOnce(new Error('Network unavailable'))
      .mockResolvedValue(joinResponse);
    const page = setup(sendJSON, true);

    fireEvent.click(await page.findByRole('button', {name: 'Join meeting'}));

    fireEvent.click(await page.findByRole('button', {name: 'Try again'}));
    fireEvent.click(await page.findByRole('button', {name: 'Join meeting'}));

    await waitFor(() => {
      return expect(window.location.search).toBe('');
    });
    expect(
      sendJSON.mock.calls.map(([request]) => {
        return request.method;
      }),
    ).toEqual(['get', 'post', 'post']);
  });

  it('shows the unsupported screen without sending a link check on older backends', async () => {
    const sendJSON = jest.fn();
    const page = setup(sendJSON, false, 18);

    expect(await page.findByText('Meeting links are unavailable')).toBeInTheDocument();
    expect(sendJSON).not.toHaveBeenCalled();
  });

  it('checks the meeting password before automatic SSO after a redirect', async () => {
    const ssoCode = 'wire-cb6e4dfc-a4b0-4c59-a31d-303a7f5eb5ab';
    window.history.replaceState(
      {},
      '',
      `/auth/?meeting_domain=example.com&meeting_key=key&meeting_code=code&sso_auto_login=true#/sso/${ssoCode}`,
    );
    const doLogin = jest.fn().mockResolvedValue(undefined);
    jest.spyOn(actionRoot.authAction, 'validateSSOCode').mockReturnValue(asyncNoop);
    const finalize = jest.spyOn(actionRoot.authAction, 'doFinalizeSSOLogin').mockReturnValue(asyncNoop);
    const sendJSON = jest
      .fn()
      .mockRejectedValueOnce(new BackendError('Password required', BackendErrorLabel.INVALID_MEETING_PASSWORD, 403))
      .mockResolvedValue(joinResponse);
    const store = mockStoreFactory({
      apiClient: {backendFeatures: {version: 19}, transport: {http: {sendJSON}}},
      actions: actionRoot,
    })(initialRootState);
    const page = mountComponent(
      <MeetingLinkSession>
        <MeetingLinkGate>
          <SingleSignOnForm doLogin={doLogin} initialCode={ssoCode} />
        </MeetingLinkGate>
      </MeetingLinkSession>,
      store,
    );

    const input = await page.findByTestId('guest-link-join-password-input');
    expect(doLogin).not.toHaveBeenCalled();
    fireEvent.change(input, {target: {value: 'secret-password'}});
    fireEvent.click(page.getByTestId('guest-link-join-submit-button'));

    await waitFor(() => {
      return expect(finalize).toHaveBeenCalledWith(
        expect.objectContaining({password: 'secret-password', meetingLink: expect.objectContaining({key: 'key'})}),
        expect.anything(),
      );
    });
  });

  it('retries SSO meeting admission without signing in again', async () => {
    const ssoCode = 'wire-cb6e4dfc-a4b0-4c59-a31d-303a7f5eb5ab';
    window.history.replaceState(
      {},
      '',
      `/auth/?meeting_domain=example.com&meeting_key=key&meeting_code=code&sso_auto_login=true#/sso/${ssoCode}`,
    );
    const passwordError = new BackendError('Password required', BackendErrorLabel.INVALID_MEETING_PASSWORD, 403);
    const doLogin = jest.fn().mockResolvedValue(undefined);
    jest.spyOn(actionRoot.authAction, 'validateSSOCode').mockReturnValue(asyncNoop);
    const finalize = jest
      .spyOn(actionRoot.authAction, 'doFinalizeSSOLogin')
      .mockReturnValueOnce(async () => {
        throw new MeetingAdmissionError(passwordError);
      })
      .mockReturnValue(asyncNoop);
    const sendJSON = jest.fn().mockResolvedValue(joinResponse);
    const store = mockStoreFactory({
      apiClient: {backendFeatures: {version: 19}, transport: {http: {sendJSON}}},
      actions: actionRoot,
    })(initialRootState);
    const page = mountComponent(
      <MeetingLinkSession>
        <MeetingLinkGate>
          <SingleSignOnForm doLogin={doLogin} initialCode={ssoCode} />
        </MeetingLinkGate>
      </MeetingLinkSession>,
      store,
    );

    const passwordInput = await page.findByTestId('guest-link-join-password-input');
    fireEvent.change(passwordInput, {target: {value: 'new-password'}});
    fireEvent.click(page.getByTestId('guest-link-join-submit-button'));

    await waitFor(() => {
      return expect(finalize).toHaveBeenCalledTimes(2);
    });
    expect(finalize).toHaveBeenLastCalledWith(
      expect.objectContaining({password: 'new-password', meetingLink: expect.objectContaining({key: 'key'})}),
      expect.anything(),
    );
    expect(doLogin).toHaveBeenCalledTimes(1);
  });
});
