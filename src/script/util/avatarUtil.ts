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

import {User} from 'Repositories/entity/User';

import {ACCENT_ID} from '../Config';

// calculation of hash code for string based on this doc:
// https://wearezeta.atlassian.net/wiki/spaces/AR/pages/1696858160/Consistent+Conversation+Colors+A+Hash-Based+Approach+for+Conversation+id
function getHashCode(str: string) {
  let hash = 0;
  for (let counter = 0; counter < str.length; counter++) {
    // charCodeAt provides the UTF-16 code unit.
    // "| 0" ensures we keep it 32-bit integer.
    // eslint-disable-next-line no-magic-numbers
    hash = (31 * hash + str.charCodeAt(counter)) | 0;
  }
  return hash;
}

const green = User.ACCENT_COLOR[ACCENT_ID.GREEN];
const amber = User.ACCENT_COLOR[ACCENT_ID.AMBER];
const blue = User.ACCENT_COLOR[ACCENT_ID.BLUE];
const purple = User.ACCENT_COLOR[ACCENT_ID.PURPLE];
const red = User.ACCENT_COLOR[ACCENT_ID.RED];
const turquoise = User.ACCENT_COLOR[ACCENT_ID.TURQUOISE];

const groupAvatarOptions = [
  [green, purple, red],
  [blue, green, amber],
  [blue, red, purple],
  [amber, green, purple],
  [green, blue, purple],
  [blue, amber, green],
  [red, turquoise, purple],
  [green, red, blue],
  [amber, blue, purple],
  [purple, turquoise, green],
  [green, purple, red],
  [green, blue, red],
  [purple, blue, green],
  [green, blue, amber],
  [green, amber, purple],
];

// The color options for the channel avatar.
const channelAvatarColorOptions = ['blue', 'purple', 'red', 'green', 'amber', 'turquoise', 'black'];

const borderIdentifier = 'border';
const backgroundIdentifier = 'background';
const colorIdentifier = 'color';

const channelAvatarColorPalette = channelAvatarColorOptions.map(color => ({
  background: `${color}-${backgroundIdentifier}`,
  color: `${color}-${colorIdentifier}`,
  border: `${color}-${borderIdentifier}`,
}));
/**
 *
 * @param id - unique id - The ID used to generate a hash code for selecting a color.
 * @returns - array of colors for group avatar
 */
export function getGroupAvatarColors(id = '') {
  const hash = getHashCode(id);
  return groupAvatarOptions[Math.abs(hash) % groupAvatarOptions.length];
}

/**
 * Returns a color object from the channel avatar color palette based on the given ID.
 *
 * @param id - unique id - The ID used to generate a hash code for selecting a color.
 * @returns {object} - An object containing background, color, and border properties.
 */
export const getChannelAvatarColors = (id = '') => {
  const hash = getHashCode(id);
  return channelAvatarColorPalette[Math.abs(hash) % channelAvatarColorPalette.length];
};
