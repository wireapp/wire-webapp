/*
 * Wire
 * Copyright (C) 2019 Wire Swiss GmbH
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

import {render, waitFor} from '@testing-library/react';
import {QualifiedId} from '@wireapp/api-client/lib/user';

import {Conversation} from 'src/script/entity/Conversation';
import {createUuid} from 'Util/uuid';

import {MessageDetails} from './MessageDetails';

import {TestFactory} from '../../../../../test/helper/TestFactory';
import {ConversationRepository} from '../../../conversation/ConversationRepository';
import {ContentMessage} from '../../../entity/message/ContentMessage';
import {User} from '../../../entity/User';
import {SearchRepository} from '../../../search/SearchRepository';
import {TeamRepository} from '../../../team/TeamRepository';
import {UserRepository} from '../../../user/UserRepository';

const testFactory = new TestFactory();
let conversationRepository: ConversationRepository;
let searchRepository: SearchRepository;

beforeAll(() => {
  testFactory.exposeConversationActors().then(factory => {
    conversationRepository = factory;
    return conversationRepository;
  });

  testFactory.exposeSearchActors().then(factory => {
    searchRepository = factory;
    return searchRepository;
  });
});

const getDefaultParams = (showLikes: boolean = false) => {
  return {
    conversationRepository,
    onClose: jest.fn(),
    searchRepository,
    showLikes,
    teamRepository: {
      conversationHasGuestLinkEnabled: async (conversationId: string) => true,
    } as TeamRepository,
    updateEntity: jest.fn(),
  };
};

describe('MessageDetails', () => {
  it('renders no likes view', async () => {
    const conversation = new Conversation();
    conversation.team_id = 'mock-team-id';

    const timestamp = new Date('2022-01-21T15:08:14.225Z').getTime();
    const userName = 'Jan Kowalski';

    const user = new User(createUuid());
    user.name(userName);

    const message = new ContentMessage(createUuid());
    message.timestamp(timestamp);
    message.user(user);

    const getUsersById = jest.fn(async (qid: QualifiedId) => {
      return [new User('mock-id', 'test-domain.mock')];
    });

    const userRepository = {
      getUsersById,
    } as unknown as UserRepository;

    const defaultProps = getDefaultParams();
    const {getByText} = render(
      <MessageDetails
        {...defaultProps}
        togglePanel={() => undefined}
        activeConversation={conversation}
        messageEntity={message}
        userRepository={userRepository}
      />,
    );

    await waitFor(() => {
      getByText('messageDetailsNoLikes');
    });

    expect(getByText('messageDetailsNoLikes')).not.toBeNull();
  });
});
