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
import {ConnectionStatus} from '@wireapp/api-client/lib/connection';
import {CONVERSATION_TYPE} from '@wireapp/api-client/lib/conversation';

import {withTheme} from 'src/script/auth/util/test/TestUtil';
import {ConnectionEntity} from 'src/script/connection/ConnectionEntity';
import {CONVERSATION_READONLY_STATE} from 'src/script/conversation/ConversationRepository';
import {Conversation} from 'src/script/entity/Conversation';
import {User} from 'src/script/entity/User';

import {ReadOnlyConversationMessage} from './ReadOnlyConversationMessage';

const generateConversation = (
  readOnlyState: CONVERSATION_READONLY_STATE | null = null,
  is1To1WithBlockedUser = false,
  userName = 'John Doe',
) => {
  const conversation = new Conversation();
  conversation.type(CONVERSATION_TYPE.ONE_TO_ONE);
  conversation.readOnlyState(readOnlyState);

  const connection = new ConnectionEntity();

  if (is1To1WithBlockedUser) {
    connection.status(ConnectionStatus.BLOCKED);
  }

  const user = new User('user-id', 'user-domain');
  user.name(userName);
  conversation.participating_user_ets([user]);
  conversation.participating_user_ids([user.qualifiedId]);

  user.connection(connection);
  connection.userId = user.qualifiedId;

  return conversation;
};

describe('ReadOnlyConversationMessage', () => {
  it('renders mls is not supported by the other user', () => {
    const conversation = generateConversation(
      CONVERSATION_READONLY_STATE.READONLY_ONE_TO_ONE_OTHER_UNSUPPORTED_MLS,
      false,
    );

    const {getByText} = render(
      withTheme(<ReadOnlyConversationMessage conversation={conversation} handleMLSUpdate={() => {}} />),
    );

    expect(getByText('otherUserNotSupportMLSMsg')).toBeDefined();
  });

  it('renders mls is not supported by the self user', () => {
    const conversation = generateConversation(
      CONVERSATION_READONLY_STATE.READONLY_ONE_TO_ONE_SELF_UNSUPPORTED_MLS,
      false,
    );

    const {getByText} = render(
      withTheme(<ReadOnlyConversationMessage handleMLSUpdate={() => {}} conversation={conversation} />),
    );

    expect(getByText('selfNotSupportMLSMsgPart1')).toBeDefined();
    expect(getByText('downloadLatestMLS')).toBeDefined();
    expect(getByText('selfNotSupportMLSMsgPart2')).toBeDefined();
  });

  it('renders a conversation with a blocked user', () => {
    const conversation = generateConversation(null, true);

    const {getByText} = render(
      withTheme(<ReadOnlyConversationMessage handleMLSUpdate={() => {}} conversation={conversation} />),
    );

    expect(getByText('conversationWithBlockedUser')).toBeDefined();
  });
});
