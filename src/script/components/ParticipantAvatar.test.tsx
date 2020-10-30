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

import ParticipantAvatar, {ParticipantAvatarProps} from './ParticipantAvatar';
import TestPage from 'Util/test/TestPage';
import {User} from '../entity/User';
import {AssetRepository} from '../assets/AssetRepository';

class ParticipantAvatarPage extends TestPage<ParticipantAvatarProps> {
  constructor(props?: ParticipantAvatarProps) {
    super(ParticipantAvatar, props);
  }

  getUserParticpantAvatar = () => this.get('div[data-uie-name="element-avatar-user"]');
  getServiceParticipantAvatar = () => this.get('div[data-uie-name="service-avatar"]');
  getTemporaryGuestAvatar = () => this.get('div[data-uie-name="element-avatar-temporary-guest"]');
  getServiceAvatar = () => this.get('div[data-uie-name="element-avatar-service"]');
  getUserAvatar = () => this.get('div[data-uie-name="element-avatar-user"]');

  clickUserAvatar = () => this.click(this.getUserParticpantAvatar());
}

describe('ParticipantAvatar', () => {
  it('executes onClick with current participant', async () => {
    const assetRepoSpy = (jasmine.createSpy() as unknown) as AssetRepository;
    const participant = new User('id');
    participant.name('Anton Bertha');

    const participantAvatar = new ParticipantAvatarPage({
      assetRepository: assetRepoSpy,
      clickHandler: jasmine.createSpy(),
      participant,
    });

    participantAvatar.clickUserAvatar();

    expect(participantAvatar.getProps().clickHandler).toHaveBeenCalledWith(
      participantAvatar.getProps().participant,
      jasmine.anything(),
    );
  });

  it('renders temporary guest avatar', async () => {
    const assetRepoSpy = (jasmine.createSpy() as unknown) as AssetRepository;
    const participant = new User('id');
    participant.name('Anton Bertha');
    participant.isTemporaryGuest(true);

    const participantAvatar = new ParticipantAvatarPage({
      assetRepository: assetRepoSpy,
      participant,
    });

    expect(participantAvatar.getTemporaryGuestAvatar().exists()).toBe(true);
  });

  it('renders service avatar', async () => {
    const assetRepoSpy = (jasmine.createSpy() as unknown) as AssetRepository;
    const participant = new User('id');
    participant.name('Anton Bertha');
    participant.isService = true;

    const participantAvatar = new ParticipantAvatarPage({
      assetRepository: assetRepoSpy,
      participant,
    });

    expect(participantAvatar.getServiceAvatar().exists()).toBe(true);
  });

  it('renders user avatar', async () => {
    const assetRepoSpy = (jasmine.createSpy() as unknown) as AssetRepository;
    const participant = new User('id');
    participant.name('Anton Bertha');

    const participantAvatar = new ParticipantAvatarPage({
      assetRepository: assetRepoSpy,
      participant,
    });

    expect(participantAvatar.getUserAvatar().exists()).toBe(true);
  });
});
