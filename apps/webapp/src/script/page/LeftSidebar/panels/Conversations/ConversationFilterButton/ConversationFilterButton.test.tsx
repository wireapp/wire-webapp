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

import {fireEvent, render, screen} from '@testing-library/react';

import {Config} from 'src/script/Config';
import {ConversationFilter, useSidebarStore} from 'src/script/page/LeftSidebar/panels/Conversations/useSidebarStore';

import {ConversationFilterButton} from './ConversationFilterButton';

describe('<ConversationFilterButton />', () => {
  const originalConfigFeatures = Config.getConfig().FEATURE;

  beforeEach(() => {
    Config._dangerouslySetConfigFeaturesForDebug({
      ...originalConfigFeatures,
      ENABLE_ADVANCED_FILTERS: true,
    });
    localStorage.clear();
    useSidebarStore.setState({conversationFilter: ConversationFilter.NONE});
  });

  afterAll(() => {
    Config._dangerouslySetConfigFeaturesForDebug(originalConfigFeatures);
  });

  it('renders filter labels from existing translation keys', () => {
    const {container} = render(<ConversationFilterButton />);
    const filterButton = container.querySelector('[data-uie-name="conversation-filter-button"]') as HTMLButtonElement;

    expect(filterButton.title).toBe('tabsFilterTooltip');

    fireEvent.click(filterButton);

    screen.getByText('conversationViewAllConversations');
    screen.getByText('searchUnreadConversations');
    screen.getByText('searchMentionsConversations');
    screen.getByText('searchRepliesConversations');
    screen.getByText('searchDraftsConversations');
    screen.getByText('searchPingsConversations');
  });

  it('updates sidebar store when selecting a filter option', () => {
    const {container} = render(<ConversationFilterButton />);
    const filterButton = container.querySelector('[data-uie-name="conversation-filter-button"]') as HTMLButtonElement;

    fireEvent.click(filterButton);

    const unreadOption = container.querySelector('[data-uie-name="filter-option-unread"]') as HTMLButtonElement;
    fireEvent.click(unreadOption);

    expect(useSidebarStore.getState().conversationFilter).toBe(ConversationFilter.UNREAD);
  });
});
