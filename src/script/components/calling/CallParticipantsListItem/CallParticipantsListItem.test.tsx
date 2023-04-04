/*
 * Wire
 * Copyright (C) 2023 Wire Swiss GmbH
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

import {Availability} from '@wireapp/protocol-messaging';

import {Participant} from 'src/script/calling/Participant';
import {User} from 'src/script/entity/User';
import {ROLE} from 'src/script/user/UserPermission';
import {createRandomUuid} from 'Util/util';

import {CallParticipantsListItem} from './CallParticipantsListItem';

const createMockParticipant = ({
  name,
  availability,
  isSelfUser = false,
  isGuest = false,
  isFederated = false,
  isExternal = false,
}: {
  name?: string;
  availability?: Availability.Type;
  isSelfUser?: boolean;
  isGuest?: boolean;
  isFederated?: boolean;
  isExternal?: boolean;
}) => {
  const user = new User(createRandomUuid());
  user.name('user');
  user.isMe = isSelfUser;
  user.isGuest(isGuest);
  user.isFederated = isFederated;

  if (isExternal) {
    user.teamRole(ROLE.PARTNER);
  }

  if (name) {
    user.name(name);
  }
  if (availability) {
    user.availability(availability);
  }

  const clientId = createRandomUuid();
  const participant = new Participant(user, clientId);

  return participant;
};

describe('CallParticipantsListItem', () => {
  it('should render participant user avatar', () => {
    const participant = createMockParticipant({});
    const {getByTestId} = render(<CallParticipantsListItem callParticipant={participant} />);

    expect(getByTestId('element-avatar-user')).toBeDefined();
  });

  it('should render participant user name and availability status', () => {
    const participantName = 'John Doe';
    const participant = createMockParticipant({
      name: participantName,
      availability: Availability.Type.AVAILABLE,
      isSelfUser: false,
    });

    const {getByTestId, getByText} = render(
      <CallParticipantsListItem callParticipant={participant} selfInTeam={true} />,
    );

    expect(getByText(participantName)).toBeDefined();

    const availabilityElement = getByTestId('status-availability-icon');
    expect(availabilityElement.dataset.uieValue).toEqual('available');
  });

  it('should mark user as self if relevant', () => {
    const selfParticipant = createMockParticipant({isSelfUser: true});

    const {getByText} = render(<CallParticipantsListItem callParticipant={selfParticipant} />);

    expect(getByText('(ConversationYouNominative)')).toBeDefined();
  });

  it('should display user status badges based on its status', () => {
    const selfParticipant = createMockParticipant({
      isGuest: true,
      isFederated: false,
      isExternal: true,
    });

    const {getByTestId} = render(<CallParticipantsListItem callParticipant={selfParticipant} />);

    expect(getByTestId('status-guest')).toBeDefined();
    expect(getByTestId('status-external')).toBeDefined();
  });
});
