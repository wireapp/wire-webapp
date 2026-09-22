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

import userEvent from '@testing-library/user-event';
import {act, render, waitFor} from '@testing-library/react';
import {observable} from 'knockout';

import {CONVERSATION_TYPE} from '@wireapp/api-client/lib/conversation';
import {CONVERSATION_PROTOCOL} from '@wireapp/api-client/lib/team';
import {amplify} from 'amplify';
import {WebAppEvents} from '@wireapp/webapp-events';

import {CallState} from 'Repositories/calling/CallState';
import {ConversationRepository} from 'Repositories/conversation/ConversationRepository';
import {Conversation} from 'Repositories/entity/Conversation';
import {User} from 'Repositories/entity/User';
import {ConversationState} from 'Repositories/conversation/ConversationState';
import {SearchRepository} from 'Repositories/search/searchRepository';
import {UserRepository} from 'Repositories/user/userRepository';
import {withTheme} from 'src/script/auth/util/test/testUtil';
import {ContentState, ListState, useAppState} from 'src/script/page/useAppState';
import * as Router from 'src/script/router/Router';
import {TestFactory} from 'test/helper/TestFactory';

import {Conversations, shouldClearDeepLinkForTab} from './';
import {SidebarTabs, useSidebarStore} from './useSidebarStore';
import {translateForTest} from 'Util/test/translateForTest';

type ConversationsProps = React.ComponentProps<typeof Conversations>;

const create1to1Conversation = (userName: string) => {
  const conversation = new Conversation(userName, 'domain', CONVERSATION_PROTOCOL.PROTEUS, translateForTest);
  const user = new User(`${userName}-id`, 'domain', translateForTest);
  user.name(userName);
  conversation.type(CONVERSATION_TYPE.ONE_TO_ONE);
  conversation.participating_user_ets([user]);
  conversation.participating_user_ids([user.qualifiedId]);
  return conversation;
};

const defaultParams: Omit<ConversationsProps, 'conversationRepository' | 'searchRepository'> = {
  listViewModel: {
    switchList: jest.fn(),
    openPreferences: jest.fn(),
    mainViewModel: {actions: {}},
    contentViewModel: {
      loadPreviousContent: jest.fn(),
      switchContent: jest.fn(),
    },
  } as unknown as ConversationsProps['listViewModel'],
  preferenceNotificationRepository: {
    notifications: observable([]),
  } as unknown as ConversationsProps['preferenceNotificationRepository'],
  propertiesRepository: {
    getPreference: jest.fn(),
    savePreference: jest.fn(),
  } as unknown as ConversationsProps['propertiesRepository'],
  selfUser: new User('', '', translateForTest),
  integrationRepository: {integrations: observable([])} as unknown as ConversationsProps['integrationRepository'],
  teamRepository: {getTeam: jest.fn()} as unknown as ConversationsProps['teamRepository'],
  userRepository: {
    users: observable([]),
    getUsersById: jest.fn().mockResolvedValue([]),
  } as unknown as ConversationsProps['userRepository'],
  isConversationListCollapseEnabled: false,
};

