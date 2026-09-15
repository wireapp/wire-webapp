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

jest.mock('@tanstack/react-virtual', () => ({
  useVirtualizer: ({count}: {count: number}) => ({
    getVirtualItems: () =>
      Array.from({length: count}, (_, index) => ({index, key: index, size: 56, start: index * 56})),
    getTotalSize: () => count * 56, // default estimated row size
    scrollToIndex: jest.fn(),
  }),
}));

import {createRef, useRef} from 'react';
import type {KeyboardEvent as ReactKeyboardEvent} from 'react';

import userEvent from '@testing-library/user-event';
import {fireEvent, render} from '@testing-library/react';
import {CONVERSATION_TYPE} from '@wireapp/api-client/lib/conversation';
import {CONVERSATION_PROTOCOL} from '@wireapp/api-client/lib/team';
import ko from 'knockout';

import {CallState} from 'Repositories/calling/CallState';
import {ConversationLabel, ConversationLabelRepository} from 'Repositories/conversation/ConversationLabelRepository';
import {ConversationState} from 'Repositories/conversation/ConversationState';
import {Conversation} from 'Repositories/entity/Conversation';
import {User} from 'Repositories/entity/User';
import {translateForTest} from 'Util/test/translateForTest';
import {withThemeAndRootContext} from 'src/script/auth/util/test/testUtil';
import {
  createRootContextValueForTest,
  createRootProviderWrapperForTest,
} from 'src/script/page/testSupport/rootContextTestSupport';
import {ListViewModel} from 'src/script/view_model/ListViewModel';
import {useConversationFocus} from 'Hooks/useConversationFocus';
import {SidebarTabs, useSidebarStore} from './useSidebarStore';

import {ConversationHeaderComponent} from './conversationHeader/conversationHeader';
import {ConversationsList} from './conversationsList';

const create1to1Conversation = (userName: string) => {
  const conversation = new Conversation(userName, 'domain', CONVERSATION_PROTOCOL.PROTEUS, translateForTest);
  const user = new User('id', 'domain', translateForTest);
  user.name(userName);
  conversation.type(CONVERSATION_TYPE.ONE_TO_ONE);
  conversation.participating_user_ets([user]);
  conversation.participating_user_ids([user.qualifiedId]);
  return conversation;
};

