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

import type {ComponentProps} from 'react';

import {render, waitFor} from '@testing-library/react';
import ko from 'knockout';
import {noop} from 'noop-esm';

import {CONVERSATION_PROTOCOL} from '../../apiClient/team/feature/featureList.types';
import {pendingOfflineMessagesFeatureToggleName} from '../../featureToggles/startupFeatureToggleNames';
import {StatusType} from '../../message/statusType';
import {
  createRootContextValueForTest,
  createRootProviderWrapperForTest,
} from '../../page/testSupport/rootContextTestSupport';
import {AssetRepository} from '../../repositories/assets/assetRepository';
import {ConversationRepository} from '../../repositories/conversation/ConversationRepository';
import {MessageRepository} from '../../repositories/conversation/MessageRepository';
import {Conversation} from '../../repositories/entity/Conversation';
import {ContentMessage} from '../../repositories/entity/message/contentMessage';
import {Text} from '../../repositories/entity/message/text';
import {User} from '../../repositories/entity/User';
import {THEME_ID} from '../../uiKit/identity/theme/theme';
import {StyledApp} from '../../uiKit/layout/styledApp/styledApp';
import {translateForTest} from '../../util/test/translateForTest';

import {MessagesList} from './messageList';
import {OfflineNotice} from './offlineNotice';

const baseTimestamp = 1_000_000;
const messageSpacing = 1000;

function createMessageListProperties(): ComponentProps<typeof MessagesList> {
  const selfUser = new User('self', '', translateForTest);
  selfUser.isMe = true;

  return {
    conversation: new Conversation('conversation', '', CONVERSATION_PROTOCOL.PROTEUS, translateForTest),
    assetRepository: {
      processQueue: ko.observableArray([]),
      uploadProgressQueue: ko.observableArray([]),
    } as unknown as AssetRepository,
    conversationRepository: {
      updateParticipatingUserEntities: jest.fn().mockResolvedValue(undefined),
      getPrecedingMessages: jest.fn().mockResolvedValue([]),
      expectReadReceipt: jest.fn().mockReturnValue(false),
    } as unknown as ConversationRepository,
    messageRepository: {
      getOutboxState: jest.fn().mockReturnValue('pending'),
    } as unknown as MessageRepository,
    selfUser,
    cancelPendingReadReceiptsForConversation: noop,
    isMsgElementsFocusable: false,
    cancelConnectionRequest: noop,
    getVisibleCallback: () => {
      return undefined;
    },
    invitePeople: noop,
    loadUsersByIdsFromDb: jest.fn(),
    messageActions: {deleteMessage: noop, deleteMessageEveryone: noop},
    onClickMessage: noop,
    onLoading: noop,
    resetSession: noop,
    setMsgElementsFocusable: noop,
    showImageDetails: noop,
    showMessageDetails: noop,
    showMessageReactions: noop,
    showParticipants: noop,
    showUserDetails: noop,
    updateConversationLastRead: noop,
    isOutboxEnabled: true,
    offlineNotice: null,
  };
}

function createMessage(id: string, status: StatusType, index: number, sender: User): ContentMessage {
  const message = new ContentMessage(id, translateForTest);
  message.status(status);
  message.timestamp(baseTimestamp + index * messageSpacing);
  message.from = sender.id;
  message.user(sender);
  const text = new Text('', id);
  jest.spyOn(text, 'render').mockReturnValue(`<span>${id}</span>`);
  message.assets.push(text);
  return message;
}

function createWrapper(isOutboxEnabled: boolean, themeId: THEME_ID) {
  const RootProviderWrapper = createRootProviderWrapperForTest(
    createRootContextValueForTest({
      translate: translateForTest,
      isFeatureToggleEnabled: featureName => {
        return isOutboxEnabled && featureName === pendingOfflineMessagesFeatureToggleName;
      },
    }),
  );

  return function ThemedWrapper({children}: {children: React.ReactNode}) {
    return (
      <StyledApp themeId={themeId}>
        <RootProviderWrapper>{children}</RootProviderWrapper>
      </StyledApp>
    );
  };
}

