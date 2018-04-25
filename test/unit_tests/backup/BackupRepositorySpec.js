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

const noop = () => {};

const conversationId = '35a9a89d-70dc-4d9e-88a2-4d8758458a6a';
// prettier-ignore
/* eslint-disable comma-spacing, key-spacing, sort-keys, quotes */
const conversation = {"id": conversationId,"accessModes":["private"],"accessRole":"private","creator":"1ccd93e0-0f4b-4a73-b33f-05c464b88439","name":"Tom @ Staging","status":0,"team_id":null,"type":2,"others":["a7122859-3f16-4870-b7f2-5cbca5572ab2"],"last_event_timestamp":2,"last_server_timestamp":2,"archived_state":false,"archived_timestamp":0,"muted_state":false,"muted_timestamp":0};

// prettier-ignore
const messages = [
    {"conversation":conversationId,"id":"68a28ab1-d7f8-4014-8b52-5e99a05ea3b1","from":"8b497692-7a38-4a5d-8287-e3d1006577d6","time":"2016-08-04T13:27:55.182Z","data":{"content":"First message","nonce":"68a28ab1-d7f8-4014-8b52-5e99a05ea3b1","previews":[]},"type":"conversation.message-add"},
    {"conversation":conversationId,"id":"4af67f76-09f9-4831-b3a4-9df877b8c29a","from":"8b497692-7a38-4a5d-8287-e3d1006577d6","time":"2016-08-04T13:27:58.993Z","data":{"content":"Second message","nonce":"4af67f76-09f9-4831-b3a4-9df877b8c29a","previews":[]},"type":"conversation.message-add"},
  ];
