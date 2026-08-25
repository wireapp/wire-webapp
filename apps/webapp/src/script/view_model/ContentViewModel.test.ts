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

import ko from 'knockout';
import {container} from 'tsyringe';

import {CONVERSATION_PROTOCOL} from '@wireapp/api-client/lib/team';

import type {ConversationRepository} from 'Repositories/conversation/ConversationRepository';
import type {MessageRepository} from 'Repositories/conversation/MessageRepository';
import {Conversation} from 'Repositories/entity/Conversation';
import {UserState} from 'Repositories/user/userState';
import type {UserRepository} from 'Repositories/user/userRepository';

import {SidebarTabs, useSidebarStore} from '../page/leftSidebar/panels/conversations/useSidebarStore';
import {ContentState, useAppState} from '../page/useAppState';

import {ContentViewModel} from './ContentViewModel';
import type {MainViewModel, ViewModelRepositories} from './MainViewModel';

const buildConversation = () =>
  new Conversation('conversation-id', 'example.com', CONVERSATION_PROTOCOL.PROTEUS, (text: string) => text);

const buildContentViewModel = () => {
  const conversationRepository = {
    getConversationById: jest.fn().mockResolvedValue(buildConversation()),
    init1to1Conversation: jest.fn(),
    refreshMLSConversationVerificationState: jest.fn().mockResolvedValue(undefined),
  } as unknown as ConversationRepository;

  const mainViewModel = {
    list: {openConversations: jest.fn()},
  } as unknown as MainViewModel;

  const repositories = {
    conversation: conversationRepository,
    user: {} as unknown as UserRepository,
    message: {} as unknown as MessageRepository,
  } as unknown as ViewModelRepositories;

  return new ContentViewModel(mainViewModel, repositories, (text: string) => text);
};

describe('ContentViewModel', () => {
  it.each([SidebarTabs.CONNECT, SidebarTabs.PREFERENCES, SidebarTabs.CELLS, SidebarTabs.MEETINGS])(
    'keeps the %s tab selected after a conversation is successfully shown underneath it',
    async tab => {
      const contentViewModel = buildContentViewModel();
      useSidebarStore.getState().setCurrentTab(tab);
      const conversation = buildConversation();

      await contentViewModel.showConversation(conversation);

      expect(useAppState.getState().contentState).toBe(ContentState.CONVERSATION);
      expect(useSidebarStore.getState().currentTab).toBe(tab);
    },
  );

  it('keeps a conversation-list tab selected after a conversation is successfully shown', async () => {
    const contentViewModel = buildContentViewModel();
    useSidebarStore.getState().setCurrentTab(SidebarTabs.ARCHIVES);
    const conversation = buildConversation();

    await contentViewModel.showConversation(conversation);

    expect(useAppState.getState().contentState).toBe(ContentState.CONVERSATION);
    expect(useSidebarStore.getState().currentTab).toBe(SidebarTabs.ARCHIVES);
  });

  describe('connectRequests subscription', () => {
    let fakeUserState: {connectRequests: ko.ObservableArray<unknown>};

    beforeEach(() => {
      fakeUserState = {connectRequests: ko.observableArray([])};
      container.registerInstance(UserState, fakeUserState as unknown as UserState);
    });

    afterEach(() => {
      container.clearInstances();
    });

    it.each([SidebarTabs.CONNECT, SidebarTabs.PREFERENCES, SidebarTabs.CELLS, SidebarTabs.MEETINGS])(
      'does not redirect away from the %s tab when connect requests empty out',
      tab => {
        const contentViewModel = buildContentViewModel();
        const showConversationSpy = jest.spyOn(contentViewModel, 'showConversation').mockResolvedValue(undefined);

        useAppState.getState().setContentState(ContentState.CONNECTION_REQUESTS);
        useSidebarStore.getState().setCurrentTab(tab);

        fakeUserState.connectRequests([{} as never]);
        fakeUserState.connectRequests([]);

        expect(showConversationSpy).not.toHaveBeenCalled();
      },
    );

    it('redirects to the most recent conversation when connect requests empty out on a conversation-list tab', () => {
      const contentViewModel = buildContentViewModel();
      const showConversationSpy = jest.spyOn(contentViewModel, 'showConversation').mockResolvedValue(undefined);

      useAppState.getState().setContentState(ContentState.CONNECTION_REQUESTS);
      useSidebarStore.getState().setCurrentTab(SidebarTabs.RECENT);

      fakeUserState.connectRequests([{} as never]);
      fakeUserState.connectRequests([]);

      expect(showConversationSpy).toHaveBeenCalled();
    });
  });
});
