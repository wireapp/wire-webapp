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

import 'util/test/mock/resizeObserver.mock';
import React from 'react';
import {act, render, waitFor} from '@testing-library/react';
import {ContentMessage} from 'src/script/entity/message/ContentMessage';
import {Conversation} from 'src/script/entity/Conversation';
import MessagesList from './';
import {Text} from '../../entity/message/Text';
import {createRandomUuid} from 'Util/util';
import {User} from 'src/script/entity/User';

const getDefaultParams = (): React.ComponentProps<typeof MessagesList> => {
  const conversation = new Conversation(createRandomUuid());
  return {
    cancelConnectionRequest: jest.fn(),
    conversation,
    conversationRepository: {
      expectReadReceipt: jest.fn(() => false),
      getMessagesWithOffset: jest.fn(),
      getPrecedingMessages: jest.fn(),
      updateParticipatingUserEntities: jest.fn(),
    },
    getVisibleCallback: jest.fn(),
    initialMessage: undefined,
    invitePeople: jest.fn(),
    messageActions: {
      deleteMessage: jest.fn(),
      deleteMessageEveryone: jest.fn(),
    },
    messageRepository: undefined,
    onClickMessage: jest.fn(),
    onLoading: jest.fn(),
    resetSession: jest.fn(),
    selfUser: new User(),
    showImageDetails: jest.fn(),
    showMessageDetails: jest.fn(),
    showParticipants: jest.fn(),
    showUserDetails: jest.fn(),
  };
};

const createTextMessage = (text: string) => {
  const message = new ContentMessage(createRandomUuid());
  const textAsset = new Text(createRandomUuid(), text);
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
    await waitFor(() => getByText('first'));

    act(() => {
      params.conversation.addMessage(createTextMessage('second'));
    });
    await waitFor(() => getByText('second'));
  });
});
