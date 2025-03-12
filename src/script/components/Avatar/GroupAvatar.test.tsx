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

import {GroupAvatar} from './GroupAvatar';

import {User} from '../../entity/User';

describe('GroupAvatar', () => {
  it('renders avatar', async () => {
    const user0 = new User('user0');
    const user1 = new User('user1');
    const user2 = new User('user2');
    const user3 = new User('user3');
    user0.name('Anton Bertha');
    user1.name('Spencer Senger');
    user2.name('Tasia Price');
    user3.name('Dorsey Rath');

    const {getByTestId} = render(<GroupAvatar users={[user0, user1, user2, user3]} />);

    const avatarWrapper = getByTestId('group-avatar-box-wrapper');

    expect(avatarWrapper.children).toHaveLength(4);
  });
});
