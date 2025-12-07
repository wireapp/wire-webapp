/*
 * Wire
 * Copyright (C) 2025 Wire Swiss GmbH
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

import {getGroupAvatarColors} from './avatarUtil';
describe('AvatarUtil', () => {
  it('should return a valid color array for a given id', () => {
    const id = 'test-id';
    const colors = getGroupAvatarColors(id);
    expect(colors).toBeDefined();
    expect(colors.length).toBe(3);
  });

  it('should return the same color array for the same id', () => {
    const id = 'consistent-id';
    const colors1 = getGroupAvatarColors(id);
    const colors2 = getGroupAvatarColors(id);
    expect(colors1).toEqual(colors2);
  });

  it('should return different color arrays for different ids', () => {
    const id1 = 'id-1';
    const id2 = 'id-2';
    const colors1 = getGroupAvatarColors(id1);
    const colors2 = getGroupAvatarColors(id2);
    expect(colors1).not.toEqual(colors2);
  });

  it('should return a valid color array for an empty id', () => {
    const colors = getGroupAvatarColors('');
    expect(colors).toBeDefined();
    expect(colors.length).toBe(3);
  });
});
