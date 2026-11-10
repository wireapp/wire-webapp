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

import {BackendError, BackendErrorLabel} from '@wireapp/api-client/lib/http';
import {ClientType} from '@wireapp/api-client/lib/client';

import {joinLinkAction} from './joinLinkAction';
import {conversationAction} from './conversationAction';
import {authAction} from './authAction';
import {ConversationActionCreator} from './creator';

import {mockStoreFactory} from '../../util/test/mockStoreFactory';
import {initialRootState} from '../reducer';
import {conversationReducer, initialConversationState} from '../reducer/conversationReducer';

const link = {kind: 'meeting' as const, domain: 'example.com', key: 'key', code: 'code'};
const metadata = {
  qualified_id: {id: 'meeting-id', domain: 'example.com'},
  title: 'Private title',
  start_time: '2099-01-01T12:00:00Z',
  recurrence: {frequency: 'daily'},
};
const prep = {
  meetingTitle: metadata.title,
  meetingStartTime: metadata.start_time,
  qualifiedMeetingId: metadata.qualified_id,
  qualifiedConversationId: {id: 'conversation-id', domain: 'example.com'},
};
const createStore = (
  sendJSON = jest.fn().mockResolvedValue({data: metadata}),
  version = 19,
): {store: ReturnType<ReturnType<typeof mockStoreFactory>>; sendJSON: jest.Mock; setLocalStorage: jest.Mock} => {
  const setLocalStorage = jest.fn(() => {
    return async () => {
      return undefined;
    };
  });
  const store = mockStoreFactory({
    apiClient: {backendFeatures: {version}, transport: {http: {sendJSON}}},
    actions: {localStorageAction: {setLocalStorage}},
  })(initialRootState);
  return {store, sendJSON, setLocalStorage};
};

