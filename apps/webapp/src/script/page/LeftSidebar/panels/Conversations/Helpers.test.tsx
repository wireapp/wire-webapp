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

import {CONVERSATION_TYPE} from '@wireapp/api-client/lib/conversation';

import {Conversation} from 'Repositories/entity/Conversation';
import {
  conversationFilters,
  conversationSearchFilter,
  getConversationsWithHeadings,
  getTabConversations,
  scrollToConversation,
} from 'src/script/page/LeftSidebar/panels/Conversations/helpers';
import {generateConversation} from 'test/helper/ConversationGenerator';
import {generateUser} from 'test/helper/UserGenerator';

import {SidebarTabs} from './useSidebarStore';

describe('conversationFilters', () => {
  it('detects mentions, replies, pings, and archived state', () => {
    const mentionsConversation = generateConversation({name: 'Mentions'});
    jest
      .spyOn(mentionsConversation, 'unreadState')
      .mockReturnValue({selfMentions: [{}], selfReplies: [], pings: []} as any);
    jest.spyOn(mentionsConversation, 'is_archived').mockReturnValue(false as any);

    const repliesConversation = generateConversation({name: 'Replies'});
    jest
      .spyOn(repliesConversation, 'unreadState')
      .mockReturnValue({selfMentions: [], selfReplies: [{}], pings: []} as any);
    jest.spyOn(repliesConversation, 'is_archived').mockReturnValue(true as any);

    const pingsConversation = generateConversation({name: 'Pings'});
    jest
      .spyOn(pingsConversation, 'unreadState')
      .mockReturnValue({selfMentions: [], selfReplies: [], pings: [{}]} as any);
    jest.spyOn(pingsConversation, 'is_archived').mockReturnValue(false as any);

    expect(conversationFilters.hasMentions(mentionsConversation)).toBe(true);
    expect(conversationFilters.hasReplies(repliesConversation)).toBe(true);
    expect(conversationFilters.hasPings(pingsConversation)).toBe(true);
    expect(conversationFilters.notArchived(repliesConversation)).toBe(false);
  });
});

describe('conversationSearchFilter', () => {
  it('matches conversations by normalized display name', () => {
    const conversation = generateConversation({name: 'Wêb Têam'});
    const matches = conversationSearchFilter('web team');

    expect(matches(conversation)).toBe(true);
  });
});

describe('scrollToConversation', () => {
  const originalInnerHeight = window.innerHeight;
  const originalInnerWidth = window.innerWidth;

  beforeEach(() => {
    Object.defineProperty(window, 'innerHeight', {value: 600, configurable: true});
    Object.defineProperty(window, 'innerWidth', {value: 800, configurable: true});
  });

  afterEach(() => {
    Object.defineProperty(window, 'innerHeight', {value: originalInnerHeight, configurable: true});
    Object.defineProperty(window, 'innerWidth', {value: originalInnerWidth, configurable: true});
    document.body.innerHTML = '';
  });

  it('scrolls when the conversation is out of view', () => {
    const conversationId = 'conv-1';
    const element = document.createElement('div');
    element.className = 'conversation-list-cell';
    element.dataset.uieUid = conversationId;
    element.getBoundingClientRect = jest.fn(() => ({
      top: -10,
      left: 0,
      bottom: 10,
      right: 10,
    })) as any;
    element.scrollIntoView = jest.fn();
    document.body.appendChild(element);

    scrollToConversation(conversationId);

    expect(element.scrollIntoView).toHaveBeenCalledWith({behavior: 'instant', block: 'center', inline: 'nearest'});
  });

  it('does not scroll when the conversation is already visible', () => {
    const conversationId = 'conv-2';
    const element = document.createElement('div');
    element.className = 'conversation-list-cell';
    element.dataset.uieUid = conversationId;
    element.getBoundingClientRect = jest.fn(() => ({
      top: 10,
      left: 10,
      bottom: 100,
      right: 100,
    })) as any;
    element.scrollIntoView = jest.fn();
    document.body.appendChild(element);

    scrollToConversation(conversationId);

    expect(element.scrollIntoView).not.toHaveBeenCalled();
  });
});

