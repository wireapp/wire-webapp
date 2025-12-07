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
import {Participant} from 'Repositories/calling/Participant';
import {User} from 'Repositories/entity/User';
import {ROLE} from 'Repositories/user/UserPermission';
import {createUuid} from 'Util/uuid';

import {Availability} from '@wireapp/protocol-messaging';

import {CallParticipantsListItem} from './CallParticipantsListItem';

const createMockParticipant = ({
  name,
  availability,
  isSelfUser = false,
  isGuest = false,
  isFederated = false,
  isExternal = false,
  isAudioEstablished = true,
}: {
  name?: string;
  availability?: Availability.Type;
  isSelfUser?: boolean;
  isGuest?: boolean;
  isFederated?: boolean;
  isExternal?: boolean;
  isAudioEstablished?: boolean;
}) => {
  const user = new User(createUuid());
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

  const clientId = createUuid();
  const participant = new Participant(user, clientId);

  participant.isAudioEstablished(isAudioEstablished);

  return participant;
};

describe('CallParticipantsListItem', () => {
  it('should render participant user avatar', () => {
    const participant = createMockParticipant({});
    const {getByTestId} = render(
      <CallParticipantsListItem showContextMenu onContextMenu={jest.fn()} callParticipant={participant} />,
    );

    expect(getByTestId('element-avatar-user')).toBeDefined();
  });

  it('should render participant user name', () => {
    const participantName = 'John Doe';
    const participant = createMockParticipant({
      name: participantName,
      isSelfUser: false,
    });

    const {getByText} = render(
      <CallParticipantsListItem showContextMenu onContextMenu={jest.fn()} callParticipant={participant} />,
    );

    expect(getByText(participantName)).toBeDefined();
  });

  it('should mark user as self if relevant', () => {
    const selfParticipant = createMockParticipant({isSelfUser: true});

    const {getByText} = render(
      <CallParticipantsListItem showContextMenu onContextMenu={jest.fn()} callParticipant={selfParticipant} />,
    );

    expect(getByText('(ConversationYouNominative)')).toBeDefined();
  });

  it('should display user status badges based on its status', () => {
    const selfParticipant = createMockParticipant({
      isGuest: true,
      isFederated: false,
      isExternal: true,
    });

    const {getByTestId} = render(
      <CallParticipantsListItem showContextMenu onContextMenu={jest.fn()} callParticipant={selfParticipant} />,
    );

    expect(getByTestId('status-guest')).toBeDefined();
    expect(getByTestId('status-external')).toBeDefined();
  });

  it('should open context menu on user item click', () => {
    const participant = createMockParticipant({});
    const onContextMenu = jest.fn();
    const {getByTestId} = render(
      <CallParticipantsListItem showContextMenu onContextMenu={onContextMenu} callParticipant={participant} />,
    );

    const userItem = getByTestId('item-user');
    userItem.click();

    expect(onContextMenu).toHaveBeenCalled();
  });

  it('should not open context menu when user is in unestablished audio state', () => {
    const participant = createMockParticipant({isAudioEstablished: false});
    const onContextMenu = jest.fn();
    const {getByTestId} = render(
      <CallParticipantsListItem showContextMenu onContextMenu={onContextMenu} callParticipant={participant} />,
    );

    const userItem = getByTestId('item-user');
    userItem.click();

    expect(onContextMenu).not.toHaveBeenCalled();
  });

  it('should show "connecting..." text if user is in unestablishd audio state', () => {
    const participant = createMockParticipant({isAudioEstablished: false});
    const onContextMenu = jest.fn();
    const {getByText} = render(
      <CallParticipantsListItem showContextMenu onContextMenu={onContextMenu} callParticipant={participant} />,
    );

    expect(getByText('videoCallParticipantConnecting')).toBeDefined();
  });
});
