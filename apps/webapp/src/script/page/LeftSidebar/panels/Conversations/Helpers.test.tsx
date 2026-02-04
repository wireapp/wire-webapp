/*
 * Wire
 * Copyright (C) 2024 Wire Swiss GmbH
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

import {Conversation} from 'Repositories/entity/Conversation';
import {getTabConversations} from 'src/script/page/LeftSidebar/panels/Conversations/helpers';
import {generateConversation} from 'test/helper/ConversationGenerator';

import {SidebarTabs, ConversationFilter} from './useSidebarStore';

describe('getTabConversations', () => {
  let conversations: Conversation[];
  let groupConversations: Conversation[];
  let directConversations: Conversation[];
  let favoriteConversations: Conversation[];
  let archivedConversations: Conversation[];

  beforeEach(() => {
    const conversation1 = generateConversation({name: 'Virgile'});
    const conversation2 = generateConversation({name: 'Tim'});
    const conversation3 = generateConversation({name: 'Bardia'});
    const conversation4 = generateConversation({name: 'Tom'});
    const conversation5 = generateConversation({name: 'Wêb Têam'});

    conversations = [conversation1, conversation2, conversation3, conversation4, conversation5];
    groupConversations = [conversation5];
    directConversations = [conversation1, conversation2, conversation3];
    favoriteConversations = [conversation4];
    archivedConversations = [conversation4];
  });

  const runTest = (currentTab: SidebarTabs, conversationsFilter: string) => {
    return getTabConversations({
      currentTab,
      conversations,
      groupConversations,
      directConversations,
      favoriteConversations,
      archivedConversations,
      conversationsFilter,
      channelAndGroupConversations: groupConversations,
      channelConversations: [],
      isChannelsEnabled: false,
      conversationFilter: ConversationFilter.NONE,
      draftConversations: [],
    });
  };

  it('should return all conversations if the current tab is FOLDER or RECENT', () => {
    const {conversations: filteredConversations, searchInputPlaceholder} = runTest(SidebarTabs.FOLDER, '');

    expect(filteredConversations).toEqual(conversations);
    expect(searchInputPlaceholder).toBe('searchConversations');
  });

  it('should return group conversations if the current tab is GROUPS', () => {
    const {conversations: filteredConversations, searchInputPlaceholder} = runTest(SidebarTabs.GROUPS, '');

    expect(filteredConversations).toEqual(groupConversations);
    expect(searchInputPlaceholder).toBe('searchGroupConversations');
  });

  it('should return direct conversations if the current tab is DIRECTS', () => {
    const {conversations: filteredConversations, searchInputPlaceholder} = runTest(SidebarTabs.DIRECTS, '');

    expect(filteredConversations).toEqual(directConversations);
    expect(searchInputPlaceholder).toBe('searchDirectConversations');
  });

  it('should return favorite conversations if the current tab is FAVORITES', () => {
    const {conversations: filteredConversations, searchInputPlaceholder} = runTest(SidebarTabs.FAVORITES, '');

    expect(filteredConversations).toEqual(favoriteConversations);
    expect(searchInputPlaceholder).toBe('searchFavoriteConversations');
  });

  it('should return archived conversations if the current tab is ARCHIVES', () => {
    const {conversations: filteredConversations, searchInputPlaceholder} = runTest(SidebarTabs.ARCHIVES, '');

    expect(filteredConversations).toEqual(archivedConversations);
    expect(searchInputPlaceholder).toBe('searchArchivedConversations');
  });

  it('should filter conversations based on the search filter', () => {
    const {conversations: filteredConversations} = runTest(SidebarTabs.RECENT, 'Tim');

    expect(filteredConversations[0].display_name()).toEqual('Tim');
  });

  it('should ignore special characters when filtering conversations', () => {
    const {conversations: filteredConversations} = runTest(SidebarTabs.RECENT, 'web team');

    expect(filteredConversations[0].display_name()).toEqual('Wêb Têam');
  });

  it('should exclude archived conversations from direct and group conversations', () => {
    const newGroupConversations = [...groupConversations, ...archivedConversations];
    const newDirectConversations = [...directConversations, ...archivedConversations];

    const {conversations: filteredGroupConversations} = getTabConversations({
      currentTab: SidebarTabs.GROUPS,
      conversations,
      groupConversations: newGroupConversations,
      directConversations,
      favoriteConversations,
      archivedConversations,
      conversationsFilter: '',
      channelAndGroupConversations: newGroupConversations,
      channelConversations: [],
      isChannelsEnabled: false,
      conversationFilter: ConversationFilter.NONE,
      draftConversations: [],
    });

    const {conversations: filteredDirectConversations} = getTabConversations({
      currentTab: SidebarTabs.DIRECTS,
      conversations,
      groupConversations,
      directConversations: newDirectConversations,
      favoriteConversations,
      archivedConversations,
      conversationsFilter: '',
      channelAndGroupConversations: groupConversations,
      channelConversations: [],
      isChannelsEnabled: false,
      conversationFilter: ConversationFilter.NONE,
      draftConversations: [],
    });

    expect(filteredGroupConversations).toEqual(groupConversations);
    expect(filteredDirectConversations).toEqual(directConversations);
  });

  it('should return an empty array if the current tab does not match any predefined tabs', () => {
    const {conversations: filteredConversations, searchInputPlaceholder} = runTest(
      'UNKNOWN_TAB' as unknown as SidebarTabs,
      '',
    );

    expect(filteredConversations).toEqual([]);
    expect(searchInputPlaceholder).toBe('');
  });
});
