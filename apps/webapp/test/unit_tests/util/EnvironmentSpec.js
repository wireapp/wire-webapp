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

import {Environment} from 'src/script/util/Environment';

describe('EnvironmentSpec', () => {
  describe('Environment.electronVersion', () => {
    it('detects wrapper version for internal', () => {
      const userAgent =
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_11_6) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/58.0.3029.110 Electron/1.7.3 WireInternal/2.14.2744 Safari/537.36';

      expect(Environment.electronVersion(userAgent)).toBe('2.14.2744');
    });

    it('detects wrapper version for public', () => {
      const userAgent =
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_11_6) AppleWebKit/537.36 (KHTML, like Gecko) Wire/2.13.2734 Chrome/56.0.2924.87 Electron/1.6.4 Safari/537.36';

      expect(Environment.electronVersion(userAgent)).toBe('2.13.2734');
    });

    it('return undefined if no version is present', () => {
      const userAgent =
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_11_6) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/58.0.3029.110';

      expect(Environment.electronVersion(userAgent)).not.toBeDefined();
    });
  });
});
