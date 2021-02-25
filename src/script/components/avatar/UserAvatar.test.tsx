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

import UserAvatar, {UserAvatarProps} from './UserAvatar';
import {User} from '../../entity/User';
import {AVATAR_SIZE, STATE} from '../Avatar';

jest.mock('../../auth/util/SVGProvider');

class UserAvatarPage extends TestPage<UserAvatarProps> {
  constructor(props?: UserAvatarProps) {
    super(UserAvatar, props);
  }

  getInitials = () => this.get('div[data-uie-name="element-avatar-initials"]');
  getUserBadgeIcon = (state?: STATE) =>
    this.get(`div[data-uie-name="element-avatar-user-badge-icon"]${state ? `[data-uie-value="${state}"]` : ''}`);
}

describe('UserAvatar', () => {
  it('shows participant initials if no avatar is defined', async () => {
    const participant = new User('id');
    participant.name('Anton Bertha');

    const userAvatar = new UserAvatarPage({
      avatarSize: AVATAR_SIZE.LARGE,
      participant: participant,
      state: STATE.NONE,
    });

    expect(userAvatar.getInitials().exists()).toBe(true);
    expect(userAvatar.getInitials().text()).toBe('AB');
  });

  it('shows single initial character when avatar size is extra small', async () => {
    const participant = new User('id');
    participant.name('Anton Bertha');

    const userAvatar = new UserAvatarPage({
      avatarSize: AVATAR_SIZE.X_SMALL,
      participant: participant,
      state: STATE.NONE,
    });

    expect(userAvatar.getInitials().exists()).toBe(true);
    expect(userAvatar.getInitials().text()).toBe('A');
  });

  it('does not show avatar badge in default state', async () => {
    const participant = new User('id');
    participant.name('Anton Bertha');

    const userAvatar = new UserAvatarPage({
      avatarSize: AVATAR_SIZE.LARGE,
      participant: participant,
      state: STATE.NONE,
    });

    expect(userAvatar.getUserBadgeIcon().exists()).toBe(false);
  });

  it('shows avatar badge for blocked user', async () => {
    const participant = new User('id');
    participant.name('Anton Bertha');

    const userAvatar = new UserAvatarPage({
      avatarSize: AVATAR_SIZE.LARGE,
      participant: participant,
      state: STATE.BLOCKED,
    });

    expect(userAvatar.getUserBadgeIcon(STATE.BLOCKED).exists()).toBe(true);
  });

  it('shows avatar badge for connection request', async () => {
    const participant = new User('id');
    participant.name('Anton Bertha');

    const userAvatar = new UserAvatarPage({
      avatarSize: AVATAR_SIZE.LARGE,
      participant: participant,
      state: STATE.PENDING,
    });

    expect(userAvatar.getUserBadgeIcon(STATE.PENDING).exists()).toBe(true);
  });
});
