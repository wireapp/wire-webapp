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
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the GNU
 * General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program. If not, see http://www.gnu.org/licenses/.
 *
 */

import {ConversationRepository} from 'Repositories/conversation/ConversationRepository';
import {SearchRepository} from 'Repositories/search/searchRepository';

import {getGroupParticipantsConversations} from './getGroupParticipantsConversation';
import {SidebarTabs} from './useSidebarStore';

const getGroupsByName = jest.fn().mockReturnValue([]);
const normalizeQuery = jest.fn((query: string) => ({query: query.trim().toLowerCase(), isHandleQuery: false}));

const createParams = (conversationsFilter: string) => ({
  currentTab: SidebarTabs.RECENT,
  conversationRepository: {getGroupsByName} as unknown as ConversationRepository,
  searchRepository: {normalizeQuery} as unknown as SearchRepository,
  conversationsFilter,
  favoriteConversations: [],
  conversations: [],
  archivedConversations: [],
});

describe('getGroupParticipantsConversations', () => {
  beforeEach(() => {
    getGroupsByName.mockClear();
    normalizeQuery.mockClear();
  });

  it('does not look up group participants before a search is entered', () => {
    const results = getGroupParticipantsConversations(createParams(''));

    expect(results).toEqual([]);
    expect(getGroupsByName).not.toHaveBeenCalled();
  });

  it('does not look up group participants for a whitespace-only search', () => {
    const results = getGroupParticipantsConversations(createParams('   '));

    expect(results).toEqual([]);
    expect(getGroupsByName).not.toHaveBeenCalled();
  });

  it('looks up group participants for a search term', () => {
    const results = getGroupParticipantsConversations(createParams('Alice'));

    expect(results).toEqual([]);
    expect(getGroupsByName).toHaveBeenCalledWith('alice', false);
  });
});
