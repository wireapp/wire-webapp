/*
 * Wire
 * Copyright (C) 2018 Wire Swiss GmbH
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

import {WebAppEvents} from '@wireapp/webapp-events';
import {amplify} from 'amplify';
import {PROPERTIES_TYPE} from '../properties/PropertiesType';
import type {PropertiesRepository} from '../properties/PropertiesRepository';
import type {WebappProperties} from '@wireapp/api-client/src/user/data';

const THEMES_CLASS_PREFIX = 'theme-';

export const THEMES = {
  DARK: 'dark',
  DEFAULT: 'default',
};

export class ThemeViewModel {
  constructor(propertiesRepository: PropertiesRepository) {
    this.setTheme(propertiesRepository.getPreference(PROPERTIES_TYPE.INTERFACE.THEME));

    amplify.subscribe(WebAppEvents.PROPERTIES.UPDATE.INTERFACE.THEME, this.setTheme);
    amplify.subscribe(WebAppEvents.PROPERTIES.UPDATED, (properties: WebappProperties) =>
      this.setTheme(properties.settings.interface.theme),
    );
  }

  private readonly setTheme = (newTheme: 'dark' | 'default') => {
    const classes = document.body.className
      .split(' ')
      .filter(elementClass => !elementClass.startsWith(THEMES_CLASS_PREFIX))
      .concat(`${THEMES_CLASS_PREFIX}${newTheme}`);
    document.body.className = classes.join(' ');
  };
}
