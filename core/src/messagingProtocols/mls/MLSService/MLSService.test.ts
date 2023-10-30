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

import {ClientType, RegisteredClient} from '@wireapp/api-client/lib/client';
import {
  CONVERSATION_EVENT,
  ConversationMLSMessageAddEvent,
  ConversationMLSWelcomeEvent,
} from '@wireapp/api-client/lib/event';
import {BackendError, BackendErrorLabel, StatusCode} from '@wireapp/api-client/lib/http';

import {randomUUID} from 'crypto';

import {APIClient} from '@wireapp/api-client';
import {CoreCrypto, DecryptedMessage} from '@wireapp/core-crypto';

import {CoreCryptoMLSError} from './CoreCryptoMLSError';
import {MLSService} from './MLSService';

import {openDB} from '../../../storage/CoreDB';
import {RecurringTaskScheduler} from '../../../util/RecurringTaskScheduler';
import {TaskScheduler} from '../../../util/TaskScheduler';

jest.createMockFromModule('@wireapp/api-client');

function createUserId() {
  return {id: randomUUID(), domain: ''};
}

const createMLSService = async () => {
  const apiClient = new APIClient();
  const mockCoreCrypto = {
    createConversation: jest.fn(),
    conversationExists: jest.fn(),
    wipeConversation: jest.fn(),
    clientValidKeypackagesCount: jest.fn(),
    clientKeypackages: jest.fn(),
    mlsInit: jest.fn(),
    clientPublicKey: jest.fn(),
    processWelcomeMessage: jest.fn(),
    decryptMessage: jest.fn(),
    conversationEpoch: jest.fn(),
    commitPendingProposals: jest.fn(),
    registerCallbacks: jest.fn(),
  } as unknown as CoreCrypto;

  const mockedDb = await openDB('core-test-db');
  const recurringTaskScheduler = new RecurringTaskScheduler({
    delete: key => mockedDb.delete('recurringTasks', key),
    get: async key => (await mockedDb.get('recurringTasks', key))?.firingDate,
    set: async (key, timestamp) => {
      await mockedDb.put('recurringTasks', {key, firingDate: timestamp});
    },
  });

  const mlsService = new MLSService(apiClient, mockCoreCrypto, mockedDb, recurringTaskScheduler, {});

  return [mlsService, {apiClient, coreCrypto: mockCoreCrypto, recurringTaskScheduler}] as const;
};

