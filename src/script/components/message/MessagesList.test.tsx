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
import {act, render} from '@testing-library/react';
import {ContentMessage} from 'src/script/entity/message/ContentMessage';
import {Conversation} from 'src/script/entity/Conversation';
import MessagesList from './MessagesList';
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

describe('MessagesList', () => {
  it('loads the message list when initiated', done => {
    const params = getDefaultParams();
    const message = new ContentMessage();
    params.conversation.addMessage(message);

    render(
      <MessagesList
        {...params}
        onLoading={isLoading => {
          if (!isLoading) {
            expect(params.conversationRepository.getPrecedingMessages).toHaveBeenCalled();
            done();
          }
        }}
      />,
    );
  });

  it('updates the message list when message is added', () => {
    const params = getDefaultParams();
    const message = new ContentMessage(createRandomUuid());
    params.conversation.addMessage(message);

    const {container} = render(<MessagesList {...params} />);
    expect(container.querySelectorAll('.message').length).toBe(1);

    act(() => {
      params.conversation.addMessage(new ContentMessage(createRandomUuid()));
    });
    expect(container.querySelectorAll('.message').length).toBe(2);
  });
});
