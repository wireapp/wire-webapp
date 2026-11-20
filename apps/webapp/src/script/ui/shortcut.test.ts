/*
 * Wire
 * Copyright (C) 2026 Wire Swiss GmbH
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

import {amplify} from 'amplify';
import keyboardJS from 'keyboardjs';

import {WebAppEvents} from '../webAppEvents';

import './shortcut';

/* eslint-disable import/no-named-as-default-member -- Named wrappers are ESM-only; CommonJS methods need the singleton receiver. */
function withShortcutBindings(testFunction: () => void): () => void {
  function runShortcutBindingTest(): void {
    try {
      keyboardJS.releaseAllKeys();
      jest.spyOn(amplify, 'publish').mockReturnValue(true);
      testFunction();
    } finally {
      try {
        keyboardJS.releaseAllKeys();
      } finally {
        jest.restoreAllMocks();
      }
    }
  }

  return runShortcutBindingTest;
}

describe('Shortcut bindings', () => {
  it(
    'prevents the browser default and publishes a shortcut for a browser event',
    withShortcutBindings(() => {
      const preventDefault = jest.fn();

      keyboardJS.pressKey('ctrl', {keyCode: 17});
      keyboardJS.pressKey('shift', {keyCode: 16});
      keyboardJS.pressKey('k', {keyCode: 75, preventDefault});

      expect(preventDefault).toHaveBeenCalledTimes(1);
      expect(amplify.publish).toHaveBeenCalledWith(WebAppEvents.SHORTCUT.ADD_PEOPLE);
    }),
  );

  it(
    'ignores a partial event without preventing the browser default',
    withShortcutBindings(() => {
      keyboardJS.pressKey('ctrl', {keyCode: 17});
      keyboardJS.pressKey('shift', {keyCode: 16});
      keyboardJS.pressKey('k', {keyCode: 75});

      expect(amplify.publish).not.toHaveBeenCalled();
    }),
  );

  it(
    'does not release an undefined key code from a partial event',
    withShortcutBindings(() => {
      const releaseKeySpy = jest.spyOn(keyboardJS, 'releaseKey');
      const preventDefault = jest.fn();

      keyboardJS.pressKey('ctrl', {});
      keyboardJS.pressKey('shift', {});
      keyboardJS.pressKey('k', {preventDefault});

      expect(releaseKeySpy).not.toHaveBeenCalledWith(undefined);
    }),
  );
});
/* eslint-enable import/no-named-as-default-member */
