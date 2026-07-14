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

import {render} from '@testing-library/react';
import {CONVERSATION_CELLS_STATE} from '@wireapp/api-client/lib/conversation';
import {CONVERSATION_PROTOCOL} from '@wireapp/api-client/lib/team';

import {Conversation} from 'Repositories/entity/Conversation';
import {MemberMessage as MemberMessageEntity} from 'Repositories/entity/message/memberMessage';
import {User} from 'Repositories/entity/User';
import {withTheme} from 'src/script/auth/util/test/testUtil';
import {SystemMessageType} from 'src/script/message/systemMessageType';
import {translateForTest} from 'Util/test/translateForTest';
import {
  createRootContextValueForTest,
  createRootProviderWrapperForTest,
} from 'src/script/page/testSupport/rootContextTestSupport';
import {generateUser} from 'test/helper/UserGenerator';
import {createUuid} from 'Util/uuid';

import {MessageWrapper} from './MessageWrapper';

const rootProviderWrapper = createRootProviderWrapperForTest(
  createRootContextValueForTest({translate: translateForTest}),
);

function createMemberMessage(systemType: SystemMessageType, users?: User[]) {
  const message = new MemberMessageEntity(translateForTest);
  message.memberMessageType = systemType;
  const actor = generateUser();
  message.user(actor);
  if (users) {
    message.userIds(users.map(user => user.qualifiedId));
    message.userEntities(users);
  } else {
    message.userIds([actor.qualifiedId]);
    message.userEntities([actor]);
  }
  message.name('Test Conversation');
  return message;
}

const createBaseProps = (conversation: Conversation, message: MemberMessageEntity) => ({
  conversation,
  message,
  selfId: {id: createUuid(), domain: 'test.wire.link'},
  isFocused: false,
  isSelfTemporaryGuest: false,
  isLastDeliveredMessage: false,
  shouldShowInvitePeople: false,
  hideHeader: false,
  hasReadReceiptsTurnedOn: false,
  isHighlighted: false,
  handleFocus: jest.fn(),
  handleArrowKeyDown: jest.fn(),
  setMsgElementsFocusable: jest.fn(),
  onClickAvatar: jest.fn(),
  onClickImage: jest.fn(),
  onClickInvitePeople: jest.fn(),
  onClickReactionDetails: jest.fn(),
  onClickMessage: jest.fn(),
  onClickTimestamp: jest.fn(),
  onClickParticipants: jest.fn(),
  onClickDetails: jest.fn(),
  onClickResetSession: jest.fn(),
  onClickCancelRequest: jest.fn(),
  messageRepository: {
    getMessageInConversationById: jest.fn(),
    getMessageInConversationByReplacementId: jest.fn(),
    ensureMessageSender: jest.fn(),
    sendButtonAction: jest.fn(),
    sendTextWithLinkPreview: jest.fn(),
    retryUploadFile: jest.fn(),
    toggleReaction: jest.fn(),
  } as any,
  messageActions: {
    deleteMessage: jest.fn(),
    deleteMessageEveryone: jest.fn(),
  },
  isMsgElementsFocusable: false,
});

