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

// grunt test_init && grunt test_run:backup/BackupRepository

describe('z.backup.BackupRepository', () => {
  const test_factory = new TestFactory();

  beforeAll(done => {
    test_factory
      .exposeBackupActors()
      .then(done)
      .catch(done.fail);
  });

  beforeEach(() => jasmine.clock().install());

  afterEach(() => jasmine.clock().uninstall());

  describe('"createMetaDescription"', () => {
    it('creates backup meta data', () => {
      const freezedTime = new Date();
      jasmine.clock().mockDate(freezedTime);

      const backupRepository = new z.backup.BackupRepository(
        TestFactory.backup_service,
        TestFactory.client_repository,
        TestFactory.user_repository
      );
      const metaDescription = backupRepository.createMetaDescription();

      expect(metaDescription.client_id).toBe(TestFactory.client_repository.currentClient().id);
      expect(metaDescription.creation_time).toBe(freezedTime.toISOString());
      expect(metaDescription.platform).toBe('Web');
      expect(metaDescription.user_id).toBe(TestFactory.user_repository.self().id);
      expect(metaDescription.version).toBe(TestFactory.backup_service.getDatabaseVersion());
    });
  });
});
