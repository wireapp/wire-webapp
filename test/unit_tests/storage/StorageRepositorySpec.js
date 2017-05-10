/*
 * Wire
 * Copyright (C) 2017 Wire Swiss GmbH
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

'use strict';

// grunt test_init && grunt test_run:storage/StorageRepository

describe('z.storage.StorageRepository', function() {
  const test_factory = new TestFactory();

  beforeAll(function(done) {
    test_factory.exposeStorageActors()
      .then(done)
      .catch(done.fail);
  });

  beforeEach(function() {
    TestFactory.storage_repository.clear_all_stores();
  });

  describe('save_value', function() {
    it('persists primitive values in an object format', function(done) {
      const primary_key = 'test_key';
      const primitive_value = 'test_value';

      TestFactory.storage_repository.save_value(primary_key, primitive_value)
        .then(function(storage_key) {
          expect(storage_key).toBe(primary_key);
          return done();
        })
        .catch(done.fail);
    });
  });
});
