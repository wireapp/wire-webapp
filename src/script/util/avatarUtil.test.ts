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
  it('should return correct colors for light theme', () => {
    const id = 'test-id';
    const theme = 'default';
    const colors = getGroupAvatarColors(id, theme);
    expect(colors).toEqual(expect.arrayContaining([expect.stringMatching(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/)]));
  });

  it('should return correct colors for dark theme', () => {
    const id = 'test-id';
    const theme = 'dark';
    const colors = getGroupAvatarColors(id, theme);
    expect(colors).toEqual(expect.arrayContaining([expect.stringMatching(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/)]));
  });

  it('should return consistent colors for the same id and theme', () => {
    const id = 'consistent-id';
    const theme = 'default';
    const colors1 = getGroupAvatarColors(id, theme);
    const colors2 = getGroupAvatarColors(id, theme);
    expect(colors1).toEqual(colors2);
  });

  it('should return different colors for different ids', () => {
    const id1 = 'id-1';
    const id2 = 'id-2';
    const theme = 'default';
    const colors1 = getGroupAvatarColors(id1, theme);
    const colors2 = getGroupAvatarColors(id2, theme);
    expect(colors1).not.toEqual(colors2);
  });

  it('should return different colors for different themes', () => {
    const id = 'test-id';
    const theme1 = 'default';
    const theme2 = 'dark';
    const colors1 = getGroupAvatarColors(id, theme1);
    const colors2 = getGroupAvatarColors(id, theme2);
    expect(colors1).not.toEqual(colors2);
  });
});