/* eslint-enable comma-spacing, key-spacing, sort-keys, quotes */

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

  afterAll(() => jasmine.clock().uninstall());

  describe('"createMetaDescription"', () => {
    it('creates backup meta data', () => {
      const freezedTime = new Date();
      jasmine.clock().mockDate(freezedTime);

      const backupRepository = new z.backup.BackupRepository(
        TestFactory.backup_service,
        TestFactory.client_repository,
        TestFactory.conversation_repository,
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

  describe('"generateHistory"', () => {
    const eventStoreName = z.storage.StorageSchemata.OBJECT_STORE.EVENTS;

    beforeEach(() => {
      return Promise.all([
        ...messages.map(message => TestFactory.storage_service.save(eventStoreName, undefined, message)),
        TestFactory.storage_service.save('conversations', conversationId, conversation),
      ]);
    });

    afterEach(() => {
      return TestFactory.storage_service.clearStores();
    });

    it('generates an archive of the database', () => {
      const backupRepository = new z.backup.BackupRepository(
        TestFactory.backup_service,
        TestFactory.client_repository,
        TestFactory.conversation_repository,
        TestFactory.user_repository
      );

      const tables = z.backup.BackupService.CONFIG.SUPPORTED_TABLES;

      const archivePromise = backupRepository.generateHistory(noop);

      return archivePromise.then(zip => {
        const fileNames = Object.keys(zip.files);
        expect(fileNames).toContain('export.json');
        tables.map(table => expect(fileNames).toContain(`${table}.json`));

        const validateConversationsPromise = zip.files['conversations.json']
          .async('string')
          .then(conversationsStr => JSON.parse(conversationsStr))
          .then(conversations => expect(conversations).toEqual([conversation]));

        const validateEventsPromise = zip.files['events.json']
          .async('string')
          .then(eventsStr => JSON.parse(eventsStr))
          .then(events => expect(events).toEqual(messages));

        return Promise.all([validateConversationsPromise, validateEventsPromise]);
      });
    });

    it('ignores verification events in the backup', () => {
      const backupRepository = new z.backup.BackupRepository(
        TestFactory.backup_service,
        TestFactory.client_repository,
        TestFactory.conversation_repository,
        TestFactory.user_repository
      );

      const verificationEvent = {
        conversation: conversationId,
        type: z.event.Client.CONVERSATION.VERIFICATION,
      };

      return TestFactory.storage_service
        .save(z.storage.StorageSchemata.OBJECT_STORE.EVENTS, undefined, verificationEvent)
        .then(() => {
          const archivePromise = backupRepository.generateHistory(noop);

          return archivePromise.then(zip => {
            return zip.files[`${z.storage.StorageSchemata.OBJECT_STORE.EVENTS}.json`]
              .async('string')
              .then(eventsStr => JSON.parse(eventsStr))
              .then(events => {
                expect(events).not.toContain(verificationEvent);
                expect(events.length).toBe(messages.length);
              });
          });
        });
    });

    it('cancels export', () => {
      const backupRepository = new z.backup.BackupRepository(
        TestFactory.backup_service,
        TestFactory.client_repository,
        TestFactory.conversation_repository,
        TestFactory.user_repository
      );

      spyOn(backupRepository, 'isCanceled').and.returnValue(true);

      const promise = backupRepository
        .generateHistory(noop)
        .then(() => fail('export show fail with a CancelError'))
        .catch(error => expect(error instanceof z.backup.CancelError).toBe(true));

      backupRepository.cancelAction();

      return promise;
    });
  });

  describe('"importHistory"', () => {
    it("fails if metadata don't match", () => {
      const backupRepository = new z.backup.BackupRepository(
        TestFactory.backup_service,
        TestFactory.client_repository,
        TestFactory.conversation_repository,
        TestFactory.user_repository
      );

      const tests = [
        {
          expectedError: z.backup.DifferentAccountError,
          metaChanges: {user_id: 'fail'},
        },
        {
          expectedError: z.backup.IncompatibleBackupError,
          metaChanges: {version: -1},
        },
        {
          expectedError: z.backup.IncompatiblePlatformError,
          metaChanges: {platform: 'random'},
        },
      ];

      const promises = tests.map(testDescription => {
        const archive = new JSZip();
        const meta = {
          ...backupRepository.createMetaDescription(),
          ...testDescription.metaChanges,
        };

        archive.file(z.backup.BackupRepository.CONFIG.META_FILENAME, JSON.stringify(meta));

        return backupRepository
          .importHistory(archive, noop, noop)
          .then(() => fail('import should fail'))
          .catch(error =>
            expect(error instanceof testDescription.expectedError).toBe(
              true,
              `${error} not instanceof of ${testDescription.expectedError}`
            )
          );
      });

      return Promise.all(promises);
    });

    it('successfully import backup', () => {
      const backupRepository = new z.backup.BackupRepository(
        TestFactory.backup_service,
        TestFactory.client_repository,
        TestFactory.conversation_repository,
        TestFactory.user_repository
      );

      const archive = new JSZip();

      archive.file(
        z.backup.BackupRepository.CONFIG.META_FILENAME,
        JSON.stringify(backupRepository.createMetaDescription())
      );
      archive.file(z.storage.StorageSchemata.OBJECT_STORE.CONVERSATIONS, JSON.stringify([conversation]));
      archive.file(z.storage.StorageSchemata.OBJECT_STORE.EVENTS, JSON.stringify(messages));

      return backupRepository.importHistory(archive, noop, noop).then(() => {
        const conversationsTest = TestFactory.storage_service
          .getAll(z.storage.StorageSchemata.OBJECT_STORE.CONVERSATIONS)
          .then(conversations => {
            expect(conversations.length).toEqual(1);
            expect(conversations[0]).toEqual(conversation);
          });

        const eventsTest = TestFactory.storage_service
          .getAll(z.storage.StorageSchemata.OBJECT_STORE.EVENTS)
          .then(events => {
            expect(events.length).toEqual(messages.length);
            expect(events.map(removePrimaryKey)).toEqual(messages.map(removePrimaryKey));
          });

        return Promise.all([conversationsTest, eventsTest]);

        function removePrimaryKey(message) {
          return {
            ...message,
            primary_key: undefined,
          };
        }
      });
    });
  });
});
