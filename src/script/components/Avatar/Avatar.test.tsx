/*
 * Wire
 * Copyright (C) 2020 Wire Swiss GmbH
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

import {fireEvent, render} from '@testing-library/react';

import {User} from 'Repositories/entity/User';
import {ServiceEntity} from 'Repositories/integration/ServiceEntity';

import {Avatar} from './Avatar';

describe('Avatar', () => {
  it('executes onClick with current participant', () => {
    const participant = new User('id');
    participant.name('Anton Bertha');

    const props = {
      onAvatarClick: jasmine.createSpy(),
      participant,
    };

    const {getByTestId} = render(<Avatar {...props} />);

    const userAvatar = getByTestId('element-avatar-user');
    fireEvent.click(userAvatar);

    expect(props.onAvatarClick).toHaveBeenCalledWith(props.participant);
  });

  it('renders temporary guest avatar', () => {
    const participant = new User('id');
    participant.name('Anton Bertha');
    participant.isTemporaryGuest(true);

    const {getByTestId} = render(<Avatar participant={participant} />);
    expect(getByTestId('element-avatar-temporary-guest')).not.toBeNull();
  });

  it('renders service avatar', () => {
    const participant = new ServiceEntity({id: 'id'});
    participant.name('Anton Bertha');

    const {getByTestId} = render(<Avatar participant={participant} />);
    expect(getByTestId('element-avatar-service')).not.toBeNull();
  });

  /**
   * This behaviour exists in the message list for message avatars and in the conversation details in the services section.
   */
  it('renders service avatar with participant of type User but isService = true', () => {
    const participant = new User('id');
    participant.name('Anton Bertha');
    participant.isService = true;

    const {getByTestId} = render(<Avatar participant={participant} />);
    expect(getByTestId('element-avatar-service')).not.toBeNull();
  });

  it('renders user avatar', () => {
    const participant = new User('id');
    participant.name('Anton Bertha');

    const {getByTestId} = render(<Avatar participant={participant} />);
    expect(getByTestId('element-avatar-user')).not.toBeNull();
  });
});
