/*
 * Wire
 * Copyright (C) 2022 Wire Swiss GmbH
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

import {useEffect, useState} from 'react';

import type {WebappProperties} from '@wireapp/api-client/lib/user/data/';
import {amplify} from 'amplify';

import {useMatchMedia} from '@wireapp/react-ui-kit';
import {WebAppEvents} from '@wireapp/webapp-events';

import {PropertiesRepository} from '../properties/PropertiesRepository';
import {PROPERTIES_TYPE} from '../properties/PropertiesType';

type ThemeType = 'dark' | 'default';

export const updateTheme = (newTheme: ThemeType) => {
  const classes = document.body.className
    .split(' ')
    .filter(elementClass => !elementClass.startsWith(THEMES_CLASS_PREFIX))
    .concat(`${THEMES_CLASS_PREFIX}${newTheme}`);
  document.body.className = classes.join(' ');
};

const THEMES_CLASS_PREFIX = 'theme-';

export const THEMES = {
  DARK: 'dark',
  DEFAULT: 'default',
};

export const useSystemTheme = () => {
  const isSystemDarkMode = useMatchMedia('(prefers-color-scheme: dark)');
  return isSystemDarkMode;
};

const useAutomaticTheme = (propertiesRepository: PropertiesRepository): ThemeType => {
  const [theme, setTheme] = useState<ThemeType>(propertiesRepository.getPreference(PROPERTIES_TYPE.INTERFACE.THEME));

  useEffect(() => {
    amplify.subscribe(WebAppEvents.PROPERTIES.UPDATE.INTERFACE.THEME, setTheme);
    amplify.subscribe(WebAppEvents.PROPERTIES.UPDATED, (properties: WebappProperties) =>
      setTheme(properties.settings.interface.theme),
    );
  }, []);

  const isSystemDarkMode = useSystemTheme();

  useEffect(() => {
    const nextTheme = (isSystemDarkMode ? THEMES.DARK : THEMES.DEFAULT) as ThemeType;
    updateTheme(nextTheme);
    setTheme(nextTheme);
  }, [isSystemDarkMode]);

  return theme;
};

export {useAutomaticTheme};
