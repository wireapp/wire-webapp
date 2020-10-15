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

import ParticipantAvatar, {ParticipantAvatarProps} from './ParticipantAvatarComponent';
import TestPage from 'Util/test/TestPage';
import {User} from '../entity/User';
import {AssetRepository} from '../assets/AssetRepository';

class ParticipantAvatarPage extends TestPage<ParticipantAvatarProps> {
  constructor(props?: ParticipantAvatarProps) {
    super(ParticipantAvatar, props);
  }

  getAvatar = () => this.get('.participant-avatar');
  getInitials = () => this.get('div[data-uie-name="element-avatar-initials"]');

  clickAvatar = () => this.click(this.getAvatar());
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

    participantAvatar.clickAvatar();

    expect(participantAvatar.getProps().clickHandler).toHaveBeenCalledWith(
      participantAvatar.getProps().participant,
      jasmine.anything(),
    );
  });

  describe('for a User', () => {
    it('shows participant initials if no avatar is defined', async () => {
      const assetRepoSpy = (jasmine.createSpy() as unknown) as AssetRepository;
      const participant = new User('id');
      participant.name('Anton Bertha');

      const participantAvatar = new ParticipantAvatarPage({
        assetRepository: assetRepoSpy,
        participant: participant,
      });

      expect(participantAvatar.getInitials().exists()).toBe(true);
      expect(participantAvatar.getInitials().text()).toBe('AB');
    });
  });
});
