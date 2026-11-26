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
 */

import {type AxiosAdapter} from 'axios';

import {CONVERSATION_CELLS_STATE} from '../../../../src/script/apiClient/conversation/conversation';

import {ConversationRepositoryE2E} from './conversationRepository.e2e';

import {expect, test} from '@playwright/test';

test('getQualifiedGroupConversation matches the expected member and retains its domain', async () => {
  const repository = new ConversationRepositoryE2E({backendUrl: 'https://backend.example', apiVersion: '/v5'});
  const requestTimeouts = [10_000, 7_000];
  const observedTimeouts: number[] = [];
  const adapter: AxiosAdapter = async config => {
    observedTimeouts.push(config.timeout ?? 0);
    const data = config.url?.endsWith('list-ids')
      ? {qualified_conversations: [{domain: 'example.org', id: 'conversation-1'}]}
      : {
          found: [
            {
              name: 'Drive conversation',
              qualified_id: {domain: 'example.org', id: 'conversation-1'},
              members: {others: [{id: 'different-member'}]},
            },
            {
              name: 'Drive conversation',
              qualified_id: {domain: 'example.org', id: 'conversation-2'},
              members: {others: [{id: 'expected-member'}]},
            },
          ],
        };

    return {data, status: 200, statusText: 'OK', headers: {}, config};
  };
  repository.axiosInstance.defaults.adapter = adapter;

  const conversationId = await repository.getQualifiedGroupConversation(
    'test-token',
    'Drive conversation',
    'expected-member',
    () => {
      return requestTimeouts.shift() ?? 0;
    },
  );

  expect(conversationId).toBe('example.org/conversation-2');
  expect(observedTimeouts).toEqual([10_000, 7_000]);
});

test('getCellsState reads the qualified conversation with a bounded authenticated request', async () => {
  const repository = new ConversationRepositoryE2E({backendUrl: 'https://backend.example', apiVersion: '/v5'});
  const requests: {url: string; timeout: number; authorization: string | undefined}[] = [];
  const adapter: AxiosAdapter = async config => {
    requests.push({
      url: `${config.baseURL}${config.url}`,
      timeout: config.timeout ?? 0,
      authorization: String(config.headers.get('Authorization') ?? ''),
    });

    return {
      data: {cells_state: CONVERSATION_CELLS_STATE.PENDING},
      status: 200,
      statusText: 'OK',
      headers: {},
      config,
    };
  };
  repository.axiosInstance.defaults.adapter = adapter;

  const state = await repository.getCellsState('test-token', 'example.org/conversation-123', 2_500);

  expect(state).toBe(CONVERSATION_CELLS_STATE.PENDING);
  expect(requests).toEqual([
    {
      url: 'https://backend.example/v5/conversations/example.org/conversation-123',
      timeout: 2_500,
      authorization: 'Bearer test-token',
    },
  ]);
});
