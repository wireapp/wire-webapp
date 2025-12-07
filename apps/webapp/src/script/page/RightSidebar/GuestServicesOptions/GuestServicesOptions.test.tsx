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
import ko from 'knockout';
import {ACCESS_STATE} from 'Repositories/conversation/AccessState';
import {ConversationRepository} from 'Repositories/conversation/ConversationRepository';
import {Conversation} from 'Repositories/entity/Conversation';
import {TeamRepository} from 'Repositories/team/TeamRepository';
import {TeamState} from 'Repositories/team/TeamState';

import {GuestServicesOptions} from './GuestServicesOptions';

import {TestFactory} from '../../../../../test/helper/TestFactory';

const testFactory = new TestFactory();
let conversationRepository: ConversationRepository;

beforeAll(() => {
  testFactory.exposeConversationActors().then(factory => {
    conversationRepository = factory;
    return conversationRepository;
  });
});

const getDefaultParams = (isGuest: boolean = true) => {
  return {
    conversationRepository,
    isGuest,
    onBack: jest.fn(),
    onClose: jest.fn(),
    teamRepository: {
      conversationHasGuestLinkEnabled: async (conversationId: string) => true,
    } as TeamRepository,
    teamState: {
      ...new TeamState(),
      isGuestLinkEnabled: ko.pureComputed(() => true),
    } as TeamState,
  };
};

describe('GuestServicesOptions', () => {
  it('renders guest options', async () => {
    const conversation = new Conversation();
    conversation.accessState(ACCESS_STATE.TEAM.GUEST_ROOM);
    conversation.accessCode('accessCode');

    const newConv = {
      ...conversation,
      inTeam: ko.pureComputed(() => true),
      isGuestRoom: ko.pureComputed(() => true),
    } as Conversation;

    const defaultProps = getDefaultParams();
    const {getByText} = render(<GuestServicesOptions {...defaultProps} activeConversation={newConv} />);

    await waitFor(() => {
      getByText('guestOptionsCopyLink');
    });

    expect(getByText('guestRoomToggleInfoHead')).not.toBeNull();
  });

  it('renders services options', () => {
    const conversation = new Conversation();
    const defaultProps = getDefaultParams(false);
    const {getByText} = render(<GuestServicesOptions {...defaultProps} activeConversation={conversation} />);

    expect(getByText('servicesRoomToggleInfo')).not.toBeNull();
  });
});
