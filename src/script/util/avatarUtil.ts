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

import {COLOR_V2} from '@wireapp/react-ui-kit';

import {PropertiesRepository} from '../properties/PropertiesRepository';

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

const groupAvatarDarkThemeOptions = [
  [COLOR_V2.GREEN_DARK_500, COLOR_V2.PURPLE_DARK_500, COLOR_V2.RED_DARK_500],
  [COLOR_V2.BLUE_DARK_500, COLOR_V2.GREEN_DARK_500, COLOR_V2.AMBER_DARK_500],
  [COLOR_V2.BLUE_DARK_500, COLOR_V2.RED_DARK_500, COLOR_V2.PURPLE_DARK_500],
  [COLOR_V2.AMBER_DARK_500, COLOR_V2.GREEN_DARK_500, COLOR_V2.PURPLE_DARK_500],
  [COLOR_V2.GREEN_DARK_500, COLOR_V2.BLUE_DARK_500, COLOR_V2.PURPLE_DARK_500],
  [COLOR_V2.BLUE_DARK_500, COLOR_V2.AMBER_DARK_500, COLOR_V2.GREEN_DARK_500],
  [COLOR_V2.RED_DARK_500, COLOR_V2.BLUE_DARK_500, COLOR_V2.PURPLE_DARK_500],
  [COLOR_V2.GREEN_DARK_500, COLOR_V2.RED_DARK_500, COLOR_V2.BLUE_DARK_500],
  [COLOR_V2.AMBER_DARK_500, COLOR_V2.BLUE_DARK_500, COLOR_V2.PURPLE_DARK_500],
  [COLOR_V2.PURPLE_DARK_500, COLOR_V2.BLUE_DARK_500, COLOR_V2.GREEN_DARK_500],
  [COLOR_V2.GREEN_DARK_500, COLOR_V2.PURPLE_DARK_500, COLOR_V2.RED_DARK_500],
  [COLOR_V2.GREEN_DARK_500, COLOR_V2.BLUE_DARK_500, COLOR_V2.RED_DARK_500],
  [COLOR_V2.PURPLE_DARK_500, COLOR_V2.BLUE_DARK_500, COLOR_V2.GREEN_DARK_500],
  [COLOR_V2.GREEN_DARK_500, COLOR_V2.BLUE_DARK_500, COLOR_V2.AMBER_DARK_500],
  [COLOR_V2.GREEN_DARK_500, COLOR_V2.AMBER_DARK_500, COLOR_V2.PURPLE_DARK_500],
];

const groupAvatarLightThemeOptions = [
  [COLOR_V2.GREEN_LIGHT_500, COLOR_V2.PURPLE_LIGHT_500, COLOR_V2.RED_LIGHT_500],
  [COLOR_V2.BLUE_LIGHT_500, COLOR_V2.GREEN_LIGHT_500, COLOR_V2.AMBER_LIGHT_500],
  [COLOR_V2.BLUE_LIGHT_500, COLOR_V2.RED_LIGHT_500, COLOR_V2.PURPLE_LIGHT_500],
  [COLOR_V2.AMBER_LIGHT_500, COLOR_V2.GREEN_LIGHT_500, COLOR_V2.PURPLE_LIGHT_500],
  [COLOR_V2.GREEN_LIGHT_500, COLOR_V2.BLUE_LIGHT_500, COLOR_V2.PURPLE_LIGHT_500],
  [COLOR_V2.BLUE_LIGHT_500, COLOR_V2.AMBER_LIGHT_500, COLOR_V2.GREEN_LIGHT_500],
  [COLOR_V2.RED_LIGHT_500, COLOR_V2.BLUE_LIGHT_500, COLOR_V2.PURPLE_LIGHT_500],
  [COLOR_V2.GREEN_LIGHT_500, COLOR_V2.RED_LIGHT_500, COLOR_V2.BLUE_LIGHT_500],
  [COLOR_V2.AMBER_LIGHT_500, COLOR_V2.BLUE_LIGHT_500, COLOR_V2.PURPLE_LIGHT_500],
  [COLOR_V2.PURPLE_LIGHT_500, COLOR_V2.BLUE_LIGHT_500, COLOR_V2.GREEN_LIGHT_500],
  [COLOR_V2.GREEN_LIGHT_500, COLOR_V2.PURPLE_LIGHT_500, COLOR_V2.RED_LIGHT_500],
  [COLOR_V2.GREEN_LIGHT_500, COLOR_V2.BLUE_LIGHT_500, COLOR_V2.RED_LIGHT_500],
  [COLOR_V2.PURPLE_LIGHT_500, COLOR_V2.BLUE_LIGHT_500, COLOR_V2.GREEN_LIGHT_500],
  [COLOR_V2.GREEN_LIGHT_500, COLOR_V2.BLUE_LIGHT_500, COLOR_V2.AMBER_LIGHT_500],
  [COLOR_V2.GREEN_LIGHT_500, COLOR_V2.AMBER_LIGHT_500, COLOR_V2.PURPLE_LIGHT_500],
];

export function getGroupAvatarColors(
  id = '',
  theme: typeof PropertiesRepository.prototype.properties.settings.interface.theme,
) {
  const hash = getHashCode(id);
  const options = theme === 'default' ? groupAvatarLightThemeOptions : groupAvatarDarkThemeOptions;
  return options[Math.abs(hash) % options.length];
}
