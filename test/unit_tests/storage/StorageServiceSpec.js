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

// grunt test_init && grunt test_run:storage/StorageService

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

  describe('save', function() {
    it('does not save "null" values', function(done) {
      TestFactory.storage_service.save(z.storage.StorageService.OBJECT_STORE.AMPLIFY, 'primary_key', null)
        .catch(function(error) {
          expect(error.type).toEqual(z.storage.StorageError.TYPE.NO_DATA);
          done();
        })
        .then(done.fail);
    });
  });
});
