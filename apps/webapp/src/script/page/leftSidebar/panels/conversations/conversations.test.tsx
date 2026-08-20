/*
 * Wire
 * Copyright (C) 2022 Wire Swiss GmbH
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

import React from 'react';

import {act, render} from '@testing-library/react';
import {observable} from 'knockout';

import {ConversationRepository} from 'Repositories/conversation/ConversationRepository';
import {User} from 'Repositories/entity/User';
import {SearchRepository} from 'Repositories/search/searchRepository';
import {UserRepository} from 'Repositories/user/userRepository';
import {withTheme} from 'src/script/auth/util/test/testUtil';
import {ContentState} from 'src/script/page/useAppState';
import * as Router from 'src/script/router/Router';
import {TestFactory} from 'test/helper/TestFactory';

import {Conversations, shouldClearDeepLinkForTab} from './';
import {SidebarTabs} from './useSidebarStore';
import {translateForTest} from 'Util/test/translateForTest';

type ConversationsProps = React.ComponentProps<typeof Conversations>;

const defaultParams: Omit<ConversationsProps, 'conversationRepository' | 'searchRepository'> = {
  listViewModel: {
    switchList: jest.fn(),
    openPreferences: jest.fn(),
    contentViewModel: {
      loadPreviousContent: jest.fn(),
      switchContent: jest.fn(),
    },
  } as unknown as ConversationsProps['listViewModel'],
  preferenceNotificationRepository: {notifications: observable([])} as unknown as ConversationsProps['preferenceNotificationRepository'],
  propertiesRepository: {getPreference: jest.fn(), savePreference: jest.fn()} as unknown as ConversationsProps['propertiesRepository'],
  selfUser: new User('', '', translateForTest),
  integrationRepository: {integrations: observable([])} as unknown as ConversationsProps['integrationRepository'],
  teamRepository: {getTeam: jest.fn()} as unknown as ConversationsProps['teamRepository'],
  userRepository: {users: observable([])} as unknown as ConversationsProps['userRepository'],
  isConversationListCollapseEnabled: false,
};

describe('Conversations', () => {
  let conversationRepository: ConversationRepository;
  let searchRepository: SearchRepository;

  beforeEach(async () => {
    const testFactory = new TestFactory();
    conversationRepository = await testFactory.exposeConversationActors();
    searchRepository = new SearchRepository({} as UserRepository);
  });

  it('Opens preferences when clicked', () => {
    const {getByTitle} = render(
      withTheme(
        <Conversations
          {...defaultParams}
          searchRepository={searchRepository}
          conversationRepository={conversationRepository}
        />,
      ),
    );
    const openPrefButton = getByTitle('preferencesHeadline');
    act(() => {
      openPrefButton.click();
    });

    expect(defaultParams.listViewModel.openPreferences).toHaveBeenCalledWith(ContentState.PREFERENCES_ACCOUNT);
  });

  it.each([SidebarTabs.RECENT, SidebarTabs.CELLS, SidebarTabs.CONNECT])(
    'clears the deep link for unrouted tab %s',
    tab => {
      expect(shouldClearDeepLinkForTab(tab)).toBe(true);
    },
  );

  it.each([SidebarTabs.PREFERENCES, SidebarTabs.MEETINGS])('keeps the deep link for routed tab %s', tab => {
    expect(shouldClearDeepLinkForTab(tab)).toBe(false);
  });

  it('clears the deep link when switching from preferences to a conversation tab', () => {
    const setHistoryParam = jest.spyOn(Router, 'setHistoryParam');
    const {getByTitle} = render(
      withTheme(
        <Conversations
          {...defaultParams}
          searchRepository={searchRepository}
          conversationRepository={conversationRepository}
        />,
      ),
    );

    act(() => {
      getByTitle('conversationViewTooltip').click();
    });

    expect(setHistoryParam).toHaveBeenCalledWith('/');
  });
});
