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

import {useCallback, useEffect} from 'react';

import type {WebappProperties} from '@wireapp/api-client/lib/user/data';
import {amplify} from 'amplify';

import {WebAppEvents} from '@wireapp/webapp-events';

const THEMES_CLASS_PREFIX = 'theme-';

export type Theme = WebappProperties['settings']['interface']['theme'];

const listenedEvents = [WebAppEvents.PROPERTIES.UPDATE.INTERFACE.THEME, WebAppEvents.PROPERTIES.UPDATED];

function setTheme(theme: Theme) {
  const classes = document.body.className
    .split(' ')
    .filter(elementClass => !elementClass.startsWith(THEMES_CLASS_PREFIX))
    .concat(`${THEMES_CLASS_PREFIX}${theme}`);
  document.body.className = classes.join(' ');
}

export function useTheme(getTheme: () => Theme) {
  const updateTheme = useCallback(() => {
    setTheme(getTheme());
  }, [getTheme]);

  updateTheme();

  useEffect(() => {
    listenedEvents.forEach(event => amplify.subscribe(event, updateTheme));
    return () => {
      listenedEvents.forEach(event => amplify.unsubscribe(event, updateTheme));
    };
  }, [updateTheme]);
}
