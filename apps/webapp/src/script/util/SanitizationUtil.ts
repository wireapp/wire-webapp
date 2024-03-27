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

import {prependProtocol} from './UrlUtil';
import {isValidEmail} from './ValidationUtil';

export const escapeRegex = (string: string): string => string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/**
 * Opens a new browser tab (target="_blank") with a given URL in a safe environment.
 * @see https://mathiasbynens.github.io/rel-noopener/
 * @param url URL you want to open in a new browser tab
 * @param focus `true`, if the new windows should get browser focus
 * @returns New window handle
 */
export const safeWindowOpen = (url: string, focus: boolean = true): Window => {
  const newWindow = window.open(prependProtocol(url));

  if (newWindow) {
    newWindow.opener = null;
    if (focus) {
      newWindow.focus();
    }
  }

  return newWindow;
};

export const safeMailOpen = (email: string): void => {
  const pureEmail = email.replace(/^(mailto:)?/i, '');

  if (!isValidEmail(pureEmail)) {
    return;
  }

  const newWindow = window.open(`mailto:${pureEmail}`);
  if (newWindow) {
    window.setTimeout(() => newWindow.close(), 10);
  }
};
