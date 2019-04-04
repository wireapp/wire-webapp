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
 */

import {find} from './deploy-utils';

describe('deploy-utils', () => {
  it('safeguard prevents further code execution', async () => {
    try {
      await find('invalid-file', {safeGuard: true});
      fail('find should throw an error with safeguard');
    } catch (error) {}

    try {
      const result = await find('invalid-file', {safeGuard: false});
      expect(result).toBe(null);
    } catch (error) {
      fail('find should not throw an error without safeguard');
    }
  });

  it('find finds files', async () => {
    const result = await find('deploy-utils.test.ts', {cwd: __dirname, safeGuard: false});
    expect(result).not.toBe(null);
    expect(result!.fileName).toEqual(jasmine.any(String));
    expect(result!.filePath).toEqual(jasmine.any(String));
  });
});
