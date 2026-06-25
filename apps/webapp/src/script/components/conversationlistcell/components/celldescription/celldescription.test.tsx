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

import {CONVERSATION_PROTOCOL} from '@wireapp/api-client/lib/team';
import {act, render, screen} from '@testing-library/react';
import type {RenderResult} from '@testing-library/react';
import type {ReactElement} from 'react';

import {NOTIFICATION_STATE} from 'Repositories/conversation/notificationsetting';
import {Conversation} from 'Repositories/entity/conversation';
import {ContentMessage} from 'Repositories/entity/message/contentmessage';
import {Text} from 'Repositories/entity/message/text';
import {User} from 'Repositories/entity/user';
import {
  createRootContextValueForTest,
  createRootProviderWrapperForTest,
} from 'src/script/page/testSupport/rootcontexttestsupport';
import {translateForTest} from 'Util/test/translatefortest';
import {createUuid} from 'Util/uuid';

import {CellDescription} from './celldescription';

const rootProviderWrapper = createRootProviderWrapperForTest(
  createRootContextValueForTest({translate: translateForTest}),
);

type ConversationWithUnreadTextMessage = {
  conversation: Conversation;
  unreadMessage: ContentMessage;
};

function createConversationWithUnreadTextMessage(): ConversationWithUnreadTextMessage {
  const conversation = new Conversation(createUuid(), '', CONVERSATION_PROTOCOL.PROTEUS, translateForTest);
  const selfUser = new User(createUuid(), '', translateForTest);
  selfUser.isMe = true;
  conversation.selfUser(selfUser);
  conversation.mutedState(NOTIFICATION_STATE.EVERYTHING);

  const sender = new User(createUuid(), '', translateForTest);
  const unreadMessage = new ContentMessage(createUuid(), translateForTest);
  unreadMessage.user(sender);
  unreadMessage.timestamp(1);
  unreadMessage.assets([new Text(createUuid(), 'Unread preview')]);

  conversation.setTimestamp(0, Conversation.TIMESTAMP_TYPE.LAST_READ, true);
  conversation.messages_unordered.push(unreadMessage);

  return {conversation, unreadMessage};
}

function renderCellDescription(conversation: Conversation): RenderResult {
  return render(
    <CellDescription
      conversation={conversation}
      mutedState={conversation.mutedState()}
      isActive={false}
      isRequest={conversation.isRequest()}
      unreadState={conversation.unreadState()}
    />,
    {wrapper: rootProviderWrapper},
  );
}

function createCellDescriptionElement(conversation: Conversation): ReactElement {
  return (
    <CellDescription
      conversation={conversation}
      mutedState={conversation.mutedState()}
      isActive={false}
      isRequest={conversation.isRequest()}
      unreadState={conversation.unreadState()}
    />
  );
}

describe('CellDescription', () => {
  it('removes the unread second-line preview after the conversation becomes read', () => {
    const {conversation, unreadMessage} = createConversationWithUnreadTextMessage();
    const {rerender} = renderCellDescription(conversation);

    expect(screen.getByText(/Unread preview/)).toBeDefined();

    act(() => {
      conversation.setTimestamp(unreadMessage.timestamp(), Conversation.TIMESTAMP_TYPE.LAST_READ);
    });

    rerender(createCellDescriptionElement(conversation));

    expect(screen.queryByText(/Unread preview/)).toBeNull();
  });
});
