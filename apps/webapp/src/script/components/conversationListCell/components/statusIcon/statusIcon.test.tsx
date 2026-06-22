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

import {Conversation} from 'Repositories/entity/Conversation';
import {ContentMessage} from 'Repositories/entity/message/contentMessage';
import {User} from 'Repositories/entity/User';
import {
  createRootContextValueForTest,
  createRootProviderWrapperForTest,
} from 'src/script/page/testSupport/rootContextTestSupport';
import {translateForTest} from 'Util/test/translateForTest';
import {createUuid} from 'Util/uuid';

import {StatusIcon} from './statusIcon';

const rootProviderWrapper = createRootProviderWrapperForTest(
  createRootContextValueForTest({translate: translateForTest}),
);

describe('StatusIcon', () => {
  it('renders an unread mention icon after the conversation unread state changes', () => {
    const conversation = new Conversation(createUuid(), '', CONVERSATION_PROTOCOL.PROTEUS, translateForTest);
    const selfUser = new User(createUuid(), '', translateForTest);
    selfUser.isMe = true;
    conversation.selfUser(selfUser);

    const sender = new User(createUuid(), '', translateForTest);
    const mentionMessage = new ContentMessage(createUuid(), translateForTest);
    mentionMessage.user(sender);
    mentionMessage.timestamp(1);
    jest.spyOn(mentionMessage, 'isUserMentioned').mockReturnValue(true);

    render(<StatusIcon conversation={conversation} />, {wrapper: rootProviderWrapper});

    expect(screen.queryByTitle('accessibility.conversationStatusUnreadMention')).toBeNull();

    act(() => {
      conversation.messages_unordered.push(mentionMessage);
    });

    expect(screen.getByTitle('accessibility.conversationStatusUnreadMention')).toBeDefined();
  });
});
