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

import TemporaryGuestAvatar from './TemporaryGuestAvatar';
import TestPage from 'Util/test/TestPage';
import {User} from '../../entity/User';
import {AssetRepository} from '../../assets/AssetRepository';
import {UserAvatarProps} from './UserAvatar';
import {AVATAR_SIZE, STATE} from '../ParticipantAvatar';

class TemporaryGuestAvatarPage extends TestPage<UserAvatarProps> {
  constructor(props?: UserAvatarProps) {
    super(TemporaryGuestAvatar, props);
  }

  getInitials = () => this.get('div[data-uie-name="element-avatar-initials"]');
  getServiceIcon = () => this.get('div[data-uie-name="element-avatar-service-icon"]');
  getUserBadgeIcon = (state?: STATE) =>
    this.get(`div[data-uie-name="element-avatar-user-badge-icon"]${state ? `[data-uie-value="${state}"]` : ''}`);
  getGuestExpirationCircle = () => this.get('svg[data-uie-name="element-avatar-guest-expiration-circle"]');
}

describe('TemporaryGuestAvatar', () => {
  it('shows expiration circle', async () => {
    const assetRepoSpy = (jasmine.createSpy() as unknown) as AssetRepository;
    const participant = new User('id');
    participant.name('Anton Bertha');
    participant.isTemporaryGuest(true);

    const temporaryGuestAvatar = new TemporaryGuestAvatarPage({
      assetRepository: assetRepoSpy,
      participant: participant,
      size: AVATAR_SIZE.LARGE,
      state: STATE.NONE,
    });

    expect(temporaryGuestAvatar.getGuestExpirationCircle().exists()).toBe(true);
  });

  it('shows participant initials', async () => {
    const assetRepoSpy = (jasmine.createSpy() as unknown) as AssetRepository;
    const participant = new User('id');
    participant.name('Anton Bertha');
    participant.isTemporaryGuest(true);

    const temporaryGuestAvatar = new TemporaryGuestAvatarPage({
      assetRepository: assetRepoSpy,
      participant: participant,
      size: AVATAR_SIZE.LARGE,
      state: STATE.NONE,
    });

    expect(temporaryGuestAvatar.getInitials().exists()).toBe(true);
    expect(temporaryGuestAvatar.getInitials().text()).toBe('AB');
  });

  it('does not show avatar badge in default state', async () => {
    const assetRepoSpy = (jasmine.createSpy() as unknown) as AssetRepository;
    const participant = new User('id');
    participant.name('Anton Bertha');
    participant.isTemporaryGuest(true);

    const temporaryGuestAvatar = new TemporaryGuestAvatarPage({
      assetRepository: assetRepoSpy,
      participant: participant,
      size: AVATAR_SIZE.LARGE,
      state: STATE.NONE,
    });

    expect(temporaryGuestAvatar.getUserBadgeIcon().exists()).toBe(false);
  });

  it('shows avatar badge for blocked user', async () => {
    const assetRepoSpy = (jasmine.createSpy() as unknown) as AssetRepository;
    const participant = new User('id');
    participant.name('Anton Bertha');
    participant.isTemporaryGuest(true);

    const temporaryGuestAvatar = new TemporaryGuestAvatarPage({
      assetRepository: assetRepoSpy,
      participant: participant,
      size: AVATAR_SIZE.LARGE,
      state: STATE.BLOCKED,
    });

    expect(temporaryGuestAvatar.getUserBadgeIcon(STATE.BLOCKED).exists()).toBe(true);
  });
});
