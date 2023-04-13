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
import {container} from 'tsyringe';

import {createRandomUuid, noop} from 'Util/util';

import {BackupRepository} from './BackupRepository';
import {BackupService} from './BackupService';
import {CancelError, DifferentAccountError, IncompatibleBackupError, IncompatiblePlatformError} from './Error';

import {ConversationRepository} from '../conversation/ConversationRepository';
import {User} from '../entity/User';
import {DatabaseTypes, createStorageEngine} from '../service/StoreEngineProvider';
import {StorageService} from '../storage';
import {StorageSchemata} from '../storage/StorageSchemata';

const conversationId = '35a9a89d-70dc-4d9e-88a2-4d8758458a6a';
const conversation = {
  accessModes: ['private'],
  accessRole: 'private',
  archived_state: false,
  archived_timestamp: 0,
  creator: '1ccd93e0-0f4b-4a73-b33f-05c464b88439',
  id: conversationId,
  last_event_timestamp: 2,
  last_server_timestamp: 2,
  muted_state: false,
  muted_timestamp: 0,
  name: 'Tom @ Staging',
  others: ['a7122859-3f16-4870-b7f2-5cbca5572ab2'],
  status: 0,
  type: 2,
};

const messages = [
  {
    conversation: conversationId,
    data: {content: 'First message', nonce: '68a28ab1-d7f8-4014-8b52-5e99a05ea3b1', previews: [] as any},
    from: '8b497692-7a38-4a5d-8287-e3d1006577d6',
    id: '68a28ab1-d7f8-4014-8b52-5e99a05ea3b1',
    time: '2016-08-04T13:27:55.182Z',
    type: 'conversation.message-add',
  },
  {
    conversation: conversationId,
    data: {content: 'Second message', nonce: '4af67f76-09f9-4831-b3a4-9df877b8c29a', previews: [] as any},
    from: '8b497692-7a38-4a5d-8287-e3d1006577d6',
    id: '4af67f76-09f9-4831-b3a4-9df877b8c29a',
    time: '2016-08-04T13:27:58.993Z',
    type: 'conversation.message-add',
  },
];

async function buildBackupRepository() {
  const storageService = container.resolve(StorageService);
  const engine = await createStorageEngine('test', DatabaseTypes.PERMANENT);
  storageService.init(engine);

  const backupService = new BackupService(storageService);
  const conversationRepository = {
    checkForDeletedConversations: jest.fn(),
    mapConnections: jest.fn().mockImplementation(() => []),
    updateConversationStates: jest.fn().mockImplementation(conversations => conversations),
    updateConversations: jest.fn().mockImplementation(async () => {}),
  } as unknown as ConversationRepository;
  return [
    new BackupRepository(backupService, conversationRepository),
    {backupService, conversationRepository, storageService},
  ] as const;
}

describe('BackupRepository', () => {
  describe('createMetaData', () => {
    it('creates backup metadata', async () => {
      const [backupRepository, {backupService}] = await buildBackupRepository();
      jest.useFakeTimers();
      const freezedTime = new Date();
      jest.setSystemTime(freezedTime);
      const userId = createRandomUuid();
      const clientId = createRandomUuid();

      const metaDescription = backupRepository.createMetaData(new User(userId), clientId);

      expect(metaDescription.client_id).toBe(clientId);
      expect(metaDescription.creation_time).toBe(freezedTime.toISOString());
      expect(metaDescription.platform).toBe('Web');
      expect(metaDescription.user_id).toBe(userId);
      expect(metaDescription.version).toBe(backupService.getDatabaseVersion());
      jest.useRealTimers();
    });
  });

  describe('generateHistory', () => {
    const eventStoreName = StorageSchemata.OBJECT_STORE.EVENTS;

    // TODO: [JEST] Shim WebWorkers
    /*
    it.skip('generates an archive of the database', async () => {
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

    // TODO: [JEST] Shim WebWorkers
    it.skip('ignores verification events in the backup', async () => {
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
    */

    it('cancels export', async () => {
      const [backupRepository, {storageService}] = await buildBackupRepository();
      await Promise.all([
        ...messages.map(message => storageService.save(eventStoreName, undefined, message)),
        storageService.save('conversations', conversationId, conversation),
      ]);

      jest.spyOn(backupRepository, 'isCanceled', 'get').mockReturnValue(true);
      backupRepository.cancelAction();

      await expect(backupRepository.generateHistory(new User(), 'client1', noop)).rejects.toThrow(
        jasmine.any(CancelError),
      );
    });
  });

  describe('importHistory', () => {
    it(`fails if metadata doesn't match`, async () => {
      const [backupRepository] = await buildBackupRepository();
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
          ...backupRepository.createMetaData(new User('user1'), 'client1'),
          ...testDescription.metaChanges,
        };

        archive.file(BackupRepository.CONFIG.FILENAME.METADATA, JSON.stringify(meta));

        const files: Record<string, any> = {};
        for (const fileName in archive.files) {
          files[fileName] = await archive.files[fileName].async('uint8array');
        }

        await expect(backupRepository.importHistory(new User('user1'), files, noop, noop)).rejects.toThrow(
          testDescription.expectedError,
        );
      }
    });

    it('successfully imports a backup', async () => {
      const [backupRepository, {backupService, conversationRepository}] = await buildBackupRepository();
      const user = new User('user1');
      jest.spyOn(backupService, 'getDatabaseVersion').mockReturnValue(15);
      jest.spyOn(backupService, 'importEntities').mockResolvedValue(undefined);

      const metadataArray = [{...backupRepository.createMetaData(user, 'client1'), version: 15}];

      const archives = metadataArray.map(metadata => {
        const archive = new JSZip();
        archive.file(BackupRepository.CONFIG.FILENAME.METADATA, JSON.stringify(metadata));
        archive.file(BackupRepository.CONFIG.FILENAME.CONVERSATIONS, JSON.stringify([conversation]));
        archive.file(BackupRepository.CONFIG.FILENAME.EVENTS, JSON.stringify(messages));

        return archive;
      });

      for (const archive of archives) {
        const files: Record<string, any> = {};
        for (const fileName in archive.files) {
          files[fileName] = await archive.files[fileName].async('uint8array');
        }

        await backupRepository.importHistory(user, files, noop, noop);

        expect(conversationRepository.updateConversationStates).toHaveBeenCalledWith([conversation]);
        expect(backupService.importEntities).toHaveBeenCalledWith(StorageSchemata.OBJECT_STORE.EVENTS, messages);
      }
    });
  });
});
