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
import {User} from 'Repositories/entity/User';

import {TemporaryGuestAvatar} from './TemporaryGuestAvatar';

import {AVATAR_SIZE, STATE} from '.';

describe('TemporaryGuestAvatar', () => {
  it('shows expiration circle', async () => {
    const participant = new User('id');
    participant.name('Anton Bertha');
    participant.isTemporaryGuest(true);

    const props = {
      avatarSize: AVATAR_SIZE.LARGE,
      participant: participant,
      state: STATE.NONE,
    };

    const {getByTestId} = render(<TemporaryGuestAvatar {...props} />);

    expect(getByTestId('element-avatar-guest-expiration-circle')).not.toBeNull();
  });

  it('shows participant initials', async () => {
    const participant = new User('id');
    participant.name('Anton Bertha');
    participant.isTemporaryGuest(true);

    const props = {
      avatarSize: AVATAR_SIZE.LARGE,
      participant: participant,
      state: STATE.NONE,
    };

    const {getByText} = render(<TemporaryGuestAvatar {...props} />);

    expect(getByText('AB')).not.toBeNull();
  });

  it('does not show avatar badge in default state', async () => {
    const participant = new User('id');
    participant.name('Anton Bertha');
    participant.isTemporaryGuest(true);

    const props = {
      avatarSize: AVATAR_SIZE.LARGE,
      participant: participant,
      state: STATE.NONE,
    };

    const {queryByTestId} = render(<TemporaryGuestAvatar {...props} />);

    expect(queryByTestId('element-avatar-user-badge-icon')).toBeNull();
  });

  it('shows avatar badge for blocked user', async () => {
    const participant = new User('id');
    participant.name('Anton Bertha');
    participant.isTemporaryGuest(true);

    const props = {
      avatarSize: AVATAR_SIZE.LARGE,
      participant: participant,
      state: STATE.BLOCKED,
    };

    const {getByTestId} = render(<TemporaryGuestAvatar {...props} />);

    expect(getByTestId('element-avatar-user-badge-icon').getAttribute('data-uie-value')).toEqual(STATE.BLOCKED);
  });
});
