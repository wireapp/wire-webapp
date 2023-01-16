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

import {TestFactory} from '../../helper/TestFactory';

describe('StorageRepository', () => {
  const testFactory = new TestFactory();

  beforeAll(() => testFactory.exposeStorageActors());

  beforeEach(() => testFactory.storage_repository.clearStores());

  describe('saveValue', () => {
    it('persists primitive values in an object format', () => {
      const primary_key = 'test_key';
      const primitive_value = 'test_value';

      return testFactory.storage_repository.saveValue(primary_key, primitive_value).then(storage_key => {
        expect(storage_key).toBe(primary_key);
      });
    });
  });
});