describe('getConversationsWithHeadings', () => {
  it('adds people and group headings when filtering recent conversations', () => {
    const directConversation = generateConversation({name: 'Direct'});
    jest.spyOn(directConversation, 'isGroup').mockReturnValue(false as any);

    const groupConversation = generateConversation({name: 'Group'});
    jest.spyOn(groupConversation, 'isGroup').mockReturnValue(true as any);

    const result = getConversationsWithHeadings([directConversation, groupConversation], 'group', SidebarTabs.RECENT);

    expect(result[0]).toEqual({isHeader: true, heading: 'searchConversationNames'});
    expect(result[1]).toBe(directConversation);
    expect(result[2]).toEqual({isHeader: true, heading: 'searchGroupParticipants'});
    expect(result[3]).toBe(groupConversation);
  });

  it('returns the list unchanged when not filtering recent conversations', () => {
    const conversation = generateConversation({name: 'Direct'});
    jest.spyOn(conversation, 'isGroup').mockReturnValue(false as any);

    const result = getConversationsWithHeadings([conversation], '', SidebarTabs.RECENT);

    expect(result).toEqual([conversation]);
  });
});

describe('getTabConversations', () => {
  let conversations: Conversation[];
  let groupConversations: Conversation[];
  let directConversations: Conversation[];
  let favoriteConversations: Conversation[];
  let archivedConversations: Conversation[];

  beforeEach(() => {
    const conversation1 = generateConversation({
      name: 'Virgile',
      type: CONVERSATION_TYPE.ONE_TO_ONE,
      users: [generateUser(undefined, {name: 'Virgile'})],
    });
    const conversation2 = generateConversation({
      name: 'Tim',
      type: CONVERSATION_TYPE.ONE_TO_ONE,
      users: [generateUser(undefined, {name: 'Tim'})],
    });
    const conversation3 = generateConversation({
      name: 'Bardia',
      type: CONVERSATION_TYPE.ONE_TO_ONE,
      users: [generateUser(undefined, {name: 'Bardia'})],
    });
    const conversation4 = generateConversation({
      name: 'Tom',
      type: CONVERSATION_TYPE.ONE_TO_ONE,
      users: [generateUser(undefined, {name: 'Tom'})],
    });
    const conversation5 = generateConversation({
      name: 'Wêb Têam',
      type: CONVERSATION_TYPE.REGULAR,
      users: [generateUser(undefined, {name: 'Wêb Têam'})],
    });

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

  it('should use group conversations when channels are enabled', () => {
    const extraConversation = generateConversation({name: 'Channel Group'});
    const channelAndGroupConversations = [groupConversations[0], extraConversation];

    const {conversations: filteredConversations, searchInputPlaceholder} = getTabConversations({
      currentTab: SidebarTabs.GROUPS,
      conversations,
      groupConversations,
      directConversations,
      favoriteConversations,
      archivedConversations,
      conversationsFilter: '',
      channelAndGroupConversations,
      channelConversations: [],
      isChannelsEnabled: true,
      draftConversations: [],
    });

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

  it('should return unread conversations when current tab is UNREAD', () => {
    const unreadConversation = generateConversation({name: 'Unread'});
    jest.spyOn(unreadConversation, 'hasUnread').mockReturnValue(true as any);

    const readConversation = generateConversation({name: 'Read'});
    jest.spyOn(readConversation, 'hasUnread').mockReturnValue(false as any);

    const {conversations: filteredConversations, searchInputPlaceholder} = getTabConversations({
      currentTab: SidebarTabs.UNREAD,
      conversations: [unreadConversation, readConversation],
      groupConversations,
      directConversations,
      favoriteConversations,
      archivedConversations: [],
      conversationsFilter: '',
      channelAndGroupConversations: groupConversations,
      channelConversations: [],
      isChannelsEnabled: false,
      draftConversations: [],
    });

    expect(filteredConversations).toEqual([unreadConversation]);
    expect(searchInputPlaceholder).toBe('searchUnreadConversations');
  });

  it('should return draft conversations when current tab is DRAFTS', () => {
    const draftConversation = generateConversation({name: 'Draft'});
    const nonDraftConversation = generateConversation({name: 'NoDraft'});

    const {conversations: filteredConversations, searchInputPlaceholder} = getTabConversations({
      currentTab: SidebarTabs.DRAFTS,
      conversations: [draftConversation, nonDraftConversation],
      groupConversations,
      directConversations,
      favoriteConversations,
      archivedConversations: [],
      conversationsFilter: '',
      channelAndGroupConversations: groupConversations,
      channelConversations: [],
      isChannelsEnabled: false,
      draftConversations: [draftConversation],
    });

    expect(filteredConversations).toEqual([draftConversation]);
    expect(searchInputPlaceholder).toBe('searchDraftsConversations');
  });

  it('should return channels that are not archived when current tab is CHANNELS', () => {
    const activeChannel = generateConversation({name: 'Active Channel'});
    jest.spyOn(activeChannel, 'is_archived').mockReturnValue(false as any);

    const archivedChannel = generateConversation({name: 'Archived Channel'});
    jest.spyOn(archivedChannel, 'is_archived').mockReturnValue(true as any);

    const {conversations: filteredConversations, searchInputPlaceholder} = getTabConversations({
      currentTab: SidebarTabs.CHANNELS,
      conversations: [activeChannel, archivedChannel],
      groupConversations,
      directConversations,
      favoriteConversations,
      archivedConversations: [archivedChannel],
      conversationsFilter: '',
      channelAndGroupConversations: groupConversations,
      channelConversations: [activeChannel, archivedChannel],
      isChannelsEnabled: true,
      draftConversations: [],
    });

    expect(filteredConversations).toEqual([activeChannel]);
    expect(searchInputPlaceholder).toBe('searchChannelConversations');
  });

  it('should return conversations with mentions when current tab is MENTIONS', () => {
    const mentionsConversation = generateConversation({name: 'Mentions'});
    jest
      .spyOn(mentionsConversation, 'unreadState')
      .mockReturnValue({selfMentions: [{}], selfReplies: [], pings: []} as any);

    const noMentionsConversation = generateConversation({name: 'NoMentions'});
    jest
      .spyOn(noMentionsConversation, 'unreadState')
      .mockReturnValue({selfMentions: [], selfReplies: [], pings: []} as any);

    const {conversations: filteredConversations, searchInputPlaceholder} = getTabConversations({
      currentTab: SidebarTabs.MENTIONS,
      conversations: [mentionsConversation, noMentionsConversation],
      groupConversations,
      directConversations,
      favoriteConversations,
      archivedConversations: [],
      conversationsFilter: '',
      channelAndGroupConversations: groupConversations,
      channelConversations: [],
      isChannelsEnabled: false,
      draftConversations: [],
    });

    expect(filteredConversations).toEqual([mentionsConversation]);
    expect(searchInputPlaceholder).toBe('searchMentionsConversations');
  });

  it('should return conversations with replies when current tab is REPLIES', () => {
    const repliesConversation = generateConversation({name: 'Replies'});
    jest
      .spyOn(repliesConversation, 'unreadState')
      .mockReturnValue({selfMentions: [], selfReplies: [{}], pings: []} as any);

    const noRepliesConversation = generateConversation({name: 'NoReplies'});
    jest
      .spyOn(noRepliesConversation, 'unreadState')
      .mockReturnValue({selfMentions: [], selfReplies: [], pings: []} as any);

    const {conversations: filteredConversations, searchInputPlaceholder} = getTabConversations({
      currentTab: SidebarTabs.REPLIES,
      conversations: [repliesConversation, noRepliesConversation],
      groupConversations,
      directConversations,
      favoriteConversations,
      archivedConversations: [],
      conversationsFilter: '',
      channelAndGroupConversations: groupConversations,
      channelConversations: [],
      isChannelsEnabled: false,
      draftConversations: [],
    });

    expect(filteredConversations).toEqual([repliesConversation]);
    expect(searchInputPlaceholder).toBe('searchRepliesConversations');
  });

  it('should return conversations with pings when current tab is PINGS', () => {
    const pingsConversation = generateConversation({name: 'Pings'});
    jest
      .spyOn(pingsConversation, 'unreadState')
      .mockReturnValue({selfMentions: [], selfReplies: [], pings: [{}]} as any);

    const noPingsConversation = generateConversation({name: 'NoPings'});
    jest
      .spyOn(noPingsConversation, 'unreadState')
      .mockReturnValue({selfMentions: [], selfReplies: [], pings: []} as any);

    const {conversations: filteredConversations, searchInputPlaceholder} = getTabConversations({
      currentTab: SidebarTabs.PINGS,
      conversations: [pingsConversation, noPingsConversation],
      groupConversations,
      directConversations,
      favoriteConversations,
      archivedConversations: [],
      conversationsFilter: '',
      channelAndGroupConversations: groupConversations,
      channelConversations: [],
      isChannelsEnabled: false,
      draftConversations: [],
    });

    expect(filteredConversations).toEqual([pingsConversation]);
    expect(searchInputPlaceholder).toBe('searchPingsConversations');
  });
});
