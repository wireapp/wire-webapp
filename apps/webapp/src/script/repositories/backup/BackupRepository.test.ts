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

import {CONVERSATION_TYPE} from '@wireapp/api-client/lib/conversation';
import {User} from 'Repositories/entity/User';
import {ClientEvent} from 'Repositories/event/Client';
import {StorageService} from 'Repositories/storage';
import {StorageSchemata} from 'Repositories/storage/StorageSchemata';
import {generateConversation} from 'test/helper/ConversationGenerator';
import {TestFactory} from 'test/helper/TestFactory';
import {generateAPIUser} from 'test/helper/UserGenerator';
import {container} from 'tsyringe';
import {omit} from 'underscore';
import {noop} from 'Util/util';
import {createUuid} from 'Util/uuid';
import {WebWorker} from 'Util/worker';

import {Filename} from './Backup.types';
import {BackUpHeader, DecodedHeader, ENCRYPTED_BACKUP_FORMAT, ENCRYPTED_BACKUP_VERSION} from './BackUpHeader';
import {BackupRepository} from './BackupRepository';
import {BackupService} from './BackupService';
import {CancelError, DifferentAccountError, IncompatiblePlatformError} from './Error';
import {createMetaData} from './LegacyBackup.helper';
import {handleZipEvent} from './zipWorker';

import {DatabaseTypes, createStorageEngine} from '../../service/StoreEngineProvider';

const conversationId = '35a9a89d-70dc-4d9e-88a2-4d8758458a6a';

