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

import {createRef} from 'react';

import {render} from '@testing-library/react';
import {ConversationProtocol, CONVERSATION_TYPE} from '@wireapp/api-client/lib/conversation';
import ko from 'knockout';

import {CallState} from 'Repositories/calling/CallState';
import {ConversationLabel, ConversationLabelRepository} from 'Repositories/conversation/ConversationLabelRepository';
import {ConversationState} from 'Repositories/conversation/ConversationState';
import {Conversation} from 'Repositories/entity/Conversation';
import {User} from 'Repositories/entity/User';
import {ListViewModel} from 'src/script/view_model/ListViewModel';

import {ConversationsList} from './ConversationsList';

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
  let connectRequests: User[];
  let conversationState: ConversationState;
  let callState: CallState;
  let currentFocus: string;
  let currentFolder: ConversationLabel;
  let resetConversationFocus: jest.Mock;
  let handleArrowKeyDown: jest.Mock;
  let clearSearchFilter: jest.Mock;
  let conversationLabelRepository: ConversationLabelRepository;

  beforeEach(async () => {
    listViewModel = {} as ListViewModel;
    connectRequests = [];
    conversationState = {isActiveConversation: ko.observable(false) as any} as ConversationState;
    callState = {joinableCalls: ko.pureComputed(() => [] as any[]) as any} as CallState;
    currentFocus = '';
    currentFolder = {} as ConversationLabel;
    resetConversationFocus = jest.fn();
    handleArrowKeyDown = jest.fn();
    clearSearchFilter = jest.fn();
  });

  const renderComponent = (conversations: Conversation[], searchFilter: string = '') =>
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
        isEmpty={false}
        searchInputRef={createRef()}
      />,
    );

  it("should render all 1:1 conversations if there's no search filter", () => {
    const userNames = ['Alice', 'Bob', 'Charlie'];
    const conversations = userNames.map(create1to1Conversation);

    window.Element.prototype.getBoundingClientRect = jest.fn().mockReturnValue({height: 1000, width: 1000});

    const {getByText} = renderComponent(conversations);

    userNames.forEach(userName => {
      expect(getByText(userName)).toBeDefined();
    });
  });
});
