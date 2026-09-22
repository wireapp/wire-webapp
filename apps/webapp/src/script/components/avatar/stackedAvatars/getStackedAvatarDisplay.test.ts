/*
 * Wire
 * Copyright (C) 2026 Wire Swiss GmbH
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

import {getStackedAvatarDisplay} from './getStackedAvatarDisplay';

describe('getStackedAvatarDisplay', () => {
  it('shows all avatars for up to four participants', () => {
    expect(getStackedAvatarDisplay(1)).toEqual({visibleCount: 1, overflowCount: 0});
    expect(getStackedAvatarDisplay(4)).toEqual({visibleCount: 4, overflowCount: 0});
  });

  it('shows four avatars and overflow for more than four participants', () => {
    expect(getStackedAvatarDisplay(5)).toEqual({visibleCount: 4, overflowCount: 1});
    expect(getStackedAvatarDisplay(17)).toEqual({visibleCount: 4, overflowCount: 13});
  });
});