describe('MessageWrapper', () => {
  describe('Cells conversation logic', () => {
    it('computes isCellsConversation as true when cellsState is READY', () => {
      const conversation = new Conversation(
        createUuid(),
        'test.wire.link',
        CONVERSATION_PROTOCOL.PROTEUS,
        translateForTest,
      );
      conversation.cellsState(CONVERSATION_CELLS_STATE.READY);

      const message = createMemberMessage(SystemMessageType.CONVERSATION_CREATE, [generateUser()]);
      const props = createBaseProps(conversation, message);

      const {getByText} = render(withTheme(<MessageWrapper {...props} />), {wrapper: rootProviderWrapper});

      expect(getByText('conversationCellsConversationEnabled')).toBeInTheDocument();
    });

    it('computes isCellsConversation as true when cellsState is PENDING', () => {
      const conversation = new Conversation(
        createUuid(),
        'test.wire.link',
        CONVERSATION_PROTOCOL.PROTEUS,
        translateForTest,
      );
      conversation.cellsState(CONVERSATION_CELLS_STATE.PENDING);

      const message = createMemberMessage(SystemMessageType.CONVERSATION_CREATE, [generateUser()]);
      const props = createBaseProps(conversation, message);

      const {getByText} = render(withTheme(<MessageWrapper {...props} />), {wrapper: rootProviderWrapper});

      expect(getByText('conversationCellsConversationEnabled')).toBeInTheDocument();
    });

    it('computes isCellsConversation as false when cellsState is DISABLED', () => {
      const conversation = new Conversation(
        createUuid(),
        'test.wire.link',
        CONVERSATION_PROTOCOL.PROTEUS,
        translateForTest,
      );
      conversation.cellsState(CONVERSATION_CELLS_STATE.DISABLED);

      const message = createMemberMessage(SystemMessageType.CONVERSATION_CREATE, [generateUser()]);
      const props = createBaseProps(conversation, message);

      const {queryByText} = render(withTheme(<MessageWrapper {...props} />), {wrapper: rootProviderWrapper});

      expect(queryByText('conversationCellsConversationEnabled')).not.toBeInTheDocument();
    });
  });

  describe('Self-deleting messages off logic', () => {
    it('computes isSelfDeletingMessagesOff as true when isCellsConversation is true (even with hasGlobalMessageTimer)', () => {
      const conversation = new Conversation(
        createUuid(),
        'test.wire.link',
        CONVERSATION_PROTOCOL.PROTEUS,
        translateForTest,
      );
      conversation.cellsState(CONVERSATION_CELLS_STATE.READY);
      conversation.globalMessageTimer(60000);

      const message = createMemberMessage(SystemMessageType.CONVERSATION_CREATE, [generateUser()]);
      const props = createBaseProps(conversation, message);

      const {getByText} = render(withTheme(<MessageWrapper {...props} />), {wrapper: rootProviderWrapper});

      expect(getByText('conversationDetailsActionTimedMessagesDisabled')).toBeInTheDocument();
    });

    it('computes isSelfDeletingMessagesOff as true when hasGlobalMessageTimer is false', () => {
      const conversation = new Conversation(
        createUuid(),
        'test.wire.link',
        CONVERSATION_PROTOCOL.PROTEUS,
        translateForTest,
      );
      conversation.cellsState(CONVERSATION_CELLS_STATE.DISABLED);
      conversation.globalMessageTimer(0);

      const message = createMemberMessage(SystemMessageType.CONVERSATION_CREATE, [generateUser()]);
      const props = createBaseProps(conversation, message);

      const {getByText} = render(withTheme(<MessageWrapper {...props} />), {wrapper: rootProviderWrapper});

      expect(getByText('conversationDetailsActionTimedMessagesDisabled')).toBeInTheDocument();
    });

    it('computes isSelfDeletingMessagesOff as false only when hasGlobalMessageTimer is true AND isCellsConversation is false', () => {
      const conversation = new Conversation(
        createUuid(),
        'test.wire.link',
        CONVERSATION_PROTOCOL.PROTEUS,
        translateForTest,
      );
      conversation.cellsState(CONVERSATION_CELLS_STATE.DISABLED);
      conversation.globalMessageTimer(60000);

      const message = createMemberMessage(SystemMessageType.CONVERSATION_CREATE, [generateUser()]);
      const props = createBaseProps(conversation, message);

      const {queryByText} = render(withTheme(<MessageWrapper {...props} />), {wrapper: rootProviderWrapper});

      expect(queryByText('conversationDetailsActionTimedMessagesDisabled')).not.toBeInTheDocument();
    });

    it('shows both banners when Cells is enabled with PENDING state', () => {
      const conversation = new Conversation(
        createUuid(),
        'test.wire.link',
        CONVERSATION_PROTOCOL.PROTEUS,
        translateForTest,
      );
      conversation.cellsState(CONVERSATION_CELLS_STATE.PENDING);
      conversation.globalMessageTimer(60000);

      const message = createMemberMessage(SystemMessageType.CONVERSATION_CREATE, [generateUser()]);
      const props = createBaseProps(conversation, message);

      const {getByText} = render(withTheme(<MessageWrapper {...props} />), {wrapper: rootProviderWrapper});

      expect(getByText('conversationCellsConversationEnabled')).toBeInTheDocument();
      expect(getByText('conversationDetailsActionTimedMessagesDisabled')).toBeInTheDocument();
    });
  });
});
