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

import {render} from '@testing-library/react';

import {UserAvatar} from './UserAvatar';

import {User} from '../../entity/User';

import {AVATAR_SIZE, STATE} from '.';

jest.mock('../../auth/util/SVGProvider');

describe('UserAvatar', () => {
  it('shows participant initials if no avatar is defined', async () => {
    const participant = new User('id');
    participant.name('Anton Bertha');

    const props = {
      avatarSize: AVATAR_SIZE.LARGE,
      participant,
      state: STATE.NONE,
    };

    const {getByText} = render(<UserAvatar {...props} />);

    expect(getByText('AB')).not.toBeNull();
  });

  it('shows single initial character when avatar size is extra small', async () => {
    const participant = new User('id');
    participant.name('Anton Bertha');

    const props = {
      avatarSize: AVATAR_SIZE.X_SMALL,
      participant,
      state: STATE.NONE,
    };

    const {getByText} = render(<UserAvatar {...props} />);

    expect(getByText('A')).not.toBeNull();
  });

  it('does not show avatar badge in default state', async () => {
    const participant = new User('id');
    participant.name('Anton Bertha');

    const props = {
      avatarSize: AVATAR_SIZE.LARGE,
      participant,
      state: STATE.NONE,
    };

    const {queryByTestId} = render(<UserAvatar {...props} />);
    expect(queryByTestId('element-avatar-user-badge-icon')).toBeNull();
  });

  it('shows avatar badge for blocked user', async () => {
    const participant = new User('id');
    participant.name('Anton Bertha');

    const props = {
      avatarSize: AVATAR_SIZE.LARGE,
      participant,
      state: STATE.BLOCKED,
    };

    const {getByTestId} = render(<UserAvatar {...props} />);
    const badgeIcon = getByTestId('element-avatar-user-badge-icon');

    expect(badgeIcon.getAttribute('data-uie-value')).toEqual(STATE.BLOCKED);
  });

  it('shows avatar badge for connection request', async () => {
    const participant = new User('id');
    participant.name('Anton Bertha');

    const props = {
      avatarSize: AVATAR_SIZE.LARGE,
      participant,
      state: STATE.PENDING,
    };

    const {getByTestId} = render(<UserAvatar {...props} />);
    const badgeIcon = getByTestId('element-avatar-user-badge-icon');

    expect(badgeIcon.getAttribute('data-uie-value')).toEqual(STATE.PENDING);
  });
});
