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

import {createLabel} from 'Repositories/conversation/ConversationLabelRepository';
import {generateConversation} from 'test/helper/ConversationGenerator';

import {getScopedConversationIds, getScopedConversationsForTab, buildMergedAllListItems} from './conversationListFilterUtils';
import {SidebarTabs} from './useSidebarStore';

describe('conversationListFilterUtils', () => {
  const recentConversation = generateConversation({name: 'Recent'});
  const favoriteConversation = generateConversation({name: 'Favorite'});
  const groupConversation = generateConversation({name: 'Group', type: 'group'});
  const channelConversation = generateConversation({name: 'Channel', type: 'group'});
  const directConversation = generateConversation({name: 'Direct'});
  const archivedConversation = generateConversation({name: 'Archived'});

  jest.spyOn(archivedConversation, 'is_archived').mockReturnValue(true as any);

  const baseParams = {
    conversations: [recentConversation],
    groupConversations: [groupConversation],
    directConversations: [directConversation],
    favoriteConversations: [favoriteConversation],
    archivedConversations: [archivedConversation],
    channelConversations: [channelConversation],
    channelAndGroupConversations: [groupConversation, channelConversation],
    isChannelsEnabled: true,
  };

  it('scopes recent conversations', () => {
    const scoped = getScopedConversationsForTab({...baseParams, currentTab: SidebarTabs.RECENT});
    expect(scoped).toEqual([recentConversation]);
  });

  it('scopes favorite conversations', () => {
    const scoped = getScopedConversationsForTab({...baseParams, currentTab: SidebarTabs.FAVORITES});
    expect(scoped).toEqual([favoriteConversation]);
  });

  it('scopes group conversations and excludes archived entries', () => {
    const archivedGroup = generateConversation({name: 'Archived group', type: 'group'});
    jest.spyOn(archivedGroup, 'is_archived').mockReturnValue(true as any);

    const scoped = getScopedConversationsForTab({
      ...baseParams,
      currentTab: SidebarTabs.GROUPS,
      groupConversations: [groupConversation, archivedGroup],
      archivedConversations: [archivedConversation, archivedGroup],
    });

    expect(scoped).toEqual([groupConversation]);
  });

  it('scopes channel conversations', () => {
    const scoped = getScopedConversationsForTab({...baseParams, currentTab: SidebarTabs.CHANNELS});
    expect(scoped).toEqual([channelConversation]);
  });

  it('scopes direct conversations', () => {
    const scoped = getScopedConversationsForTab({...baseParams, currentTab: SidebarTabs.DIRECTS});
    expect(scoped).toEqual([directConversation]);
  });

  it('scopes folder conversations', () => {
    const folderConversation = generateConversation({name: 'Folder item'});
    const currentFolder = createLabel('Work', [folderConversation]);

    const scoped = getScopedConversationsForTab({
      ...baseParams,
      currentTab: SidebarTabs.FOLDER,
      currentFolder,
    });

    expect(scoped).toEqual([folderConversation]);
    expect(getScopedConversationIds(scoped)).toEqual([folderConversation.id]);
  });
});

describe('buildMergedAllListItems', () => {
  it('merges conversations and threads sorted by latest activity', () => {
    const conversation = generateConversation({name: 'Recent chat'});
    conversation.last_event_timestamp(100);

    const threadRows = [
      {
        conversationId: 'conv-1',
        threadId: 'thread-1',
        title: 'Thread title',
        conversationLabel: 'Group',
        authorLabel: 'Alice',
        preview: 'Preview',
        lastActivityAt: '2026-06-18T12:00:00.000Z',
        badges: {unreadCount: 0, hasUnreadMentionForSelf: false},
        thread: {
          conversationId: 'conv-1',
          threadId: 'thread-1',
          replyCount: 2,
          rootMessagePreview: 'Thread title',
        },
      },
    ] as any;

    const merged = buildMergedAllListItems([conversation], threadRows);

    expect(merged).toHaveLength(2);
    expect(merged[0].kind).toBe('thread');
    expect(merged[1].kind).toBe('conversation');
  });
});
