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

import {container} from 'tsyringe';

import {createRandomUuid, noop} from 'Util/util';
import {WebWorker} from 'Util/worker';

import {BackupRepository, Filename} from './BackupRepository';
import {BackupService} from './BackupService';
import {CancelError, DifferentAccountError, IncompatibleBackupError, IncompatiblePlatformError} from './Error';
import {handleZipEvent} from './zipWorker';

import {ConversationRepository} from '../conversation/ConversationRepository';
import {User} from '../entity/User';
import {ClientEvent} from '../event/Client';
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
  beforeAll(async () => {
    jest.spyOn(WebWorker.prototype, 'post').mockImplementation(handleZipEvent as any);
  });

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

    it('ignores verification events in the backup', async () => {
      const user = new User('user1');
      const [backupRepository, {storageService, backupService}] = await buildBackupRepository();
      const verificationEvent = {
        conversation: conversationId,
        type: ClientEvent.CONVERSATION.VERIFICATION,
      };
      const textEvent = {
        conversation: conversationId,
        type: ClientEvent.CONVERSATION.MESSAGE_ADD,
      };
      const importSpy = jest.spyOn(backupService, 'importEntities');

      await storageService.save(StorageSchemata.OBJECT_STORE.EVENTS, undefined, verificationEvent);
      await storageService.save(StorageSchemata.OBJECT_STORE.EVENTS, undefined, textEvent);
      const blob = await backupRepository.generateHistory(user, 'client1', noop);

      await backupRepository.importHistory(new User('user1'), blob, noop, noop);

      expect(importSpy).toHaveBeenCalledWith(eventStoreName, [textEvent]);
      expect(importSpy).not.toHaveBeenCalledWith(eventStoreName, [verificationEvent]);
    });

    it('cancels export', async () => {
      const [backupRepository, {storageService}] = await buildBackupRepository();
      await Promise.all([
        ...messages.map(message => storageService.save(eventStoreName, undefined, message)),
        storageService.save('conversations', conversationId, conversation),
      ]);

      const exportPromise = backupRepository.generateHistory(new User(), 'client1', noop);
      backupRepository.cancelAction();

      await expect(exportPromise).rejects.toThrow(jasmine.any(CancelError));
    });
  });

  describe('importHistory', () => {
    it.each([
      [
        {
          expectedError: DifferentAccountError,
          metaChanges: {user_id: 'fail'},
        },
      ],
      [
        {
          expectedError: IncompatibleBackupError,
          metaChanges: {version: 13}, // version 14 contains a migration script, thus will generate an error
        },
      ],
      [
        {
          expectedError: IncompatiblePlatformError,
          metaChanges: {platform: 'random'},
        },
      ],
    ])(`fails if metadata doesn't match`, async ({metaChanges, expectedError}) => {
      const [backupRepository] = await buildBackupRepository();

      const meta = {...backupRepository.createMetaData(new User('user1'), 'client1'), ...metaChanges};

      const files = {
        [Filename.METADATA]: JSON.stringify(meta),
      };
      const zip = (await handleZipEvent({type: 'zip', files})) as Uint8Array;

      await expect(backupRepository.importHistory(new User('user1'), zip, noop, noop)).rejects.toThrow(expectedError);
    });

    it('successfully imports a backup', async () => {
      const [backupRepository, {backupService, conversationRepository}] = await buildBackupRepository();
      const user = new User('user1');
      jest.spyOn(backupService, 'getDatabaseVersion').mockReturnValue(15);
      jest.spyOn(backupService, 'importEntities').mockResolvedValue(undefined);

      const metadata = {...backupRepository.createMetaData(user, 'client1'), version: 15};

      const files = {
        [Filename.METADATA]: JSON.stringify(metadata),
        [Filename.CONVERSATIONS]: JSON.stringify([conversation]),
        [Filename.EVENTS]: JSON.stringify(messages),
      };

      const zip = (await handleZipEvent({type: 'zip', files})) as Uint8Array;

      await backupRepository.importHistory(user, zip, noop, noop);

      expect(conversationRepository.updateConversationStates).toHaveBeenCalledWith([conversation]);
      expect(backupService.importEntities).toHaveBeenCalledWith(StorageSchemata.OBJECT_STORE.EVENTS, messages);
    });
  });
});