describe('Conversations', () => {
  let conversationRepository: ConversationRepository;
  let searchRepository: SearchRepository;

  beforeEach(async () => {
    const testFactory = new TestFactory();
    conversationRepository = await testFactory.exposeConversationActors();
    searchRepository = new SearchRepository({} as UserRepository);
    window.Element.prototype.getBoundingClientRect = jest.fn().mockReturnValue({height: 1000, width: 1000});
    Object.defineProperty(window.HTMLElement.prototype, 'clientHeight', {configurable: true, value: 1000});
    Object.defineProperty(window.HTMLElement.prototype, 'clientWidth', {configurable: true, value: 1000});
    Object.defineProperty(window.HTMLElement.prototype, 'offsetHeight', {configurable: true, value: 1000});
    Object.defineProperty(window.HTMLElement.prototype, 'offsetWidth', {configurable: true, value: 1000});
    useSidebarStore.setState({currentTab: SidebarTabs.RECENT});
  });

  it('moves focus through the real Conversations parent wiring and navigates on Enter', async () => {
    const firstConversation = create1to1Conversation('Alice');
    const secondConversation = create1to1Conversation('Alina');
    const conversationState = new ConversationState();
    conversationState.conversations([firstConversation, secondConversation]);
    const callState = {activeCalls: observable([]), joinableCalls: observable([])} as unknown as CallState;
    window.HTMLElement.prototype.scrollTo = jest.fn();
    const navigate = jest.spyOn(Router, 'navigate').mockImplementation(() => undefined);
    const {container, getByRole} = render(
      withTheme(
        <Conversations
          {...defaultParams}
          callState={callState}
          conversationState={conversationState}
          searchRepository={searchRepository}
          conversationRepository={conversationRepository}
        />,
      ),
    );
    const user = userEvent.setup();
    const searchInput = getByRole('textbox');
    await user.type(searchInput, 'Ali');

    let firstResult: HTMLElement | null = null;
    let secondResult: HTMLElement | null = null;
    await waitFor(() => {
      firstResult = container.querySelector<HTMLElement>(
        `[data-uie-uid="${firstConversation.id}"] [data-uie-name="go-open-conversation"]`,
      );
      secondResult = container.querySelector<HTMLElement>(
        `[data-uie-uid="${secondConversation.id}"] [data-uie-name="go-open-conversation"]`,
      );
      expect(firstResult).toBeInTheDocument();
      expect(secondResult).toBeInTheDocument();
    });

    searchInput.focus();
    const searchTabEvent = new KeyboardEvent('keydown', {bubbles: true, cancelable: true, key: 'Tab'});
    act(() => searchInput.dispatchEvent(searchTabEvent));
    expect(searchTabEvent.defaultPrevented).toBe(true);
    expect(firstResult).toHaveFocus();

    await user.keyboard('{ArrowDown}');
    expect(secondResult).toHaveFocus();
    await user.keyboard('{ArrowUp}');
    expect(firstResult).toHaveFocus();

    const tabEvent = new KeyboardEvent('keydown', {bubbles: true, cancelable: true, key: 'Tab'});
    act(() => firstResult?.dispatchEvent(tabEvent));
    expect(tabEvent.defaultPrevented).toBe(false);

    await user.tab({shift: true});
    expect(searchInput).toHaveFocus();
    await user.tab();
    expect(firstResult).toHaveFocus();
    await user.keyboard('{ArrowDown}{Enter}');

    expect(navigate).toHaveBeenCalledWith(expect.any(String));
    navigate.mockRestore();
  });

  it('keeps search focus when the query changes to another value with the same result', async () => {
    const conversationState = new ConversationState();
    const conversation = create1to1Conversation('Alice');
    conversationState.conversations([conversation]);
    const callState = {activeCalls: observable([]), joinableCalls: observable([])} as unknown as CallState;
    window.HTMLElement.prototype.scrollTo = jest.fn();
    const {container, getByRole} = render(
      withTheme(
        <Conversations
          {...defaultParams}
          callState={callState}
          conversationState={conversationState}
          searchRepository={searchRepository}
          conversationRepository={conversationRepository}
        />,
      ),
    );
    const user = userEvent.setup();
    const searchInput = getByRole('textbox');
    await user.type(searchInput, 'Alice');

    const result = await waitFor(() => {
      const result = container.querySelector<HTMLElement>(
        `[data-uie-uid="${conversation.id}"] [data-uie-name="go-open-conversation"]`,
      );
      expect(result).toBeInTheDocument();
      return result;
    });

    await user.tab();
    expect(result).toHaveFocus();
    await user.tab({shift: true});
    expect(searchInput).toHaveFocus();

    await user.clear(searchInput);
    await user.type(searchInput, 'Alic');
    expect(searchInput).toHaveFocus();
  });

  it('cancels delayed focus when the conversation list unmounts', async () => {
    const conversationState = new ConversationState();
    const firstConversation = create1to1Conversation('Alice');
    const secondConversation = create1to1Conversation('Alina');
    conversationState.conversations([firstConversation, secondConversation]);
    const callState = {activeCalls: observable([]), joinableCalls: observable([])} as unknown as CallState;
    window.HTMLElement.prototype.scrollTo = jest.fn();
    const {container, getByRole, unmount} = render(
      withTheme(
        <Conversations
          {...defaultParams}
          callState={callState}
          conversationState={conversationState}
          searchRepository={searchRepository}
          conversationRepository={conversationRepository}
        />,
      ),
    );
    const user = userEvent.setup();
    const searchInput = getByRole('textbox');
    await user.type(searchInput, 'Ali');

    const firstResult = await waitFor(() => {
      const result = container.querySelector<HTMLElement>(
        `[data-uie-uid="${firstConversation.id}"] [data-uie-name="go-open-conversation"]`,
      );
      expect(result).toBeInTheDocument();
      return result;
    });
    const secondResult = container.querySelector<HTMLElement>(
      `[data-uie-uid="${secondConversation.id}"] [data-uie-name="go-open-conversation"]`,
    );
    expect(secondResult).toBeInTheDocument();

    await user.tab();
    expect(firstResult).toHaveFocus();
    secondResult?.remove();
    await user.keyboard('{ArrowDown}');

    const outsideTarget = document.createElement('button');
    document.body.append(outsideTarget);
    act(() => outsideTarget.focus());
    unmount();

    const replacementTarget = document.createElement('button');
    document.body.append(replacementTarget);
    expect(outsideTarget).toHaveFocus();
    expect(replacementTarget).not.toHaveFocus();
    replacementTarget.remove();
    outsideTarget.remove();
  });

  it('cancels delayed focus when switching conversation tabs', async () => {
    const conversationState = new ConversationState();
    const firstConversation = create1to1Conversation('Alice');
    const secondConversation = create1to1Conversation('Alina');
    conversationState.conversations([firstConversation, secondConversation]);
    const callState = {activeCalls: observable([]), joinableCalls: observable([])} as unknown as CallState;
    window.HTMLElement.prototype.scrollTo = jest.fn();
    const {container, getByRole, getByTitle} = render(
      withTheme(
        <Conversations
          {...defaultParams}
          callState={callState}
          conversationState={conversationState}
          searchRepository={searchRepository}
          conversationRepository={conversationRepository}
        />,
      ),
    );
    const user = userEvent.setup();
    const searchInput = getByRole('textbox');
    await user.type(searchInput, 'Ali');

    const firstResult = await waitFor(() => {
      const result = container.querySelector<HTMLElement>(
        `[data-uie-uid="${firstConversation.id}"] [data-uie-name="go-open-conversation"]`,
      );
      expect(result).toBeInTheDocument();
      return result;
    });
    const secondResult = container.querySelector<HTMLElement>(
      `[data-uie-uid="${secondConversation.id}"] [data-uie-name="go-open-conversation"]`,
    );
    expect(secondResult).toBeInTheDocument();

    await user.tab();
    expect(firstResult).toHaveFocus();
    secondResult?.remove();
    await user.keyboard('{ArrowDown}');

    act(() => getByTitle('conversationLabelFavorites').click());

    expect(searchInput).not.toHaveFocus();
  });

  it('preserves native search Tab when no result is mounted', async () => {
    const conversationState = new ConversationState();
    conversationState.conversations([create1to1Conversation('Alice')]);
    const callState = {activeCalls: observable([]), joinableCalls: observable([])} as unknown as CallState;
    window.HTMLElement.prototype.scrollTo = jest.fn();
    const {getByRole} = render(
      withTheme(
        <Conversations
          {...defaultParams}
          callState={callState}
          conversationState={conversationState}
          searchRepository={searchRepository}
          conversationRepository={conversationRepository}
        />,
      ),
    );
    const user = userEvent.setup();
    const searchInput = getByRole('textbox');
    await user.type(searchInput, 'No match');

    const tabEvent = new KeyboardEvent('keydown', {bubbles: true, cancelable: true, key: 'Tab'});
    act(() => searchInput.dispatchEvent(tabEvent));

    expect(tabEvent.defaultPrevented).toBe(false);
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
    useAppState.setState({listState: ListState.PREFERENCES});
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

  it('preserves the conversation deep link when switching between conversation list tabs', () => {
    useAppState.setState({listState: ListState.CONVERSATIONS});
    useSidebarStore.setState({currentTab: SidebarTabs.RECENT});
    const setHistoryParam = jest.spyOn(Router, 'setHistoryParam');
    setHistoryParam.mockClear();
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
      getByTitle('conversationLabelFavorites').click();
    });

    expect(setHistoryParam).not.toHaveBeenCalled();
  });

  it('keeps Connect selected on the first click when a conversation is shown', () => {
    const switchList = defaultParams.listViewModel.switchList as jest.Mock;
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
      getByTitle('searchConnect').click();
    });

    act(() => {
      amplify.publish(WebAppEvents.CONVERSATION.SHOW, {} as Conversation);
    });

    expect(switchList).toHaveBeenCalledWith(ListState.CONVERSATIONS, false);
    expect(useSidebarStore.getState().currentTab).toBe(SidebarTabs.CONNECT);
  });

  it.each([SidebarTabs.MEETINGS, SidebarTabs.PREFERENCES])(
    'keeps Connect selected on the first click after visiting tab %s',
    fromTab => {
      useSidebarStore.getState().setCurrentTab(fromTab);

      const switchList = defaultParams.listViewModel.switchList as jest.Mock;
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
        getByTitle('searchConnect').click();
      });

      act(() => {
        amplify.publish(WebAppEvents.CONVERSATION.SHOW, {} as Conversation);
      });

      expect(switchList).toHaveBeenCalledWith(ListState.CONVERSATIONS, false);
      expect(useSidebarStore.getState().currentTab).toBe(SidebarTabs.CONNECT);
    },
  );
});