describe('ConversationsList', () => {
  const rootProviderWrapper = createRootProviderWrapperForTest(
    createRootContextValueForTest({translate: translateForTest}),
  );
  let listViewModel: ListViewModel;
  let connectRequests: User[];
  let conversationState: ConversationState;
  let callState: CallState;
  let currentFocus: string;
  let currentFolder: ConversationLabel;
  let resetConversationFocus: jest.Mock;
  let handleArrowKeyDown: jest.Mock;
  let clearSearchFilter: jest.Mock;
  let conversationLabelRepository: ConversationLabelRepository = {} as ConversationLabelRepository;

  beforeEach(async () => {
    listViewModel = {} as ListViewModel;
    connectRequests = [];
    conversationState = {isActiveConversation: ko.observable(false) as any} as ConversationState;
    callState = {joinableCalls: ko.pureComputed(() => [] as any[]) as any} as CallState;
    currentFocus = '';
    currentFolder = {} as ConversationLabel;
    resetConversationFocus = jest.fn();
    handleArrowKeyDown = jest.fn(() => jest.fn());
    clearSearchFilter = jest.fn();
    useSidebarStore.setState({currentTab: SidebarTabs.RECENT});
  });

  const renderComponent = (conversations: Conversation[], searchFilter: string = '', isEmpty = false) =>
    render(
      <ConversationsList
        conversationLabelRepository={conversationLabelRepository}
        conversations={conversations}
        conversationsFilter={searchFilter}
        listViewModel={listViewModel}
        connectRequests={connectRequests}
        conversationState={conversationState}
        callState={callState}
        currentFocus={currentFocus}
        currentFolder={currentFolder}
        resetConversationFocus={resetConversationFocus}
        handleArrowKeyDown={handleArrowKeyDown}
        clearSearchFilter={clearSearchFilter}
        groupParticipantsConversations={[]}
        isGroupParticipantsVisible={false}
        isEmpty={isEmpty}
      />,
      {wrapper: rootProviderWrapper},
    );

  const renderKeyboardIntegration = (
    focusCandidates: Conversation[],
    renderedConversations: Conversation[] = focusCandidates,
  ) => {
    const KeyboardIntegration = () => {
      const searchInputRef = useRef<HTMLInputElement>(null);
      const {currentFocus, handleKeyDown, resetConversationFocus, setCurrentFocus} = useConversationFocus(
        focusCandidates,
        'Ali',
        conversationId => {
          const element = document.querySelector<HTMLElement>(
            `[data-uie-uid="${conversationId}"] [data-uie-name="go-open-conversation"]`,
          );
          element?.focus();
        },
      );
      const handleSearchTab = (event: ReactKeyboardEvent<HTMLInputElement>) => {
        const firstResult = focusCandidates[0];
        const element = firstResult
          ? document.querySelector<HTMLElement>(
              `[data-uie-uid="${firstResult.id}"] [data-uie-name="go-open-conversation"]`,
            )
          : null;

        if (!element) {
          return;
        }

        element.focus();
        if (document.activeElement !== element) {
          return;
        }

        event.preventDefault();
        setCurrentFocus(firstResult.id);
      };

      return (
        <>
          <ConversationHeaderComponent
            currentTab={SidebarTabs.RECENT}
            selfUser={new User('self', 'domain', translateForTest)}
            showSearchInput
            searchValue="Ali"
            setSearchValue={jest.fn()}
            searchInputPlaceholder="Search conversations"
            onSearchEnterClick={jest.fn()}
            onSearchTab={handleSearchTab}
            jumpToRecentSearch={jest.fn()}
            searchInputRef={searchInputRef}
          />
          <ConversationsList
            conversationLabelRepository={conversationLabelRepository}
            conversations={renderedConversations}
            conversationsFilter="Ali"
            listViewModel={listViewModel}
            connectRequests={connectRequests}
            conversationState={conversationState}
            callState={callState}
            currentFocus={currentFocus}
            currentFolder={currentFolder}
            resetConversationFocus={resetConversationFocus}
            handleArrowKeyDown={handleKeyDown}
            clearSearchFilter={clearSearchFilter}
            groupParticipantsConversations={[]}
            isGroupParticipantsVisible={false}
            isEmpty={false}
          />
          <button type="button" aria-label="after conversation list">
            After list
          </button>
        </>
      );
    };

    return render(withThemeAndRootContext(<KeyboardIntegration />, rootProviderWrapper));
  };

  it("should render all 1:1 conversations if there's no search filter", async () => {
    const userNames = ['Alice', 'Bob', 'Charlie'];
    const conversations = userNames.map(create1to1Conversation);

    window.Element.prototype.getBoundingClientRect = jest.fn().mockReturnValue({height: 1000, width: 1000});

    const {findByText} = renderComponent(conversations);

    await Promise.all(userNames.map(async userName => expect(await findByText(userName)).toBeDefined()));
  });

  it.each(['', 'Alice'])(
    'keeps pending requests before conversation results in the DOM order (filter: %s)',
    searchFilter => {
      const conversation = create1to1Conversation('Alice');
      const pendingRequest = new User('pending', 'domain', translateForTest);
      connectRequests = [pendingRequest];
      currentFocus = conversation.id;

      const {container} = renderComponent([conversation], searchFilter);
      const requestButton = container.querySelector('[data-uie-name="connection-request"] [role="button"]');
      const conversationButton = container.querySelector('[data-uie-name="go-open-conversation"]');

      if (!requestButton || !conversationButton) {
        throw new Error('Expected pending request and conversation controls to be rendered');
      }

      expect(requestButton).toHaveAttribute('tabindex', '0');
      expect(conversationButton).toHaveAttribute('tabindex', '0');
      expect(requestButton.compareDocumentPosition(conversationButton) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    },
  );

  it('keeps pending requests focusable when filtering has no conversation results', () => {
    const pendingRequest = new User('pending', 'domain', translateForTest);
    connectRequests = [pendingRequest];

    const {container} = renderComponent([], 'no match', true);
    const requestButton = container.querySelector('[data-uie-name="connection-request"] [role="button"]');

    expect(requestButton).toHaveAttribute('tabindex', '0');
    expect(container.querySelectorAll('[data-uie-name="go-open-conversation"]')).toHaveLength(0);
  });

  it('focuses the first filtered conversation when tabbing from the search input', async () => {
    const firstConversation = create1to1Conversation('Alice');
    const filteredConversation = create1to1Conversation('Bob');
    const searchInputRef = createRef<HTMLInputElement>();

    const {container} = render(
      <>
        <input ref={searchInputRef} aria-label="Search conversations" />
        <ConversationsList
          conversationLabelRepository={conversationLabelRepository}
          conversations={[filteredConversation]}
          conversationsFilter="Bob"
          listViewModel={listViewModel}
          connectRequests={connectRequests}
          conversationState={conversationState}
          callState={callState}
          currentFocus={filteredConversation.id}
          currentFolder={currentFolder}
          resetConversationFocus={resetConversationFocus}
          handleArrowKeyDown={handleArrowKeyDown}
          clearSearchFilter={clearSearchFilter}
          groupParticipantsConversations={[firstConversation]}
          isGroupParticipantsVisible={true}
          isEmpty={false}
        />
      </>,
      {wrapper: rootProviderWrapper},
    );

    const firstResult = container.querySelector('[data-uie-name="go-open-conversation"]');
    expect(firstResult).toHaveAttribute('tabindex', '0');

    const user = userEvent.setup();
    searchInputRef.current?.focus();
    await user.tab();

    expect(firstResult).toHaveFocus();

    const results = container.querySelectorAll('[data-uie-name="go-open-conversation"]');
    expect(results).toHaveLength(2);
    fireEvent.keyDown(results[1], {key: 'ArrowUp'});
    expect(handleArrowKeyDown).toHaveBeenCalledWith(1);
  });

  it('moves focus through rendered results, activates with Enter, and preserves native list exits', async () => {
    const firstConversation = create1to1Conversation('Alice');
    const secondConversation = create1to1Conversation('Alina');
    const {container, getByRole} = renderKeyboardIntegration([firstConversation, secondConversation]);
    const user = userEvent.setup();
    const searchInput = getByRole('textbox');
    const firstResult = container.querySelector<HTMLElement>(
      `[data-uie-uid="${firstConversation.id}"] [data-uie-name="go-open-conversation"]`,
    );
    const secondResult = container.querySelector<HTMLElement>(
      `[data-uie-uid="${secondConversation.id}"] [data-uie-name="go-open-conversation"]`,
    );
    const afterList = getByRole('button', {name: 'after conversation list'});

    expect(firstResult).toBeInTheDocument();
    expect(secondResult).toBeInTheDocument();
    searchInput.focus();
    await user.tab();
    expect(firstResult).toHaveFocus();

    await user.keyboard('{ArrowDown}');
    expect(secondResult).toHaveFocus();
    await user.keyboard('{ArrowUp}');
    expect(firstResult).toHaveFocus();
    await user.keyboard('{ArrowDown}{Enter}');
    expect(clearSearchFilter).toHaveBeenCalled();

    await user.tab();
    expect(afterList).toHaveFocus();

    firstResult?.focus();
    await user.tab({shift: true});
    expect(searchInput).toHaveFocus();
  });

  it('keeps native Tab fallback when the first focus candidate is not mounted', async () => {
    const firstConversation = create1to1Conversation('Alice');
    const event = new KeyboardEvent('keydown', {bubbles: true, cancelable: true, key: 'Tab'});
    const {getByRole} = renderKeyboardIntegration([firstConversation], []);
    const searchInput = getByRole('textbox');
    const afterList = getByRole('button', {name: 'after conversation list'});

    searchInput.focus();
    searchInput.dispatchEvent(event);

    expect(event.defaultPrevented).toBe(false);
    await userEvent.setup().tab();
    expect(afterList).toHaveFocus();
  });

  it('keeps the search input focused while filtered results are updated', () => {
    const searchInputRef = createRef<HTMLInputElement>();
    const conversation = create1to1Conversation('Alice');

    const {rerender} = render(
      <>
        <input ref={searchInputRef} aria-label="Search conversations" />
        <ConversationsList
          conversationLabelRepository={conversationLabelRepository}
          conversations={[conversation]}
          conversationsFilter="Alice"
          listViewModel={listViewModel}
          connectRequests={connectRequests}
          conversationState={conversationState}
          callState={callState}
          currentFocus={conversation.id}
          currentFolder={currentFolder}
          resetConversationFocus={resetConversationFocus}
          handleArrowKeyDown={handleArrowKeyDown}
          clearSearchFilter={clearSearchFilter}
          groupParticipantsConversations={[]}
          isGroupParticipantsVisible={false}
          isEmpty={false}
        />
      </>,
      {wrapper: rootProviderWrapper},
    );

    searchInputRef.current?.focus();
    const updatedConversation = create1to1Conversation('Bob');
    rerender(
      <>
        <input ref={searchInputRef} aria-label="Search conversations" />
        <ConversationsList
          conversationLabelRepository={conversationLabelRepository}
          conversations={[updatedConversation]}
          conversationsFilter="Bob"
          listViewModel={listViewModel}
          connectRequests={connectRequests}
          conversationState={conversationState}
          callState={callState}
          currentFocus={updatedConversation.id}
          currentFolder={currentFolder}
          resetConversationFocus={resetConversationFocus}
          handleArrowKeyDown={handleArrowKeyDown}
          clearSearchFilter={clearSearchFilter}
          groupParticipantsConversations={[]}
          isGroupParticipantsVisible={false}
          isEmpty={false}
        />
      </>,
    );

    expect(searchInputRef.current).toHaveFocus();
  });

  it('keeps group participant results inside the conversation results scroll container', async () => {
    const conversationNameResult = create1to1Conversation('Conversation name match');
    const participantNameResult = create1to1Conversation('Participant name match');

    const {container, findByText} = render(
      <ConversationsList
        conversationLabelRepository={conversationLabelRepository}
        conversations={[conversationNameResult]}
        conversationsFilter="a"
        listViewModel={listViewModel}
        connectRequests={connectRequests}
        conversationState={conversationState}
        callState={callState}
        currentFocus={currentFocus}
        currentFolder={currentFolder}
        resetConversationFocus={resetConversationFocus}
        handleArrowKeyDown={handleArrowKeyDown}
        clearSearchFilter={clearSearchFilter}
        groupParticipantsConversations={[participantNameResult]}
        isGroupParticipantsVisible={true}
        isEmpty={false}
      />,
      {wrapper: rootProviderWrapper},
    );

    const conversationList = container.querySelector<HTMLUListElement>('[data-uie-name="conversation-view"]');
    const groupParticipantsList = container.querySelector<HTMLUListElement>(
      '[data-uie-name="group-participants-conversations-view"]',
    );

    expect(conversationList).not.toBeNull();
    expect(groupParticipantsList).not.toBeNull();

    if (!conversationList || !groupParticipantsList) {
      throw new Error('Expected both conversation result lists to be rendered');
    }

    const actualGroupParticipantsContainer = groupParticipantsList.parentElement?.parentElement;
    const expectedGroupParticipantsContainer = conversationList;

    expect(actualGroupParticipantsContainer).toBe(expectedGroupParticipantsContainer);
    expect(groupParticipantsList.parentElement?.tagName).toBe('LI');
    await expect(findByText('Conversation name match')).resolves.toBeDefined();
    await expect(findByText('Participant name match')).resolves.toBeDefined();
    await expect(findByText('searchConversationNames')).resolves.toBeDefined();
    await expect(findByText('searchGroupParticipants')).resolves.toBeDefined();
  });
});
