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

import {LocalStorageEngine} from '../engine';
import {UnsupportedError} from '../engine/error';

const STORE_NAME = 'store-name';

describe('init', () => {
  it('throws an error if the store is not supported by the targeted platform', async () => {
    const storeEngine = new LocalStorageEngine();
    try {
      await storeEngine.init(STORE_NAME);
      fail('Expected error');
    } catch (error) {
      expect(error instanceof UnsupportedError).toBe(true);
    }
  });
});
