/*
 * Wire
 * Copyright (C) 2019 Wire Swiss GmbH
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

import 'url-search-params-polyfill';
import {ENVIRONMENT, isEnvironment} from '../auth/Environment';

function enableLogging(location = window.location.href) {
  /**
   * If users disable cookies in their browsers, they won't have access to the localStorage API.
   * The following check will fix this error:
   * > Failed to read the 'localStorage' property from 'Window': Access is denied for this document
   */
  let localStorage;

  try {
    localStorage = window.localStorage;
  } catch (error) {
    return;
  }

  const namespace = isEnvironment(ENVIRONMENT.LOCAL)
    ? '@wireapp/webapp'
    : new URL(location).searchParams.get('enableLogging');

  if (namespace) {
    localStorage.setItem('debug', namespace);
  } else {
    localStorage.removeItem('debug');
  }
}

export {enableLogging};
