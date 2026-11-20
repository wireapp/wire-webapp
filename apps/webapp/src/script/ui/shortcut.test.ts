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
import keyboardJS, {pressKey, releaseAllKeys} from 'keyboardjs';

import {WebAppEvents} from '../webAppEvents';

import './shortcut';

function withShortcutBindings(testFunction: () => void): () => void {
  function runShortcutBindingTest(): void {
    try {
      releaseAllKeys();
      jest.spyOn(amplify, 'publish').mockReturnValue(true);
      testFunction();
    } finally {
      try {
        releaseAllKeys();
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

      pressKey('ctrl', {keyCode: 17});
      pressKey('shift', {keyCode: 16});
      pressKey('k', {keyCode: 75, preventDefault});

      expect(preventDefault).toHaveBeenCalledTimes(1);
      expect(amplify.publish).toHaveBeenCalledWith(WebAppEvents.SHORTCUT.ADD_PEOPLE);
    }),
  );

  it(
    'ignores a partial event without preventing the browser default',
    withShortcutBindings(() => {
      pressKey('ctrl', {keyCode: 17});
      pressKey('shift', {keyCode: 16});
      pressKey('k', {keyCode: 75});

      expect(amplify.publish).not.toHaveBeenCalled();
    }),
  );

  it(
    'does not release an undefined key code from a partial event',
    withShortcutBindings(() => {
      const releaseKeySpy = jest.spyOn(keyboardJS, 'releaseKey');
      const preventDefault = jest.fn();

      pressKey('ctrl', {});
      pressKey('shift', {});
      pressKey('k', {preventDefault});

      expect(releaseKeySpy).not.toHaveBeenCalledWith(undefined);
    }),
  );
});