describe('MLSService', () => {
  describe('registerConversation', () => {
    let mlsService: MLSService;
    let apiClient: APIClient;

    beforeEach(async () => {
      const [mockedMLSService, {apiClient: mockApiClient}] = await createMLSService();
      mlsService = mockedMLSService;
      apiClient = mockApiClient;
      jest
        .spyOn(apiClient.api.client, 'getPublicKeys')
        .mockResolvedValue({removal: {algo: 'mXOagqRIX/RFd7QyXJA8/Ed8X+hvQgLXIiwYHm3OQFc='}});

      jest.spyOn(apiClient.api.client, 'claimMLSKeyPackages').mockResolvedValue({key_packages: []});
      jest.spyOn(mlsService, 'scheduleKeyMaterialRenewal').mockImplementation();
      jest.spyOn(mlsService as any, 'processCommitAction').mockImplementation(() => ({
        failed_to_send: [],
        failed: [],
        events: [],
        time: '',
      }));
      jest.spyOn(mlsService as any, 'cancelKeyMaterialRenewal').mockImplementation();
    });

    it('creates a new mls conversation and avoid adding the selfUser', async () => {
      const groupId = 'mXOagqRIX/RFd7QyXJA8/Ed8X+hvQgLXIiwYHm3OQFc=';
      const selfUser = createUserId();
      const creator = {user: selfUser, client: 'client-1'};
      const users = [createUserId(), createUserId()];

      await mlsService.registerConversation(groupId, [...users, selfUser], creator);

      expect(apiClient.api.client.claimMLSKeyPackages).toHaveBeenCalledTimes(3);
      expect(apiClient.api.client.claimMLSKeyPackages).toHaveBeenCalledWith(
        selfUser.id,
        selfUser.domain,
        '0x1',
        creator.client,
      );
      expect(mlsService.scheduleKeyMaterialRenewal).toHaveBeenCalledWith(groupId);
    });

    it('creates a new mls conversation without any creator', async () => {
      const groupId = 'mXOagqRIX/RFd7QyXJA8/Ed8X+hvQgLXIiwYHm4OQFc=';

      await mlsService.registerConversation(groupId, [createUserId(), createUserId()]);

      expect(mlsService.scheduleKeyMaterialRenewal).toHaveBeenCalledWith(groupId);
    });
  });

  describe('isConversationEstablished', () => {
    it('returns false if conversation does not exist locally', async () => {
      const [mlsService] = await createMLSService();

      const groupId = 'mXOagqRIX/RFd7QyXJA8/Ed8X+hvQgLXIiwYHm3OQFc=';

      jest.spyOn(mlsService, 'conversationExists').mockResolvedValueOnce(false);

      const isEstablshed = await mlsService.isConversationEstablished(groupId);

      expect(isEstablshed).toBe(false);
    });

    it('returns false if epoch number is 0', async () => {
      const [mlsService] = await createMLSService();

      const groupId = 'mXOagqRIX/RFd7QyXJA8/Ed8X+hvQgLXIiwYHm3OQFc=';

      jest.spyOn(mlsService, 'conversationExists').mockResolvedValueOnce(true);
      jest.spyOn(mlsService, 'getEpoch').mockResolvedValueOnce(0);

      const isEstablshed = await mlsService.isConversationEstablished(groupId);

      expect(isEstablshed).toBe(false);
    });

    it.each([1, 2, 100])('returns false if epoch number is 1 or more', async epoch => {
      const [mlsService] = await createMLSService();

      const groupId = 'mXOagqRIX/RFd7QyXJA8/Ed8X+hvQgLXIiwYHm3OQFc=';

      jest.spyOn(mlsService, 'conversationExists').mockResolvedValueOnce(true);
      jest.spyOn(mlsService, 'getEpoch').mockResolvedValueOnce(epoch);

      const isEstablshed = await mlsService.isConversationEstablished(groupId);

      expect(isEstablshed).toBe(true);
    });
  });

  describe('initClient', () => {
    it('uploads public key only if it was not yet defined on client entity', async () => {
      const [mlsService, {apiClient, coreCrypto}] = await createMLSService();

      const mockUserId = {id: 'user-1', domain: 'local.zinfra.io'};
      const mockClientId = 'client-1';
      const mockClient = {mls_public_keys: {}, id: mockClientId} as unknown as RegisteredClient;

      apiClient.context = {clientType: ClientType.PERMANENT, clientId: mockClientId, userId: ''};

      const mockedClientPublicKey = new Uint8Array();

      jest.spyOn(coreCrypto, 'clientPublicKey').mockResolvedValueOnce(mockedClientPublicKey);
      jest.spyOn(apiClient.api.client, 'putClient').mockResolvedValueOnce(undefined);
      jest.spyOn(apiClient.api.client, 'getMLSKeyPackageCount').mockResolvedValueOnce(mlsService.config.nbKeyPackages);

      await mlsService.initClient(mockUserId, mockClient);

      expect(coreCrypto.mlsInit).toHaveBeenCalled();
      expect(apiClient.api.client.putClient).toHaveBeenCalledWith(mockClientId, expect.anything());
    });

    it('uploads key packages if there are not enough keys on backend', async () => {
      const [mlsService, {apiClient, coreCrypto}] = await createMLSService();

      const mockUserId = {id: 'user-1', domain: 'local.zinfra.io'};
      const mockClientId = 'client-1';
      const mockClient = {mls_public_keys: {ed25519: 'key'}, id: mockClientId} as unknown as RegisteredClient;

      apiClient.context = {clientType: ClientType.PERMANENT, clientId: mockClientId, userId: ''};

      const mockedClientKeyPackages = [new Uint8Array()];
      jest.spyOn(coreCrypto, 'clientKeypackages').mockResolvedValueOnce(mockedClientKeyPackages);
      jest
        .spyOn(apiClient.api.client, 'getMLSKeyPackageCount')
        .mockResolvedValueOnce(mlsService.config.minRequiredNumberOfAvailableKeyPackages - 1);
      jest.spyOn(apiClient.api.client, 'uploadMLSKeyPackages').mockResolvedValueOnce(undefined);

      await mlsService.initClient(mockUserId, mockClient);

      expect(coreCrypto.mlsInit).toHaveBeenCalled();
      expect(apiClient.api.client.uploadMLSKeyPackages).toHaveBeenCalledWith(mockClientId, expect.anything());
    });

    it('does not upload public key or key packages if both are already uploaded', async () => {
      const [mlsService, {apiClient, coreCrypto}] = await createMLSService();

      const mockUserId = {id: 'user-1', domain: 'local.zinfra.io'};
      const mockClientId = 'client-1';
      const mockClient = {mls_public_keys: {ed25519: 'key'}, id: mockClientId} as unknown as RegisteredClient;

      apiClient.context = {clientType: ClientType.PERMANENT, clientId: mockClientId, userId: ''};

      jest.spyOn(apiClient.api.client, 'getClient').mockResolvedValueOnce(mockClient);

      jest.spyOn(apiClient.api.client, 'getMLSKeyPackageCount').mockResolvedValueOnce(mlsService.config.nbKeyPackages);
      jest.spyOn(apiClient.api.client, 'uploadMLSKeyPackages');
      jest.spyOn(apiClient.api.client, 'putClient');

      await mlsService.initClient(mockUserId, mockClient);

      expect(coreCrypto.mlsInit).toHaveBeenCalled();
      expect(apiClient.api.client.uploadMLSKeyPackages).not.toHaveBeenCalled();
      expect(apiClient.api.client.putClient).not.toHaveBeenCalled();
    });
  });

  describe('wipeConversation', () => {
    it('wipes a group and cancels its timers', async () => {
      const [mlsService, {coreCrypto, recurringTaskScheduler}] = await createMLSService();
      const groupId = 'mXOagqRIX/RFd7QyXJA8/Ed8X+hvQgLXIiwYHm4OQFc=';

      jest.spyOn(coreCrypto, 'conversationExists').mockResolvedValueOnce(true);
      jest.spyOn(recurringTaskScheduler, 'cancelTask');
      jest.spyOn(TaskScheduler, 'cancelTask');

      await mlsService.wipeConversation(groupId);

      expect(recurringTaskScheduler.cancelTask).toHaveBeenCalledWith(expect.stringContaining(groupId));
      expect(TaskScheduler.cancelTask).toHaveBeenCalledWith(expect.stringContaining(groupId));
      expect(coreCrypto.wipeConversation).toHaveBeenCalled();
    });

    it('does not try to wipe a group if it does not exist already', async () => {
      const [mlsService, {coreCrypto, recurringTaskScheduler}] = await createMLSService();
      const groupId = 'mXOagqRIX/RFd7QyXJA8/Ed8X+hvQgLXIiwYHm4OQFc=';

      jest.spyOn(coreCrypto, 'conversationExists').mockResolvedValueOnce(false);
      jest.spyOn(recurringTaskScheduler, 'cancelTask');
      jest.spyOn(TaskScheduler, 'cancelTask');

      await mlsService.wipeConversation(groupId);

      expect(recurringTaskScheduler.cancelTask).toHaveBeenCalledWith(expect.stringContaining(groupId));
      expect(TaskScheduler.cancelTask).toHaveBeenCalledWith(expect.stringContaining(groupId));
      expect(coreCrypto.wipeConversation).not.toHaveBeenCalled();
    });
  });

  describe('handleMLSMessageAddEvent', () => {
    it('decrypts a message and emits new epoch event if epoch has changed', async () => {
      const [mlsService, {coreCrypto: mockCoreCrypto}] = await createMLSService();

      const mockGroupId = 'mXOagqRIX/RFd7QyXJA8/Ed8X+hvQgLXIiwYHm3OQFc=';
      const mockedNewEpoch = 3;

      const getGroupIdFromConversationId = () => Promise.resolve(mockGroupId);

      const mockedDecryptoedMessage: DecryptedMessage = {
        hasEpochChanged: true,
        isActive: false,
        proposals: [],
      };

      jest.spyOn(mockCoreCrypto, 'decryptMessage').mockResolvedValueOnce(mockedDecryptoedMessage);
      jest.spyOn(mockCoreCrypto, 'conversationEpoch').mockResolvedValueOnce(mockedNewEpoch);
      jest.spyOn(mlsService, 'emit').mockImplementation(jest.fn());

      const mockedMLSWelcomeEvent: ConversationMLSMessageAddEvent = {
        type: CONVERSATION_EVENT.MLS_MESSAGE_ADD,
        senderClientId: '',
        conversation: '',
        data: '',
        from: '',
        time: '',
      };

      await mlsService.handleMLSMessageAddEvent(mockedMLSWelcomeEvent, getGroupIdFromConversationId);
      expect(mockCoreCrypto.decryptMessage).toHaveBeenCalled();
      expect(mlsService.emit).toHaveBeenCalledWith('newEpoch', {epoch: mockedNewEpoch, groupId: mockGroupId});
    });

    it('handles pending propoals with a delay after decrypting a message', async () => {
      const [mlsService, {coreCrypto: mockCoreCrypto}] = await createMLSService();
      jest.useFakeTimers();

      const mockGroupId = 'mXOagqRIX/RFd7QyXJA8/Ed8X+hvQgLXIiwYHm3OQFc=';
      const mockedNewEpoch = 3;
      const commitDelay = 1000;

      const getGroupIdFromConversationId = () => Promise.resolve(mockGroupId);

      const mockedDecryptoedMessage: DecryptedMessage = {
        hasEpochChanged: true,
        isActive: false,
        proposals: [],
        commitDelay,
      };

      jest.spyOn(mockCoreCrypto, 'decryptMessage').mockResolvedValueOnce(mockedDecryptoedMessage);
      jest.spyOn(mockCoreCrypto, 'conversationEpoch').mockResolvedValueOnce(mockedNewEpoch);

      jest.spyOn(mlsService, 'commitPendingProposals');

      const mockedMLSWelcomeEvent: ConversationMLSMessageAddEvent = {
        type: CONVERSATION_EVENT.MLS_MESSAGE_ADD,
        senderClientId: '',
        conversation: '',
        data: '',
        from: '',
        time: new Date().toISOString(),
      };

      await mlsService.handleMLSMessageAddEvent(mockedMLSWelcomeEvent, getGroupIdFromConversationId);

      expect(mockCoreCrypto.commitPendingProposals).not.toHaveBeenCalled();

      jest.advanceTimersByTime(commitDelay);
      expect(mockCoreCrypto.decryptMessage).toHaveBeenCalled();
      expect(mockCoreCrypto.commitPendingProposals).toHaveBeenCalled();
    });
  });

  describe('handleMLSWelcomeMessageEvent', () => {
    it("before processing welcome it verifies that there's enough key packages locally", async () => {
      const [mlsService, {apiClient, coreCrypto}] = await createMLSService();

      const mockClientId = 'client-1';
      const mockClient = {mls_public_keys: {ed25519: 'key'}, id: mockClientId} as unknown as RegisteredClient;

      apiClient.context = {clientType: ClientType.PERMANENT, clientId: mockClientId, userId: ''};

      const mockedClientKeyPackages = [new Uint8Array()];
      jest.spyOn(coreCrypto, 'clientKeypackages').mockResolvedValueOnce(mockedClientKeyPackages);

      const numberOfKeysBelowThreshold = mlsService.config.minRequiredNumberOfAvailableKeyPackages - 1;
      jest.spyOn(apiClient.api.client, 'getMLSKeyPackageCount').mockResolvedValueOnce(numberOfKeysBelowThreshold);
      jest.spyOn(coreCrypto, 'clientValidKeypackagesCount').mockResolvedValueOnce(numberOfKeysBelowThreshold);

      jest.spyOn(apiClient.api.client, 'uploadMLSKeyPackages').mockResolvedValueOnce(undefined);
      jest.spyOn(coreCrypto, 'processWelcomeMessage').mockResolvedValueOnce(new Uint8Array());

      jest.spyOn(mlsService, 'scheduleKeyMaterialRenewal').mockImplementation(jest.fn());

      const mockedMLSWelcomeEvent: ConversationMLSWelcomeEvent = {
        type: CONVERSATION_EVENT.MLS_WELCOME_MESSAGE,
        conversation: '',
        data: '',
        from: '',
        time: '',
      };

      await mlsService.handleMLSWelcomeMessageEvent(mockedMLSWelcomeEvent, mockClient.id);

      expect(coreCrypto.processWelcomeMessage).toHaveBeenCalled();
      expect(apiClient.api.client.uploadMLSKeyPackages).toHaveBeenCalledWith(mockClientId, expect.anything());
    });

    it('before processing welcome it does not generate new keys if there is enough key packages locally', async () => {
      const [mlsService, {apiClient, coreCrypto}] = await createMLSService();

      const mockClientId = 'client-1';
      const mockClient = {mls_public_keys: {ed25519: 'key'}, id: mockClientId} as unknown as RegisteredClient;

      apiClient.context = {clientType: ClientType.PERMANENT, clientId: mockClientId, userId: ''};

      const mockedClientKeyPackages = [new Uint8Array()];
      jest.spyOn(coreCrypto, 'clientKeypackages').mockResolvedValueOnce(mockedClientKeyPackages);

      const numberOfKeysAboveThreshold = mlsService.config.minRequiredNumberOfAvailableKeyPackages + 1;
      jest.spyOn(coreCrypto, 'clientValidKeypackagesCount').mockResolvedValueOnce(numberOfKeysAboveThreshold);
      jest.spyOn(apiClient.api.client, 'getMLSKeyPackageCount').mockResolvedValueOnce(numberOfKeysAboveThreshold);

      jest.spyOn(apiClient.api.client, 'uploadMLSKeyPackages').mockResolvedValueOnce(undefined);
      jest.spyOn(coreCrypto, 'processWelcomeMessage').mockResolvedValueOnce(new Uint8Array());

      jest.spyOn(mlsService, 'scheduleKeyMaterialRenewal').mockImplementation(jest.fn());

      const mockedMLSWelcomeEvent: ConversationMLSWelcomeEvent = {
        type: CONVERSATION_EVENT.MLS_WELCOME_MESSAGE,
        conversation: '',
        data: '',
        from: '',
        time: '',
      };

      await mlsService.handleMLSWelcomeMessageEvent(mockedMLSWelcomeEvent, mockClient.id);

      expect(coreCrypto.processWelcomeMessage).toHaveBeenCalled();
      expect(apiClient.api.client.uploadMLSKeyPackages).not.toHaveBeenCalled();
    });

    it('before processing welcome it does not generate new keys if there is enough key packages uploaded to backend', async () => {
      const [mlsService, {apiClient, coreCrypto}] = await createMLSService();

      const mockClientId = 'client-1';
      const mockClient = {mls_public_keys: {ed25519: 'key'}, id: mockClientId} as unknown as RegisteredClient;

      apiClient.context = {clientType: ClientType.PERMANENT, clientId: mockClientId, userId: ''};

      const mockedClientKeyPackages = [new Uint8Array()];
      jest.spyOn(coreCrypto, 'clientKeypackages').mockResolvedValueOnce(mockedClientKeyPackages);

      const numberOfKeysBelowThreshold = mlsService.config.minRequiredNumberOfAvailableKeyPackages - 1;
      const numberOfKeysAboveThreshold = mlsService.config.minRequiredNumberOfAvailableKeyPackages + 1;

      jest.spyOn(coreCrypto, 'clientValidKeypackagesCount').mockResolvedValueOnce(numberOfKeysBelowThreshold);
      jest.spyOn(apiClient.api.client, 'getMLSKeyPackageCount').mockResolvedValueOnce(numberOfKeysAboveThreshold);

      jest.spyOn(apiClient.api.client, 'uploadMLSKeyPackages').mockResolvedValueOnce(undefined);
      jest.spyOn(coreCrypto, 'processWelcomeMessage').mockResolvedValueOnce(new Uint8Array());

      jest.spyOn(mlsService, 'scheduleKeyMaterialRenewal').mockImplementation(jest.fn());

      const mockedMLSWelcomeEvent: ConversationMLSWelcomeEvent = {
        type: CONVERSATION_EVENT.MLS_WELCOME_MESSAGE,
        conversation: '',
        data: '',
        from: '',
        time: '',
      };

      await mlsService.handleMLSWelcomeMessageEvent(mockedMLSWelcomeEvent, mockClient.id);

      expect(coreCrypto.processWelcomeMessage).toHaveBeenCalled();
      expect(apiClient.api.client.uploadMLSKeyPackages).not.toHaveBeenCalled();
    });
  });

  describe('tryEstablishingMLSGroup', () => {
    it('returns false if group did already exist locally', async () => {
      const [mlsService] = await createMLSService();

      const mockGroupId = 'mock-group-id';

      jest.spyOn(mlsService, 'conversationExists').mockResolvedValueOnce(true);
      jest.spyOn(mlsService, 'registerConversation').mockImplementation(jest.fn());

      const wasConversationEstablished = await mlsService.tryEstablishingMLSGroup(mockGroupId);

      expect(mlsService.registerConversation).not.toHaveBeenCalled();
      expect(wasConversationEstablished).toBe(false);
    });

    it('returns false if corecrypto has thrown an error when trying to register group locally', async () => {
      const [mlsService] = await createMLSService();

      const mockGroupId = 'mock-group-id';

      jest.spyOn(mlsService, 'conversationExists').mockResolvedValueOnce(false);
      jest
        .spyOn(mlsService, 'registerConversation')
        .mockRejectedValueOnce(new Error(CoreCryptoMLSError.CONVERSATION_ALREADY_EXISTS));

      const wasConversationEstablished = await mlsService.tryEstablishingMLSGroup(mockGroupId);

      expect(mlsService.registerConversation).toHaveBeenCalledWith(mockGroupId, []);
      expect(wasConversationEstablished).toBe(false);
    });

    it('returns false and wipes group locally if any backend error was thrown', async () => {
      const [mlsService] = await createMLSService();

      const mockGroupId = 'mock-group-id2';

      jest.spyOn(mlsService, 'conversationExists').mockResolvedValueOnce(false);
      jest
        .spyOn(mlsService, 'registerConversation')
        .mockRejectedValueOnce(new BackendError('', BackendErrorLabel.MLS_STALE_MESSAGE, StatusCode.CONFLICT));
      jest.spyOn(mlsService, 'wipeConversation').mockImplementation(jest.fn());

      const wasConversationEstablished = await mlsService.tryEstablishingMLSGroup(mockGroupId);

      expect(mlsService.registerConversation).toHaveBeenCalledWith(mockGroupId, []);
      expect(mlsService.wipeConversation).toHaveBeenCalledWith(mockGroupId);
      expect(wasConversationEstablished).toBe(false);
    });

    it('returns true after MLS group was etablished successfully', async () => {
      const [mlsService] = await createMLSService();

      const mockGroupId = 'mock-group-id2';

      jest.spyOn(mlsService, 'conversationExists').mockResolvedValueOnce(false);
      jest.spyOn(mlsService, 'registerConversation').mockResolvedValueOnce({events: [], time: ''});
      jest.spyOn(mlsService, 'wipeConversation').mockImplementation(jest.fn());

      const wasConversationEstablished = await mlsService.tryEstablishingMLSGroup(mockGroupId);

      expect(mlsService.registerConversation).toHaveBeenCalledWith(mockGroupId, []);
      expect(mlsService.wipeConversation).not.toHaveBeenCalled();
      expect(wasConversationEstablished).toBe(true);
    });
  });
});
