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

import JSZip from 'jszip';

import {noop} from 'Util/util';

import {BackupRepository} from 'src/script/backup/BackupRepository';
import {
  CancelError,
  DifferentAccountError,
  IncompatibleBackupError,
  IncompatiblePlatformError,
} from 'src/script/backup/Error';
import {ClientEvent} from 'src/script/event/Client';
import {StorageSchemata} from 'src/script/storage/StorageSchemata';
import {TestFactory} from '../../helper/TestFactory';

const conversationId = '35a9a89d-70dc-4d9e-88a2-4d8758458a6a';
// prettier-ignore
/* eslint-disable comma-spacing, key-spacing, sort-keys-fix/sort-keys-fix, quotes */
const conversation = {"id": conversationId,"accessModes":["private"],"accessRole":"private","creator":"1ccd93e0-0f4b-4a73-b33f-05c464b88439","name":"Tom @ Staging","status":0,"team_id":null,"type":2,"others":["a7122859-3f16-4870-b7f2-5cbca5572ab2"],"last_event_timestamp":2,"last_server_timestamp":2,"archived_state":false,"archived_timestamp":0,"muted_state":false,"muted_timestamp":0};

// prettier-ignore
const messages = [
    {"conversation":conversationId,"id":"68a28ab1-d7f8-4014-8b52-5e99a05ea3b1","from":"8b497692-7a38-4a5d-8287-e3d1006577d6","time":"2016-08-04T13:27:55.182Z","data":{"content":"First message","nonce":"68a28ab1-d7f8-4014-8b52-5e99a05ea3b1","previews":[]},"type":"conversation.message-add"},
    {"conversation":conversationId,"id":"4af67f76-09f9-4831-b3a4-9df877b8c29a","from":"8b497692-7a38-4a5d-8287-e3d1006577d6","time":"2016-08-04T13:27:58.993Z","data":{"content":"Second message","nonce":"4af67f76-09f9-4831-b3a4-9df877b8c29a","previews":[]},"type":"conversation.message-add"},
  ];
/* eslint-enable comma-spacing, key-spacing, sort-keys-fix/sort-keys-fix, quotes */