describe.each([THEME_ID.LIGHT, THEME_ID.DARK])('MessagesList with the outbox in the %s', themeId => {
  let properties: ComponentProps<typeof MessagesList>;

  beforeEach(() => {
    properties = createMessageListProperties();
  });

  async function renderLoadedList(isOutboxEnabled = true): Promise<ReturnType<typeof render>> {
    const renderedList = render(<MessagesList {...properties} isOutboxEnabled={isOutboxEnabled} />, {
      wrapper: createWrapper(isOutboxEnabled, themeId),
    });
    await waitFor(() => {
      expect(renderedList.container.querySelector('.messages')).not.toBeNull();
    });
    return renderedList;
  }

  function goOffline(): void {
    properties.offlineNotice = <OfflineNotice label="outboxOfflineNotice" />;
  }

  it('puts the offline notice right above the first pending message', async () => {
    const {conversation, selfUser} = properties;
    conversation.messages_unordered([
      createMessage('sent', StatusType.SENT, 0, selfUser),
      createMessage('failed', StatusType.FAILED, 1, selfUser),
      createMessage('pending-1', StatusType.SENDING, 2, selfUser),
      createMessage('pending-2', StatusType.SENDING, 3, selfUser),
    ]);
    goOffline();

    const {getAllByRole, container} = await renderLoadedList();

    expect(getAllByRole('status')).toHaveLength(1);
    const notice = getAllByRole('status')[0];
    const messageIds = Array.from(container.querySelectorAll('[data-uie-name="item-message"], [role="status"]')).map(
      element => {
        return element === notice ? 'notice' : element.getAttribute('data-uie-uid');
      },
    );
    expect(messageIds).toEqual(['sent', 'failed', 'notice', 'pending-1', 'pending-2']);
  });

  it('puts the offline notice at the end of the list when nothing is pending', async () => {
    const {conversation, selfUser} = properties;
    conversation.messages_unordered([
      createMessage('sent', StatusType.SENT, 0, selfUser),
      createMessage('failed', StatusType.FAILED, 1, selfUser),
    ]);
    goOffline();

    const {getByRole, container} = await renderLoadedList();

    const messages = Array.from(container.querySelectorAll('[data-uie-name="item-message"]'));
    const notice = getByRole('status');
    expect(messages).toHaveLength(2);
    expect(messages.at(-1)?.compareDocumentPosition(notice)).toBe(Node.DOCUMENT_POSITION_FOLLOWING);
  });

  it('shows the notice in a conversation without messages', async () => {
    goOffline();

    const {getByRole} = await renderLoadedList();

    expect(getByRole('status')).toHaveTextContent('outboxOfflineNotice');
  });

  it('shows no notice while online', async () => {
    const {conversation, selfUser} = properties;
    conversation.messages_unordered([createMessage('pending', StatusType.SENDING, 0, selfUser)]);

    const {queryByRole} = await renderLoadedList();

    expect(queryByRole('status')).not.toBeInTheDocument();
  });

  it('gives each sending state its own header', async () => {
    const {conversation, selfUser} = properties;
    conversation.messages_unordered([
      createMessage('sent', StatusType.SENT, 0, selfUser),
      createMessage('pending-1', StatusType.SENDING, 1, selfUser),
      createMessage('pending-2', StatusType.SENDING, 2, selfUser),
      createMessage('failed', StatusType.FAILED, 3, selfUser),
    ]);

    const {container} = await renderLoadedList();

    const headers = Array.from(container.querySelectorAll('.message-header')).map(header => {
      return header.closest('[data-uie-name="item-message"]')?.getAttribute('data-uie-uid');
    });
    expect(headers).toEqual(['sent', 'pending-1', 'failed']);
  });

  it('keeps the headers of a conversation as they are with the toggle off', async () => {
    const {conversation, selfUser} = properties;
    conversation.messages_unordered([
      createMessage('sent', StatusType.SENT, 0, selfUser),
      createMessage('pending-1', StatusType.SENDING, 1, selfUser),
      createMessage('failed', StatusType.FAILED, 2, selfUser),
    ]);

    const {container} = await renderLoadedList(false);

    expect(container.querySelectorAll('.message-header')).toHaveLength(1);
  });
});
