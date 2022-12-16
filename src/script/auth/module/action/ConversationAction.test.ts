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

import type {ConversationEvent} from '@wireapp/api-client/lib/event/';

import {ConversationActionCreator} from './creator';

import {mockStoreFactory} from '../../util/test/mockStoreFactory';

import {actionRoot} from '.';

describe('ConversationAction', () => {
  it('checks conversation code', async () => {
    const key = 'key';
    const code = 'code';
    const mockedActions = {};
    const mockedApiClient = {
      api: {conversation: {postConversationCodeCheck: () => Promise.resolve()}},
    };
    const mockedCore = {};

    const store = mockStoreFactory({
      actions: mockedActions,
      apiClient: mockedApiClient,
      core: mockedCore,
    })({});
    await store.dispatch(actionRoot.conversationAction.doCheckConversationCode(key, code));

    expect(store.getActions()).toEqual([
      ConversationActionCreator.startConversationCodeCheck(),
      ConversationActionCreator.successfulConversationCodeCheck(),
    ]);
  });

  it('handles failed join conversation code check', async () => {
    const error = new Error('test error');
    const key = 'key';
    const code = 'code';
    const mockedActions = {};
    const mockedApiClient = {
      api: {conversation: {postConversationCodeCheck: () => Promise.reject(error)}},
    };
    const mockedCore = {};

    const store = mockStoreFactory({
      actions: mockedActions,
      apiClient: mockedApiClient,
      core: mockedCore,
    })({});
    await expect(store.dispatch(actionRoot.conversationAction.doCheckConversationCode(key, code))).rejects.toThrow();
    expect(store.getActions()).toEqual([
      ConversationActionCreator.startConversationCodeCheck(),
      ConversationActionCreator.failedConversationCodeCheck(error),
    ]);
  });

  it('joins conversation by code', async () => {
    const conversationEvent = {} as unknown as ConversationEvent;
    const key = 'key';
    const code = 'code';
    const mockedActions = {};
    const mockedApiClient = {
      api: {conversation: {postJoinByCode: () => Promise.resolve(conversationEvent)}},
    };
    const mockedCore = {};

    const store = mockStoreFactory({
      actions: mockedActions,
      apiClient: mockedApiClient,
      core: mockedCore,
    })({});
    await store.dispatch(actionRoot.conversationAction.doJoinConversationByCode(key, code));

    expect(store.getActions()).toEqual([
      ConversationActionCreator.startJoinConversationByCode(),
      ConversationActionCreator.successfulJoinConversationByCode(conversationEvent),
    ]);
  });

  it('handles failed join conversation by code', async () => {
    const error = new Error('test error');
    const key = 'key';
    const code = 'code';
    const mockedActions = {};
    const mockedApiClient = {
      api: {conversation: {postJoinByCode: () => Promise.reject(error)}},
    };
    const mockedCore = {};

    const store = mockStoreFactory({
      actions: mockedActions,
      apiClient: mockedApiClient,
      core: mockedCore,
    })({});
    await expect(store.dispatch(actionRoot.conversationAction.doJoinConversationByCode(key, code))).rejects.toThrow();
    expect(store.getActions()).toEqual([
      ConversationActionCreator.startJoinConversationByCode(),
      ConversationActionCreator.failedJoinConversationByCode(error),
    ]);
  });
});
