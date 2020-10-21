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

import ParticipantAvatar, {AVATAR_SIZE, ParticipantAvatarProps, STATE} from './ParticipantAvatarComponent';
import TestPage from 'Util/test/TestPage';
import {User} from '../entity/User';
import {AssetRepository} from '../assets/AssetRepository';

class ParticipantAvatarPage extends TestPage<ParticipantAvatarProps> {
  constructor(props?: ParticipantAvatarProps) {
    super(ParticipantAvatar, props);
  }

  getUserAvatar = () => this.get('div[data-uie-name="user-avatar"]');
  getServiceAvatar = () => this.get('div[data-uie-name="service-avatar"]');
  getInitials = () => this.get('div[data-uie-name="element-avatar-initials"]');
  getServiceIcon = () => this.get('div[data-uie-name="element-avatar-service-icon"]');
  getUserBadgeIcon = (state?: STATE) =>
    this.get(`div[data-uie-name="element-avatar-user-badge-icon"]${state ? `[data-uie-value="${state}"]` : ''}`);
  getGuestExpirationCircle = () => this.get('svg[data-uie-name="element-avatar-guest-expiration-circle"]');

  clickUserAvatar = () => this.click(this.getUserAvatar());
}

fdescribe('ParticipantAvatar', () => {
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

    it('shows single initial character when avatar size is extra small', async () => {
      const assetRepoSpy = (jasmine.createSpy() as unknown) as AssetRepository;
      const participant = new User('id');
      participant.name('Anton Bertha');

      const participantAvatar = new ParticipantAvatarPage({
        assetRepository: assetRepoSpy,
        participant: participant,
        size: AVATAR_SIZE.X_SMALL,
      });

      expect(participantAvatar.getInitials().exists()).toBe(true);
      expect(participantAvatar.getInitials().text()).toBe('A');
    });

    it('does not show avatar badge in default state', async () => {
      const assetRepoSpy = (jasmine.createSpy() as unknown) as AssetRepository;
      const participant = new User('id');
      participant.name('Anton Bertha');

      const participantAvatar = new ParticipantAvatarPage({
        assetRepository: assetRepoSpy,
        participant: participant,
      });

      expect(participantAvatar.getUserBadgeIcon().exists()).toBe(false);
    });

    it('shows avatar badge for blocked user', async () => {
      const assetRepoSpy = (jasmine.createSpy() as unknown) as AssetRepository;
      const participant = new User('id');
      participant.name('Anton Bertha');
      (participant as any).isBlocked = () => true;

      const participantAvatar = new ParticipantAvatarPage({
        assetRepository: assetRepoSpy,
        participant: participant,
      });

      expect(participantAvatar.getUserBadgeIcon(STATE.BLOCKED).exists()).toBe(true);
    });

    it('shows avatar badge for connection request', async () => {
      const assetRepoSpy = (jasmine.createSpy() as unknown) as AssetRepository;
      const participant = new User('id');
      participant.name('Anton Bertha');
      (participant as any).isRequest = () => true;

      const participantAvatar = new ParticipantAvatarPage({
        assetRepository: assetRepoSpy,
        participant: participant,
      });

      expect(participantAvatar.getUserBadgeIcon(STATE.PENDING).exists()).toBe(true);
    });
  });

  describe('for a Guest', () => {
    it('shows expiration circle', async () => {
      const assetRepoSpy = (jasmine.createSpy() as unknown) as AssetRepository;
      const participant = new User('id');
      participant.name('Anton Bertha');
      participant.isTemporaryGuest(true);

      const participantAvatar = new ParticipantAvatarPage({
        assetRepository: assetRepoSpy,
        participant: participant,
      });

      expect(participantAvatar.getGuestExpirationCircle().exists()).toBe(true);
    });

    it('shows participant initials', async () => {
      const assetRepoSpy = (jasmine.createSpy() as unknown) as AssetRepository;
      const participant = new User('id');
      participant.name('Anton Bertha');
      participant.isTemporaryGuest(true);

      const participantAvatar = new ParticipantAvatarPage({
        assetRepository: assetRepoSpy,
        participant: participant,
      });

      expect(participantAvatar.getInitials().exists()).toBe(true);
      expect(participantAvatar.getInitials().text()).toBe('AB');
    });

    it('does not show avatar badge in default state', async () => {
      const assetRepoSpy = (jasmine.createSpy() as unknown) as AssetRepository;
      const participant = new User('id');
      participant.name('Anton Bertha');
      participant.isTemporaryGuest(true);

      const participantAvatar = new ParticipantAvatarPage({
        assetRepository: assetRepoSpy,
        participant: participant,
      });

      expect(participantAvatar.getUserBadgeIcon().exists()).toBe(false);
    });

    it('shows avatar badge for blocked user', async () => {
      const assetRepoSpy = (jasmine.createSpy() as unknown) as AssetRepository;
      const participant = new User('id');
      participant.name('Anton Bertha');
      participant.isTemporaryGuest(true);
      (participant as any).isBlocked = () => true;

      const participantAvatar = new ParticipantAvatarPage({
        assetRepository: assetRepoSpy,
        participant: participant,
      });

      expect(participantAvatar.getUserBadgeIcon(STATE.BLOCKED).exists()).toBe(true);
    });
  });

  describe('for a Service', () => {
    it('shows a service icon', async () => {
      const assetRepoSpy = (jasmine.createSpy() as unknown) as AssetRepository;
      const service = new User('id');
      service.isService = true;

      const participantAvatar = new ParticipantAvatarPage({
        assetRepository: assetRepoSpy,
        participant: service,
      });

      expect(participantAvatar.getServiceIcon().exists()).toBe(true);
    });

    it('does not show initials', async () => {
      const assetRepoSpy = (jasmine.createSpy() as unknown) as AssetRepository;
      const service = new User('id');
      service.name('Anton Bertha');
      service.isService = true;

      const participantAvatar = new ParticipantAvatarPage({
        assetRepository: assetRepoSpy,
        participant: service,
      });

      expect(participantAvatar.getInitials().exists()).toBe(false);
    });

    it('does not show avatar badge', async () => {
      const assetRepoSpy = (jasmine.createSpy() as unknown) as AssetRepository;
      const service = new User('id');
      service.name('Anton Bertha');
      service.isService = true;

      const participantAvatar = new ParticipantAvatarPage({
        assetRepository: assetRepoSpy,
        participant: service,
      });

      expect(participantAvatar.getUserBadgeIcon().exists()).toBe(false);
    });
  });
});