describe('Join link actions', () => {
  beforeEach(() => {
    return window.history.replaceState(
      {},
      '',
      '/auth/?meeting_domain=example.com&meeting_key=key&meeting_code=code#/join-meeting',
    );
  });
  afterEach(() => {
    jest.restoreAllMocks();
    window.history.replaceState({}, '', '/');
  });

  it('checks the public meeting endpoint and retains no metadata in auth state', async () => {
    const {store, sendJSON} = createStore();
    await store.dispatch(joinLinkAction.doCheckJoinLink(link.key, link.code));
    expect(sendJSON).toHaveBeenCalledWith(
      expect.objectContaining({method: 'get', url: '/meeting/example.com/key/code/code-check'}),
    );
    const state = store.getActions().reduce(conversationReducer, {
      ...initialConversationState,
      conversationInfo: {id: 'group-id', name: 'Previous group', has_password: true},
    });
    expect(state.fetching).toBe(false);
    expect(state.error).toBeNull();
    expect(state.conversationInfo).toBeNull();
    expect(state.hasPassword).toBe(false);
    expect(JSON.stringify(store.getActions())).not.toContain('Private title');
  });

  it('keeps conversation metadata during a normal conversation code check', () => {
    const conversationInfo = {id: 'group-id', name: 'Previous group', has_password: true};
    const state = conversationReducer(
      {...initialConversationState, conversationInfo, hasPassword: true},
      ConversationActionCreator.startConversationCodeCheck(),
    );
    expect(state.conversationInfo).toBe(conversationInfo);
    expect(state.hasPassword).toBe(false);
  });

  it('requires an entered password for a password-protected meeting', async () => {
    const error = Object.assign(new BackendError('Password required', BackendErrorLabel.NOT_FOUND, 403), {
      label: 'invalid-meeting-password',
    });
    const {store, sendJSON} = createStore(
      jest
        .fn()
        .mockRejectedValueOnce(error)
        .mockResolvedValue({
          data: {...metadata, qualified_conversation: {id: 'conversation-id', domain: 'example.com'}},
        }),
    );
    await store.dispatch(joinLinkAction.doCheckJoinLink(link.key, link.code));
    expect(store.getActions()).toEqual([
      ConversationActionCreator.startConversationCodeCheck('meeting'),
      ConversationActionCreator.joinLinkPasswordRequired(),
    ]);
    await store.dispatch(joinLinkAction.doCheckJoinLink(link.key, link.code));
    expect(sendJSON).toHaveBeenLastCalledWith(expect.objectContaining({method: 'get'}));
    expect(sendJSON.mock.lastCall?.[0]).not.toHaveProperty('params');
    await store.dispatch(joinLinkAction.doJoinMeetingLink(link, 'secret'));
    expect(sendJSON).toHaveBeenLastCalledWith(
      expect.objectContaining({method: 'post', params: {password: 'secret'}}),
    );
  });

  it('joins the meeting and returns a qualified conversation without fabricating an event', async () => {
    const conversation = {id: 'conversation-id', domain: 'example.com'};
    const {store, sendJSON} = createStore(
      jest.fn().mockResolvedValue({data: {...metadata, qualified_conversation: conversation}}),
    );
    await expect(
      store.dispatch(joinLinkAction.doJoinMeetingLink({...link, key: 'key/segment', code: 'code?#'}, 'secret')),
    ).resolves.toEqual({conversation, meetingPrep: prep});
    expect(store.getActions()).toEqual([
      ConversationActionCreator.startJoinConversationByCode(),
      ConversationActionCreator.successfulJoinMeetingByCode(),
    ]);
    const state = store.getActions().reduce(conversationReducer, initialConversationState);
    expect(state.fetching).toBe(false);
    expect(sendJSON).toHaveBeenCalledWith(
      expect.objectContaining({
        method: 'post',
        url: '/meeting/example.com/key%2Fsegment/code%3F%23/join',
        params: {password: 'secret'},
      }),
    );
  });

  it.each([403, 404, 500])('propagates meeting join failures (%s)', async status => {
    const error = Object.assign(new BackendError('Join failed', undefined, status), {
      label: status === 403 ? 'invalid-meeting-password' : 'meeting-not-found',
    });
    const {store} = createStore(jest.fn().mockRejectedValue(error));
    await expect(store.dispatch(joinLinkAction.doJoinMeetingLink(link))).rejects.toBe(error);
    expect(store.getActions()).toContainEqual(ConversationActionCreator.failedJoinConversationByCode(error));
  });

  it('rejects unsupported API versions without sending a request', async () => {
    const {store, sendJSON} = createStore(undefined, 18);
    await expect(store.dispatch(joinLinkAction.doCheckJoinLink(link.key, link.code))).rejects.toMatchObject({
      label: 'meeting-api-unsupported',
    });
    expect(sendJSON).not.toHaveBeenCalled();
  });

  it('never uses conversation endpoints for meeting checks, info or joining', async () => {
    const check = jest.spyOn(conversationAction, 'doCheckConversationCode');
    const info = jest.spyOn(conversationAction, 'doGetConversationInfoByCode');
    const join = jest.spyOn(conversationAction, 'doJoinConversationByCode');
    const {store} = createStore(
      jest.fn().mockResolvedValue({
        data: {...metadata, qualified_conversation: {id: 'conversation-id', domain: 'example.com'}},
      }),
    );
    await store.dispatch(joinLinkAction.doCheckJoinLink('key', 'code'));
    await store.dispatch(joinLinkAction.doJoinByLink('key', 'code'));
    expect(check).not.toHaveBeenCalled();
    expect(info).not.toHaveBeenCalled();
    expect(join).not.toHaveBeenCalled();
  });

  it('preserves group-link routing through the existing conversation actions', async () => {
    window.history.replaceState({}, '', '/auth/?join_key=group-key&join_code=group-code');
    const check = jest.fn().mockReturnValue(async () => {
      return undefined;
    });
    const info = jest.fn().mockReturnValue(async () => {
      return undefined;
    });
    const join = jest.fn().mockReturnValue(async () => {
      return {
        conversation: 'group-id',
        qualified_conversation: {id: 'group-id', domain: 'example.com'},
        time: '2026-01-01T12:00:00Z',
      };
    });
    const sendJSON = jest.fn();
    const store = mockStoreFactory({
      apiClient: {transport: {http: {sendJSON}}},
      actions: {
        conversationAction: {
          doCheckConversationCode: check,
          doGetConversationInfoByCode: info,
          doJoinConversationByCode: join,
        },
      },
    })(initialRootState);
    await store.dispatch(joinLinkAction.doCheckJoinLink('group-key', 'group-code'));
    await expect(store.dispatch(joinLinkAction.doJoinByLink('group-key', 'group-code'))).resolves.toEqual({
      conversation: {id: 'group-id', domain: 'example.com'},
      eventTime: '2026-01-01T12:00:00Z',
    });
    expect(check).toHaveBeenCalledWith('group-key', 'group-code', undefined);
    expect(info).toHaveBeenCalledWith('group-key', 'group-code');
    expect(join).toHaveBeenCalledWith('group-key', 'group-code', undefined, undefined);
    expect(sendJSON).not.toHaveBeenCalled();
  });

  it('returns an absent result when a group join yields no event', async () => {
    window.history.replaceState({}, '', '/auth/?join_key=group-key&join_code=group-code');
    const join = jest.fn().mockReturnValue(async () => {
      return undefined;
    });
    const store = mockStoreFactory({actions: {conversationAction: {doJoinConversationByCode: join}}})(initialRootState);

    await expect(store.dispatch(joinLinkAction.doJoinByLink('group-key', 'group-code'))).resolves.toBeUndefined();
  });

  it('keeps SSO meeting credentials when the password is wrong and does not create a client', async () => {
    const error = Object.assign(new Error('Wrong password'), {label: 'invalid-meeting-password', code: 403});
    const sendJSON = jest.fn().mockRejectedValue(error);
    const initialize = jest.fn(() => {
      return async () => {
        return undefined;
      };
    });
    const store = mockStoreFactory({
      apiClient: {backendFeatures: {version: 19}, transport: {http: {sendJSON}}},
      core: {init: jest.fn().mockResolvedValue(undefined)},
      actions: {
        clientAction: {doInitializeClient: initialize},
        selfAction: {
          fetchSelf: () => {
            return async () => {
              return undefined;
            };
          },
        },
        localStorageAction: {
          setLocalStorage: () => {
            return async () => {
              return undefined;
            };
          },
        },
      },
    })(initialRootState);
    await expect(
      store.dispatch(
        authAction.doFinalizeSSOLogin({
          clientType: ClientType.PERMANENT,
          meetingLink: link,
          password: 'wrong-password',
        }),
      ),
    ).rejects.toBe(error);
    expect(sendJSON).toHaveBeenCalledWith(
      expect.objectContaining({method: 'post', params: {password: 'wrong-password'}}),
    );
    expect(initialize).not.toHaveBeenCalled();
    expect(new URLSearchParams(window.location.search).get('meeting_key')).toBe('key');
  });
});
