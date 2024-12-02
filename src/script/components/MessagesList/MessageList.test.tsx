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

import {act, render, waitFor} from '@testing-library/react';

import {Conversation} from 'src/script/entity/Conversation';
import {ContentMessage} from 'src/script/entity/message/ContentMessage';
import {User} from 'src/script/entity/User';
import {createUuid} from 'Util/uuid';

import {Text} from '../../entity/message/Text';

import {MessagesList} from './';

const getDefaultParams = (): React.ComponentProps<typeof MessagesList> => {
  const conversation = new Conversation(createUuid());

  return {
    cancelConnectionRequest: jest.fn(),
    conversation,
    assetRepository: {
      processQueue: [],
    } as any,
    conversationRepository: {
      expectReadReceipt: jest.fn(() => false),
      getMessagesWithOffset: jest.fn(),
      getPrecedingMessages: jest.fn(),
      getSubsequentMessages: jest.fn(),
      updateParticipatingUserEntities: jest.fn(),
    } as any,
    getVisibleCallback: jest.fn(),
    invitePeople: jest.fn(),
    messageActions: {
      deleteMessage: jest.fn(),
      deleteMessageEveryone: jest.fn(),
    },
    messageRepository: {
      getMessageInConversationById: jest.fn(),
      sendButtonAction: jest.fn(),
    } as any,
    onClickMessage: jest.fn(),
    onLoading: jest.fn(),
    resetSession: jest.fn(),
    selfUser: new User(),
    showImageDetails: jest.fn(),
    showMessageDetails: jest.fn(),
    showParticipants: jest.fn(),
    showUserDetails: jest.fn(),
    isMsgElementsFocusable: true,
    setMsgElementsFocusable: jest.fn(),
    showMessageReactions: jest.fn(),
    updateConversationLastRead: jest.fn(),
  };
};

const createTextMessage = (text: string) => {
  const message = new ContentMessage(createUuid());
  const textAsset = new Text(createUuid(), text);
  message.assets.push(textAsset);
  return message;
};

describe('MessagesList', () => {
  it('loads the message list when initiated', async () => {
    const params = getDefaultParams();
    params.conversation.addMessage(createTextMessage('hello'));

    const {getByText} = render(<MessagesList {...params} />);
    await waitFor(() => getByText('hello'));
    expect(params.onLoading).toHaveBeenCalled();
    expect(params.conversationRepository.getPrecedingMessages).toHaveBeenCalled();
  });

  it('updates the message list when message is added', async () => {
    const params = getDefaultParams();
    params.conversation.addMessage(createTextMessage('first'));

    const {getByText} = render(<MessagesList {...params} />);
    expect(await waitFor(() => getByText('first'))).not.toBe(null);

    act(() => {
      params.conversation.addMessage(createTextMessage('second'));
    });
    expect(await waitFor(() => getByText('second'))).not.toBe(null);
  });
});