describe('BackupRepository', () => {
  const testFactory = new TestFactory();
  /** @type {BackupRepository} */
  let backupRepository;

  beforeEach(async () => {
    jasmine.clock().install();
    await testFactory.exposeBackupActors();
    backupRepository = testFactory.backup_repository;
  });

  afterEach(() => jasmine.clock().uninstall());

  afterAll(() => jasmine.clock().uninstall());

  describe('createMetaData', () => {
    it('creates backup metadata', () => {
      const freezedTime = new Date();
      jasmine.clock().mockDate(freezedTime);

      const metaDescription = backupRepository.createMetaData();

      expect(metaDescription.client_id).toBe(testFactory.client_repository['clientState'].currentClient().id);
      expect(metaDescription.creation_time).toBe(freezedTime.toISOString());
      expect(metaDescription.platform).toBe('Web');
      expect(metaDescription.user_id).toBe(testFactory.user_repository['userState'].self().id);
      expect(metaDescription.version).toBe(testFactory.backup_service.getDatabaseVersion());
    });
  });

  describe('generateHistory', () => {
    const eventStoreName = StorageSchemata.OBJECT_STORE.EVENTS;

    beforeEach(() => {
      return Promise.all([
        ...messages.map(message => testFactory.storage_service.save(eventStoreName, undefined, message)),
        testFactory.storage_service.save('conversations', conversationId, conversation),
      ]);
    });

    afterEach(() => testFactory.storage_service.clearStores());

    it('generates an archive of the database', async () => {
      const blob = await backupRepository.generateHistory(noop);
      const zip = await new JSZip().loadAsync(blob);
      const zipFilenames = Object.keys(zip.files);
      Object.values(BackupRepository.CONFIG.FILENAME).forEach(filename => expect(zipFilenames).toContain(filename));

      const conversationsStr = await zip.files[BackupRepository.CONFIG.FILENAME.CONVERSATIONS].async('string');
      const conversations = JSON.parse(conversationsStr);
      expect(conversations).toEqual([conversation]);

      const eventsStr = await zip.files[BackupRepository.CONFIG.FILENAME.EVENTS].async('string');
      const events = JSON.parse(eventsStr);
      expect(events).toEqual(messages);
    });

    it('ignores verification events in the backup', async () => {
      const verificationEvent = {
        conversation: conversationId,
        type: ClientEvent.CONVERSATION.VERIFICATION,
      };

      await testFactory.storage_service.save(StorageSchemata.OBJECT_STORE.EVENTS, undefined, verificationEvent);
      const blob = await backupRepository.generateHistory(noop);
      const zip = await new JSZip().loadAsync(blob);

      const eventsStr = await zip.files[BackupRepository.CONFIG.FILENAME.EVENTS].async('string');
      const events = JSON.parse(eventsStr);
      expect(events).not.toContain(verificationEvent);
      expect(events.length).toBe(messages.length);
    });

    it('cancels export', async () => {
      spyOnProperty(backupRepository, 'isCanceled').and.returnValue(true);
      backupRepository.cancelAction();

      try {
        await backupRepository.generateHistory(noop);
        fail('Export should fail with a CancelError');
      } catch (error) {
        expect(error).toEqual(jasmine.any(CancelError));
      }
    });
  });

  describe('importHistory', () => {
    it(`fails if metadata doesn't match`, async () => {
      const tests = [
        {
          expectedError: DifferentAccountError,
          metaChanges: {user_id: 'fail'},
        },
        {
          expectedError: IncompatibleBackupError,
          metaChanges: {version: 13}, // version 14 contains a migration script, thus will generate an error
        },
        {
          expectedError: IncompatiblePlatformError,
          metaChanges: {platform: 'random'},
        },
      ];

      for (const testDescription of tests) {
        const archive = new JSZip();
        const meta = {
          ...backupRepository.createMetaData(),
          ...testDescription.metaChanges,
        };

        archive.file(BackupRepository.CONFIG.FILENAME.METADATA, JSON.stringify(meta));

        const files = {};
        for (const fileName in archive.files) {
          files[fileName] = await archive.files[fileName].async('uint8array');
        }

        try {
          await backupRepository.importHistory(files, noop, noop);
          fail('Import should fail');
        } catch (error) {
          expect(error).toEqual(jasmine.any(testDescription.expectedError));
        }
      }
    });

    it('successfully imports a backup', async () => {
      function removePrimaryKey(message) {
        return {
          ...message,
          primary_key: undefined,
        };
      }

      const metadataArray = [backupRepository.createMetaData(), {...backupRepository.createMetaData(), version: 15}];

      const archives = metadataArray.map(metadata => {
        const archive = new JSZip();
        archive.file(BackupRepository.CONFIG.FILENAME.METADATA, JSON.stringify(metadata));
        archive.file(BackupRepository.CONFIG.FILENAME.CONVERSATIONS, JSON.stringify([conversation]));
        archive.file(BackupRepository.CONFIG.FILENAME.EVENTS, JSON.stringify(messages));

        return archive;
      });

      for (const archive of archives) {
        const files = {};
        for (const fileName in archive.files) {
          files[fileName] = await archive.files[fileName].async('uint8array');
        }

        await backupRepository.importHistory(files, noop, noop);

        const conversationsData = await testFactory.storage_service.getAll(StorageSchemata.OBJECT_STORE.CONVERSATIONS);
        expect(conversationsData.length).toEqual(1);
        const [conversationData] = conversationsData;

        expect(conversationData.name).toEqual(conversation.name);
        expect(conversationData.id).toEqual(conversation.id);

        const events = await testFactory.storage_service.getAll(StorageSchemata.OBJECT_STORE.EVENTS);
        expect(events.length).toEqual(messages.length);
        expect(events.map(removePrimaryKey)).toEqual(messages.map(removePrimaryKey));
      }
    });
  });
});
