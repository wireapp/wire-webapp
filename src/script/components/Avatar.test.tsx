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

import TestPage from 'Util/test/TestPage';

import Avatar, {AvatarProps} from './Avatar';
import {User} from '../entity/User';
import {ServiceEntity} from '../integration/ServiceEntity';

jest.mock('../auth/util/SVGProvider');

class AvatarPage extends TestPage<AvatarProps> {
  constructor(props?: AvatarProps) {
    super(Avatar, props);
  }

  getUserParticipantAvatar = () => this.get('div[data-uie-name="element-avatar-user"]');
  getServiceParticipantAvatar = () => this.get('div[data-uie-name="service-avatar"]');
  getTemporaryGuestAvatar = () => this.get('div[data-uie-name="element-avatar-temporary-guest"]');
  getServiceAvatar = () => this.get('div[data-uie-name="element-avatar-service"]');
  getUserAvatar = () => this.get('div[data-uie-name="element-avatar-user"]');

  clickUserAvatar = () => this.click(this.getUserParticipantAvatar());
}

describe('Avatar', () => {
  it('executes onClick with current participant', () => {
    const participant = new User('id', null);
    participant.name('Anton Bertha');

    const participantAvatar = new AvatarPage({
      onAvatarClick: jasmine.createSpy(),
      participant,
    });

    participantAvatar.clickUserAvatar();

    expect(participantAvatar.getProps().onAvatarClick).toHaveBeenCalledWith(
      participantAvatar.getProps().participant,
      jasmine.anything(),
    );
  });

  it('renders temporary guest avatar', () => {
    const participant = new User('id', null);
    participant.name('Anton Bertha');
    participant.isTemporaryGuest(true);

    const participantAvatar = new AvatarPage({
      participant,
    });

    expect(participantAvatar.getTemporaryGuestAvatar().exists()).toBe(true);
  });

  it('renders service avatar', () => {
    const participant = new ServiceEntity({id: 'id'});
    participant.name('Anton Bertha');

    const participantAvatar = new AvatarPage({
      participant,
    });

    expect(participantAvatar.getServiceAvatar().exists()).toBe(true);
  });

  /**
   * This behaviour exists in the message list for message avatars and in the conversation details in the services section.
   */
  it('renders service avatar with participant of type User but isService = true', () => {
    const participant = new User('id', null);
    participant.name('Anton Bertha');
    participant.isService = true;

    const participantAvatar = new AvatarPage({
      participant,
    });

    expect(participantAvatar.getServiceAvatar().exists()).toBe(true);
  });

  it('renders user avatar', () => {
    const participant = new User('id', null);
    participant.name('Anton Bertha');

    const participantAvatar = new AvatarPage({
      participant,
    });

    expect(participantAvatar.getUserAvatar().exists()).toBe(true);
  });
});