const conversation = generateConversation({
  id: {id: conversationId, domain: 'test.wire.link'},
  overwites: {
    status: 0,
    type: 2,
  },
}).serialize();

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

  const testFactory = new TestFactory();
  const conversationRepository = await testFactory.exposeConversationActors();

  jest
    .spyOn(conversationRepository, 'mapConversations')
    .mockImplementation(conversations => conversations.map(c => generateConversation({type: c.type, overwites: c})));
  jest.spyOn(conversationRepository, 'updateConversationStates');
  jest.spyOn(conversationRepository, 'updateConversations');
  jest.spyOn(conversationRepository, 'syncDeletedConversations').mockResolvedValue(undefined);
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
      const [, {backupService}] = await buildBackupRepository();
      jest.useFakeTimers();
      const freezedTime = new Date();
      jest.setSystemTime(freezedTime);
      const userId = createUuid();
      const clientId = createUuid();

      const metaDescription = createMetaData(new User(userId), clientId, backupService);

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
      const password = '';
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

      await storageService.save(StorageSchemata.OBJECT_STORE.EVENTS, '', verificationEvent);
      await storageService.save(StorageSchemata.OBJECT_STORE.EVENTS, '', textEvent);
      const blob = await backupRepository.generateHistory(user, 'client1', noop, password);

      await backupRepository.importHistory(new User('user1'), blob, noop, noop);

      expect(importSpy).toHaveBeenCalledWith(eventStoreName, [omit(textEvent, 'primary_key')], {
        generateId: expect.any(Function),
      });
      expect(importSpy).not.toHaveBeenCalledWith(eventStoreName, [verificationEvent], expect.any(Object));
    });

    it('cancels export', async () => {
      const [backupRepository, {storageService}] = await buildBackupRepository();
      const password = '';
      await Promise.all([
        ...messages.map(message => storageService.save(eventStoreName, '', message)),
        storageService.save('conversations', conversationId, conversation),
      ]);

      const exportPromise = backupRepository.generateHistory(new User(), 'client1', noop, password);
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
          expectedError: IncompatiblePlatformError,
          metaChanges: {platform: 'random'},
        },
      ],
    ])(`fails if metadata doesn't match`, async ({metaChanges, expectedError}) => {
      const [backupRepository, {backupService}] = await buildBackupRepository();

      const meta = {...createMetaData(new User('user1'), 'client1', backupService), ...metaChanges};

      const files = {
        [Filename.METADATA]: JSON.stringify(meta),
      };
      const zip = (await handleZipEvent({type: 'zip', files})) as Uint8Array;

      await expect(backupRepository.importHistory(new User('user1'), zip, noop, noop)).rejects.toThrow(expectedError);
    });

    it('successfully imports a backup', async () => {
      const [backupRepository, {backupService, conversationRepository}] = await buildBackupRepository();
      const user = new User('user1');
      const mockedDBVersion = 20;
      jest.spyOn(backupService, 'getDatabaseVersion').mockReturnValue(mockedDBVersion);
      const importSpy = jest.spyOn(backupService, 'importEntities').mockResolvedValue(1);
      const users = [generateAPIUser(), generateAPIUser()];

      const metadata = {...createMetaData(user, 'client1', backupService), version: mockedDBVersion};

      const conversation = generateConversation({
        id: {id: 'conversation1', domain: 'staging2'},
        type: CONVERSATION_TYPE.ONE_TO_ONE,
      }).serialize();

      const selfConversation = generateConversation({
        id: {id: 'conversation2', domain: 'staging2'},
        type: CONVERSATION_TYPE.SELF,
      }).serialize();

      const files = {
        [Filename.METADATA]: JSON.stringify(metadata),
        [Filename.CONVERSATIONS]: JSON.stringify([conversation, selfConversation]),
        [Filename.EVENTS]: JSON.stringify(messages),
        [Filename.USERS]: JSON.stringify(users),
      };

      const zip = (await handleZipEvent({type: 'zip', files})) as Uint8Array;

      await backupRepository.importHistory(user, zip, noop, noop);

      expect(conversationRepository.updateConversationStates).toHaveBeenCalledWith(
        expect.arrayContaining([expect.objectContaining({id: conversation.id})]),
      );

      expect(conversationRepository.updateConversations).toHaveBeenCalledWith(
        expect.arrayContaining([expect.objectContaining({id: conversation.id})]),
      );
      expect(conversationRepository.updateConversations).not.toHaveBeenCalledWith(
        expect.arrayContaining([expect.objectContaining({id: selfConversation.id})]),
      );

      expect(importSpy).toHaveBeenCalledWith(
        StorageSchemata.OBJECT_STORE.EVENTS,
        messages.map(message => omit(message, 'primary_key')),
        {generateId: expect.any(Function)},
      );

      expect(importSpy).toHaveBeenCalledWith(StorageSchemata.OBJECT_STORE.USERS, users, {
        generatePrimaryKey: expect.any(Function),
      });
    });
  });

  describe('Backup encrytion', () => {
    test('compressHistoryFiles calls the encryption function if password is provided', async () => {
      // Mocked values
      const password = 'Password';
      const clientId = 'ClientId';
      const user = new User('user1');
      const mockHashedUserId = new Uint8Array(32);
      const mockEncodeHeader = jest.fn().mockResolvedValue(new Uint8Array(63));
      const mockGenerateChaCha20Key = jest.fn().mockImplementation((header: DecodedHeader) => new Uint8Array(32));
      const mockSalt = new Uint8Array(16);
      const mockReadBackupHeader = jest.fn().mockReturnValue({
        decodedHeader: {
          format: ENCRYPTED_BACKUP_FORMAT,
          version: ENCRYPTED_BACKUP_VERSION,
          salt: mockSalt,
          hashedUserId: mockHashedUserId,
          opslimit: 4,
          memlimit: 33554432,
        },
        headerSize: 63,
      });

      // Mock the behavior of BackUpHeader methods
      jest.spyOn(BackUpHeader.prototype, 'encodeHeader').mockImplementation(mockEncodeHeader);
      jest.spyOn(BackUpHeader.prototype, 'generateChaCha20Key').mockImplementation(mockGenerateChaCha20Key);
      jest.spyOn(BackUpHeader.prototype, 'readBackupHeader').mockImplementation(mockReadBackupHeader);

      const [backupRepository] = await buildBackupRepository();
      await backupRepository.generateHistory(user, clientId, noop, password);

      // // Assert the expected function calls
      expect(mockEncodeHeader).toHaveBeenCalled();
      expect(mockReadBackupHeader).toHaveBeenCalled();
      expect(mockGenerateChaCha20Key).toHaveBeenCalled();

      const {decodedHeader} = mockReadBackupHeader();
      expect(mockGenerateChaCha20Key).toHaveBeenCalledWith(decodedHeader);
    });

    it('compressHistoryFiles does not call the encryption function if no password is provided', async () => {
      // Mocked values
      const password = '';
      const clientId = 'ClientId';
      const user = new User('user1');
      const mockEncodeHeader = jest.fn().mockResolvedValue(new Uint8Array(63));
      const mockGenerateChaCha20Key = jest.fn().mockImplementation(header => new Uint8Array(32));

      // Mock the behavior of BackUpHeader methods
      jest.spyOn(BackUpHeader.prototype, 'encodeHeader').mockImplementation(mockEncodeHeader);
      jest.spyOn(BackUpHeader.prototype, 'generateChaCha20Key').mockImplementation(mockGenerateChaCha20Key);

      const [backupRepository] = await buildBackupRepository();
      await backupRepository.generateHistory(user, clientId, noop, password);

      // Assert the expected function calls
      expect(mockEncodeHeader).not.toHaveBeenCalled();
      expect(mockGenerateChaCha20Key).not.toHaveBeenCalled();
    });

    it('compressHistoryFiles returns a Blob object with the correct type', async () => {
      // Mocked values...
      const password = 'Password';
      const clientId = 'ClientId';
      const user = new User('user1');

      const [backupRepository] = await buildBackupRepository();
      const result = await backupRepository.generateHistory(user, clientId, noop, password);

      expect(result).toBeInstanceOf(Blob);
      expect(result.type).toBe('application/zip');
    });
  });
});
