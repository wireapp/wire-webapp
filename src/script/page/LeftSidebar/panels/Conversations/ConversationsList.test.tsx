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

import {render} from '@testing-library/react';
import {ConversationProtocol, CONVERSATION_TYPE} from '@wireapp/api-client/lib/conversation';
import ko from 'knockout';

import {CallState} from 'src/script/calling/CallState';
import {ConversationLabel, ConversationLabelRepository} from 'src/script/conversation/ConversationLabelRepository';
import {ConversationRepository} from 'src/script/conversation/ConversationRepository';
import {ConversationState} from 'src/script/conversation/ConversationState';
import {Conversation} from 'src/script/entity/Conversation';
import {User} from 'src/script/entity/User';
import {ListViewModel} from 'src/script/view_model/ListViewModel';
import {TestFactory} from 'test/helper/TestFactory';

import {ConversationsList} from './ConversationsList';
import {SidebarTabs} from './state';

const create1to1Conversation = (userName: string) => {
  const conversation = new Conversation('id', 'domain', ConversationProtocol.PROTEUS);
  const user = new User('id', 'domain');
  user.name(userName);
  conversation.type(CONVERSATION_TYPE.ONE_TO_ONE);
  conversation.participating_user_ets([user]);
  conversation.participating_user_ids([user.qualifiedId]);
  return conversation;
};

describe('ConversationsList', () => {
  let listViewModel: ListViewModel;
  let currentTab: SidebarTabs;
  let connectRequests: User[];
  let conversationState: ConversationState;
  let callState: CallState;
  let currentFocus: string;
  let currentFolder: ConversationLabel;
  let resetConversationFocus: jest.Mock;
  let handleArrowKeyDown: jest.Mock;
  let clearSearchFilter: jest.Mock;
  let isConversationFilterFocused: boolean;
  let conversationLabelRepository: ConversationLabelRepository;
  let conversationRepository: ConversationRepository;

  beforeEach(async () => {
    listViewModel = {} as ListViewModel;
    currentTab = SidebarTabs.DIRECTS;
    connectRequests = [];
    conversationState = {isActiveConversation: ko.observable(false) as any} as ConversationState;
    callState = {joinableCalls: ko.pureComputed(() => []) as any} as CallState;
    currentFocus = '';
    currentFolder = {} as ConversationLabel;
    resetConversationFocus = jest.fn();
    handleArrowKeyDown = jest.fn();
    clearSearchFilter = jest.fn();
    isConversationFilterFocused = false;

    const testFactory = new TestFactory();
    conversationRepository = await testFactory.exposeConversationActors();
  });

  const renderComponent = (conversations: Conversation[], searchFilter: string = '') =>
    render(
      <ConversationsList
        conversationLabelRepository={conversationLabelRepository}
        conversationRepository={conversationRepository}
        conversations={conversations}
        conversationsFilter={searchFilter}
        listViewModel={listViewModel}
        currentTab={currentTab}
        connectRequests={connectRequests}
        conversationState={conversationState}
        callState={callState}
        currentFocus={currentFocus}
        currentFolder={currentFolder}
        resetConversationFocus={resetConversationFocus}
        handleArrowKeyDown={handleArrowKeyDown}
        clearSearchFilter={clearSearchFilter}
        isConversationFilterFocused={isConversationFilterFocused}
      />,
    );

  it("should render all 1:1 conversations if there's no search filter", () => {
    const unserNames = ['Alice', 'Bob', 'Charlie'];
    const conversations = unserNames.map(create1to1Conversation);

    const {getByText} = renderComponent(conversations);

    unserNames.forEach(userName => {
      expect(getByText(userName)).toBeDefined();
    });
  });

  it('should render only those 1:1 conversations that match the search filter', () => {
    const unserNames = ['Alice', 'Bob', 'Charlie'];
    const conversations = unserNames.map(create1to1Conversation);

    const {queryByText} = renderComponent(conversations, 'Alice');

    ['Bob', 'Charlie'].forEach(userName => {
      expect(queryByText(userName)).toBeNull();
    });

    expect(queryByText('Alice')).not.toBeNull();
  });
});
