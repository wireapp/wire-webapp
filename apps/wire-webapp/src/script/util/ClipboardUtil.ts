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

import {Runtime} from '@wireapp/commons';

export function copyText(text: string): Promise<void> {
  if (Runtime.isSupportingClipboard()) {
    return navigator.clipboard.writeText(text);
  }

  try {
    const fallbackSource = document.createElement('textarea');
    fallbackSource.value = text;

    let selectedRange;

    if (window.getSelection) {
      selectedRange = window.getSelection().rangeCount ? window.getSelection().getRangeAt(0) : undefined;
    }

    document.body.appendChild(fallbackSource);
    fallbackSource.select();
    document.execCommand('copy');
    document.body.removeChild(fallbackSource);

    if (window.getSelection && selectedRange) {
      const currentSelection = window.getSelection();
      currentSelection.removeAllRanges();
      currentSelection.addRange(selectedRange);
    }

    return Promise.resolve();
  } catch (error) {
    return Promise.reject(error);
  }
}
