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
import {act, fireEvent, render, type RenderResult, waitFor} from '@testing-library/react';
import {Provider} from 'react-redux';
import {HashRouter} from 'react-router';
import {applyMiddleware, combineReducers, legacy_createStore, type Reducer, type Store} from 'redux';
import {withExtraArgument} from 'redux-thunk';

import {ConversationJoin} from './conversationJoin';
import {ConversationJoinInvalid} from './conversationJoinInvalid';
import {Login} from './login/login';
import {SingleSignOnForm} from './login/singleSignOnForm';

import {Config} from '../../Config';
import {actionRoot} from '../module/action';
import {type AppActions, SelfActionCreator} from '../module/action/creator';
import {initialRootState, reducers, type RootState, type ThunkDispatch} from '../module/reducer';
import {mockStoreFactory} from '../util/test/mockStoreFactory';
import {mountComponent, withIntl, withTheme} from '../util/test/testUtil';

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

describe('meeting links in the existing auth flow', () => {
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
    jest.spyOn(actionRoot.authAction, 'doInit').mockReturnValue(async () => {
      return undefined;
    });
    jest.spyOn(actionRoot.clientAction, 'doGetAllClients').mockReturnValue(async () => {
      return [];
    });
  });
  afterEach(() => {
    jest.restoreAllMocks();
    window.history.replaceState({}, '', '/');
    window.localStorage.removeItem('LOGIN_CONVERSATION_KEY');
  });

  it.each(['member', 'guest'])('joins as %s without fetching conversation info or showing metadata', async mode => {
    const sendJSON = jest.fn().mockResolvedValue({data: {...metadata, qualified_conversation: conversation}});
    const register = jest.spyOn(actionRoot.authAction, 'doRegisterWireless').mockReturnValue(async () => {
      return undefined;
    });
    const date = jest.spyOn(actionRoot.notificationAction, 'setLastEventDate');
    const store = mockStoreFactory({
      apiClient: {backendFeatures: {version: 19}, transport: {http: {sendJSON}}},
      actions: actionRoot,
      localStorage: window.localStorage,
    })({
      ...initialRootState,
      selfState: {...initialRootState.selfState, self: {...initialRootState.selfState.self, name: 'Member'}},
      clientState: {...initialRootState.clientState, clients: []},
    });
    const page = mountComponent(<ConversationJoin />, store);
    await waitFor(() => {
      return expect(sendJSON).toHaveBeenCalledWith(expect.objectContaining({method: 'get'}));
    });
    expect(page.getByTestId('status-join-headline')).toHaveTextContent('Join meeting');
    expect(sendJSON).toHaveBeenCalledTimes(1);
    expect(page.queryByText('Private meeting title')).toBeNull();
    if (mode === 'guest') {
      fireEvent.change(page.getByTestId('enter-name'), {target: {value: 'Guest'}});
      fireEvent.click(page.getByTestId('do-accept-terms'));
      fireEvent.click(page.getByTestId('do-join-as-guest'));
    } else {
      fireEvent.click(page.getByTestId('do-join-as-member'));
    }
    await waitFor(() => {
      return expect(sendJSON).toHaveBeenCalledWith(
        expect.objectContaining({method: 'post', url: '/meeting/example.com/key/code/join'}),
      );
    });
    await waitFor(() => {
      return expect(window.location.search).toBe('');
    });
    expect(register).toHaveBeenCalledTimes(mode === 'guest' ? 1 : 0);
    expect(date).not.toHaveBeenCalled();
    expect(JSON.parse(window.localStorage.getItem('LOGIN_CONVERSATION_KEY') ?? '{}')).toEqual({
      data: {conversation: conversation.id, domain: conversation.domain, meetingPrep: prep},
    });
  });

  it('uses the meeting error route when link validation fails', async () => {
    const error = Object.assign(new Error('Not found'), {label: 'meeting-not-found', code: 404});
    const sendJSON = jest.fn().mockRejectedValue(error);
    const store = mockStoreFactory({
      apiClient: {backendFeatures: {version: 19}, transport: {http: {sendJSON}}},
      actions: actionRoot,
      localStorage: window.localStorage,
    })({
      ...initialRootState,
      selfState: {...initialRootState.selfState, self: {...initialRootState.selfState.self, name: 'Member'}},
      clientState: {...initialRootState.clientState, clients: []},
    });
    mountComponent(<ConversationJoin />, store);
    await waitFor(() => {
      return expect(window.location.hash).toBe('#/join-meeting-invalid');
    });
  });

  type RealJoinSetup = {
    store: Store<RootState, AppActions>;
    register: jest.Mock;
    logout: jest.Mock;
    renderPage: () => RenderResult;
  };

  const setupRealReducerJoin = (sendJSON: jest.Mock, initialState: RootState = initialRootState): RealJoinSetup => {
    const register = jest.fn().mockResolvedValue(undefined);
    const logout = jest.fn().mockResolvedValue(undefined);
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
          core: {register, logout},
          actions: {
            ...actionRoot,
            selfAction: {
              fetchSelf: () => {
                return async (dispatch: (action: ReturnType<typeof SelfActionCreator.successfulFetchSelf>) => void) => {
                  dispatch(
                    SelfActionCreator.successfulFetchSelf({
                      ...initialRootState.selfState.self,
                      id: 'guest-id',
                      name: 'Guest',
                      expires_at: '2026-01-01T12:00:00Z',
                    }),
                  );
                };
              },
            },
            clientAction: {
              ...actionRoot.clientAction,
              doInitializeClient: () => {
                return async () => {
                  return undefined;
                };
              },
            },
          },
          localStorage: window.localStorage,
        }),
      ),
    );
    const renderPage = (): RenderResult => {
      return render(
        <Provider store={store}>
          <HashRouter>{withTheme(withIntl(<ConversationJoin />))}</HashRouter>
        </Provider>,
      );
    };
    return {store, register, logout, renderPage};
  };

  const wrongPassword = (): BackendError & {label: string} => {
    return Object.assign(new BackendError('Wrong password', undefined, 403), {label: 'invalid-meeting-password'});
  };

  const setupPasswordRetry = async (): Promise<RealJoinSetup & {page: RenderResult; getJoins: () => number}> => {
    let joins = 0;
    const sendJSON = jest.fn().mockImplementation(async request => {
      if (request.method === 'get') {
        throw wrongPassword();
      }
      if (request.method === 'post' && joins++ === 0) {
        throw wrongPassword();
      }
      return {data: {...metadata, qualified_conversation: conversation}};
    });
    const setup = setupRealReducerJoin(sendJSON);
    const page = setup.renderPage();
    await waitFor(() => {
      return expect(setup.store.getState().conversationState.hasPassword).toBe(true);
    });
    fireEvent.change(page.getByTestId('enter-name'), {target: {value: 'Alice'}});
    fireEvent.click(page.getByTestId('do-accept-terms'));
    fireEvent.click(page.getByTestId('do-join-as-guest'));
    fireEvent.change(page.getByTestId('guest-link-join-password-input'), {target: {value: 'wrong-password'}});
    fireEvent.click(page.getByTestId('guest-link-join-submit-button'));
    await waitFor(() => {
      return expect(joins).toBe(1);
    });
    expect(setup.register).toHaveBeenCalledTimes(1);
    expect(setup.register).toHaveBeenCalledWith(expect.objectContaining({name: 'Alice'}), expect.anything());
    return {
      ...setup,
      page,
      getJoins: () => {
        return joins;
      },
    };
  };

  const submitCorrectPassword = async (page: RenderResult): Promise<void> => {
    fireEvent.change(page.getByTestId('guest-link-join-password-input'), {target: {value: 'correct-password'}});
    fireEvent.click(page.getByTestId('guest-link-join-submit-button'));
    await waitFor(() => {
      return expect(window.location.search).toBe('');
    });
  };

  it('reuses registration when the name is unchanged on the same mount', async () => {
    const {page, register, getJoins} = await setupPasswordRetry();
    await submitCorrectPassword(page);
    expect(getJoins()).toBe(2);
    expect(register).toHaveBeenCalledTimes(1);
  });

  it('registers the new name on a password retry on the same mount', async () => {
    const {page, register, getJoins} = await setupPasswordRetry();
    fireEvent.change(page.getByTestId('enter-name'), {target: {value: 'Bob'}});
    await submitCorrectPassword(page);
    expect(getJoins()).toBe(2);
    expect(register).toHaveBeenCalledTimes(2);
    expect(register).toHaveBeenLastCalledWith(expect.objectContaining({name: 'Bob'}), expect.anything());
  });

  it('reuses registration when only surrounding whitespace changes', async () => {
    const {page, register, getJoins} = await setupPasswordRetry();
    fireEvent.change(page.getByTestId('enter-name'), {target: {value: ' Alice '}});
    await submitCorrectPassword(page);
    expect(getJoins()).toBe(2);
    expect(register).toHaveBeenCalledTimes(1);
  });

  it('registers again after remounting', async () => {
    const {page, renderPage, register, getJoins} = await setupPasswordRetry();
    page.unmount();
    const remountedPage = renderPage();
    await waitFor(() => {
      return expect(remountedPage.getByTestId('do-join-as-guest')).toBeInTheDocument();
    });
    fireEvent.change(remountedPage.getByTestId('enter-name'), {target: {value: 'Remounted Guest'}});
    fireEvent.click(remountedPage.getByTestId('do-accept-terms'));
    fireEvent.click(remountedPage.getByTestId('do-join-as-guest'));
    await submitCorrectPassword(remountedPage);
    expect(getJoins()).toBe(2);
    expect(register).toHaveBeenCalledTimes(2);
    expect(register).toHaveBeenLastCalledWith(expect.objectContaining({name: 'Remounted Guest'}), expect.anything());
  });

  it('registers again after logout', async () => {
    const {page, store, register, logout, getJoins} = await setupPasswordRetry();
    expect(store.getState().authState.isAuthenticated).toBe(true);
    await act(async () => {
      await (store.dispatch as ThunkDispatch)(actionRoot.authAction.doLogout());
    });
    expect(logout).toHaveBeenCalled();
    expect(store.getState().authState.isAuthenticated).toBe(false);
    await submitCorrectPassword(page);
    expect(getJoins()).toBe(2);
    expect(register).toHaveBeenCalledTimes(2);
  });

  it('registers the entered name when a temporary guest session was restored', async () => {
    const sendJSON = jest.fn().mockResolvedValue({data: {...metadata, qualified_conversation: conversation}});
    const {register, renderPage} = setupRealReducerJoin(sendJSON, {
      ...initialRootState,
      authState: {...initialRootState.authState, isAuthenticated: true},
      selfState: {
        ...initialRootState.selfState,
        self: {...initialRootState.selfState.self, name: 'Old', expires_at: '2099-01-01T12:00:00Z'},
      },
    });
    const page = renderPage();
    await waitFor(() => {
      return expect(sendJSON).toHaveBeenCalledWith(expect.objectContaining({method: 'get'}));
    });
    fireEvent.change(page.getByTestId('enter-name'), {target: {value: 'New'}});
    fireEvent.click(page.getByTestId('do-accept-terms'));
    fireEvent.click(page.getByTestId('do-join-as-guest'));
    await waitFor(() => {
      return expect(register).toHaveBeenCalledWith(expect.objectContaining({name: 'New'}), expect.anything());
    });
    expect(register).toHaveBeenCalledTimes(1);
  });

  it('waits for a meeting password before automatic SSO and does not automatically retry a wrong password', async () => {
    window.history.replaceState({}, '', `${window.location.pathname}${window.location.search}&sso_auto_login=true`);
    const wrongPassword = Object.assign(new BackendError('Wrong password', undefined, 403), {
      label: 'invalid-meeting-password',
    });
    const doLogin = jest.fn().mockResolvedValue(undefined);
    jest.spyOn(actionRoot.authAction, 'validateSSOCode').mockReturnValue(async () => {
      return undefined;
    });
    const sendJSON = jest.fn().mockRejectedValue(wrongPassword);
    const store = mockStoreFactory({
      apiClient: {backendFeatures: {version: 19}, transport: {http: {sendJSON}}},
      core: {init: jest.fn().mockResolvedValue(undefined)},
      actions: {
        ...actionRoot,
        selfAction: {
          fetchSelf: () => {
            return async () => {
              return undefined;
            };
          },
        },
      },
      localStorage: window.localStorage,
    })({
      ...initialRootState,
      conversationState: {...initialRootState.conversationState, hasPassword: true},
    });
    const page = mountComponent(
      <SingleSignOnForm initialCode="wire-cb6e4dfc-a4b0-4c59-a31d-303a7f5eb5ab" doLogin={doLogin} />,
      store,
    );
    await waitFor(() => {
      return expect(page.getByTestId('guest-link-join-password-input')).toBeInTheDocument();
    });
    expect(doLogin).not.toHaveBeenCalled();

    fireEvent.change(page.getByTestId('guest-link-join-password-input'), {target: {value: 'wrong-password'}});
    fireEvent.click(page.getByTestId('guest-link-join-submit-button'));

    await waitFor(() => {
      return expect(doLogin).toHaveBeenCalledTimes(1);
    });
    await waitFor(() => {
      return expect(page.getByTestId('guest-link-join-password-input')).toBeInTheDocument();
    });
    expect(doLogin).toHaveBeenCalledTimes(1);
    expect(sendJSON).toHaveBeenCalledWith(
      expect.objectContaining({method: 'post', params: {password: 'wrong-password'}}),
    );
  });

  it('passes meeting credentials through the regular login lifecycle', async () => {
    const login = jest.spyOn(actionRoot.authAction, 'doLoginAndJoin').mockReturnValue(async () => {
      return undefined;
    });
    const sendJSON = jest.fn().mockResolvedValue({data: {title: 'Private meeting title'}});
    const store = mockStoreFactory({
      apiClient: {backendFeatures: {version: 19}, transport: {http: {sendJSON}}},
      actions: actionRoot,
      localStorage: window.localStorage,
    })(initialRootState);
    const page = mountComponent(<Login embedded />, store);
    fireEvent.change(page.getByTestId('enter-email'), {target: {value: 'test@example.com'}});
    fireEvent.change(page.getByTestId('enter-password'), {target: {value: 'login-password'}});
    fireEvent.click(page.getByTestId('do-sign-in'));
    await waitFor(() => {
      return expect(login).toHaveBeenCalledWith(
        expect.objectContaining({email: 'test@example.com'}),
        'key',
        'code',
        undefined,
        undefined,
        undefined,
        expect.objectContaining({
          doJoinByLink: expect.any(Function),
          doJoinMeetingLink: expect.any(Function),
        }),
      );
    });
    expect(page.queryByText('Private meeting title')).toBeNull();
  });

  it.each([false, true])('joins after SSO before creating the device (device limit=%s)', async atDeviceLimit => {
    const steps: string[] = [];
    const sendJSON = jest.fn().mockImplementation(async config => {
      if (config.method === 'post') {
        steps.push('join');
      }
      return {data: {...metadata, qualified_conversation: conversation}};
    });
    const setLocalStorage = jest.fn((key: string) => {
      return async () => {
        if (key === 'LOGIN_CONVERSATION_KEY') {
          steps.push('persistTarget');
        }
      };
    });
    const doInitializeClient = jest.fn(() => {
      return async () => {
        steps.push('initializeClient');
        if (atDeviceLimit) {
          throw new BackendError('Device limit', BackendErrorLabel.TOO_MANY_CLIENTS, 403);
        }
      };
    });
    const doLogin = jest.fn().mockResolvedValue(undefined);
    jest.spyOn(actionRoot.authAction, 'validateSSOCode').mockReturnValue(async () => {
      return undefined;
    });
    const store = mockStoreFactory({
      apiClient: {backendFeatures: {version: 19}, transport: {http: {sendJSON}}},
      core: {init: jest.fn().mockResolvedValue(undefined)},
      actions: {
        localStorageAction: {setLocalStorage},
        selfAction: {
          fetchSelf: () => {
            return async () => {
              return undefined;
            };
          },
        },
        clientAction: {doInitializeClient},
      },
    })(initialRootState);
    const page = mountComponent(<SingleSignOnForm doLogin={doLogin} />, store);
    fireEvent.change(page.getByTestId('enter-code'), {target: {value: 'wire-cb6e4dfc-a4b0-4c59-a31d-303a7f5eb5ab'}});
    fireEvent.click(page.getByTestId('do-sso-sign-in'));
    await waitFor(() => {
      return expect(window.location.hash).toBe(atDeviceLimit ? '#/clients' : '#/historyinfo');
    });
    expect(steps).toEqual(['join', 'persistTarget', 'initializeClient']);
    expect(setLocalStorage).toHaveBeenCalledWith('LOGIN_CONVERSATION_KEY', {
      conversation: 'conversation-id',
      domain: 'example.com',
      meetingPrep: prep,
    });
    expect(
      sendJSON.mock.calls.filter(([config]) => {
        return config.method === 'post';
      }),
    ).toHaveLength(1);
    expect(doLogin).toHaveBeenCalledTimes(1);
    expect(window.location.search).toBe('');
  });

  it.each([
    {label: 'meeting-not-found', code: 404, headline: 'Meeting not found'},
    {label: 'meeting-api-unsupported', code: undefined, headline: 'Meeting links are unavailable'},
    {label: undefined, code: undefined, headline: 'Unable to check the meeting link'},
  ])('shows meeting-specific errors: $headline', ({label, code, headline}) => {
    const error = Object.assign(new Error('Check failed'), {label, code});
    const page = mountComponent(
      <ConversationJoinInvalid />,
      mockStoreFactory()({...initialRootState, conversationState: {...initialRootState.conversationState, error}}),
    );
    expect(page.getByTestId('status-invalid-headline')).toHaveTextContent(headline);
    if (label === undefined) {
      fireEvent.click(page.getByRole('button', {name: 'Try again'}));
      expect(window.location.hash).toBe('#/join-meeting');
    }
  });
});
