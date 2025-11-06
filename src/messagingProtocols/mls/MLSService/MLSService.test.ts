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
import {TimeInMillis} from '@wireapp/commons/lib/util/TimeUtil';

import {randomUUID} from 'crypto';

import {APIClient} from '@wireapp/api-client';
import {
  Ciphersuite,
  ClientId,
  ConversationId,
  CoreCrypto,
  CoreCryptoContext,
  DecryptedMessage,
  WelcomeBundle,
} from '@wireapp/core-crypto';

import {CORE_CRYPTO_ERROR_NAMES} from './CoreCryptoMLSError';
import {InitClientOptions, MLSService} from './MLSService';

import {AddUsersFailure, AddUsersFailureReasons} from '../../../conversation';
import {openDB} from '../../../storage/CoreDB';
import {RecurringTaskScheduler} from '../../../util/RecurringTaskScheduler';
import {TaskScheduler} from '../../../util/TaskScheduler';
import * as Helper from '../E2EIdentityService/Helper';

jest.mock('../E2EIdentityService/Helper', () => ({
  ...jest.requireActual('../E2EIdentityService/Helper'),
  getMLSDeviceStatus: jest.fn(),
}));

jest.createMockFromModule('@wireapp/api-client');

function createUserId() {
  return {id: randomUUID(), domain: ''};
}

const defaultMLSInitConfig: InitClientOptions = {
  ciphersuites: [Ciphersuite.MLS_128_DHKEMX25519_AES128GCM_SHA256_Ed25519],
  defaultCiphersuite: Ciphersuite.MLS_128_DHKEMX25519_AES128GCM_SHA256_Ed25519,
};

// Needs to be divisible by 4 to be a valid base64 string
const mockGroupId = 'Z3JvdXAtdGVzdC0x';
const mockedMLSWelcomeEventData = '';

const apiClients: APIClient[] = [];

const createMLSService = async () => {
  const apiClient = new APIClient();
  apiClients.push(apiClient);
  const transactionContext = {
    mlsInit: jest.fn(),
    wipeConversation: jest.fn(),
    clientKeypackages: jest.fn(),
    createConversation: jest.fn(),
    clientValidKeypackagesCount: jest.fn(),
    conversationExists: jest.fn(),
    processWelcomeMessage: jest.fn(),
    commitPendingProposals: jest.fn(),
    decryptMessage: jest.fn(),
    updateKeyingMaterial: jest.fn(),
  } as unknown as jest.Mocked<CoreCryptoContext>;

  const mockCoreCrypto = {
    transaction: jest.fn(fn => {
      return fn(transactionContext);
    }),
    registerEpochObserver: jest.fn(),
    provideTransport: jest.fn(),
    version: jest.fn(),
    conversationExists: jest.fn(),
    e2eiIsEnabled: jest.fn(() => false),
    clientPublicKey: jest.fn(),
    conversationEpoch: jest.fn(),
  } as unknown as jest.Mocked<CoreCrypto>;

  const mockedDb = await openDB('core-test-db');
  const recurringTaskScheduler = new RecurringTaskScheduler({
    delete: key => mockedDb.delete('recurringTasks', key),
    get: async key => (await mockedDb.get('recurringTasks', key))?.firingDate,
    set: async (key, timestamp) => {
      await mockedDb.put('recurringTasks', {key, firingDate: timestamp}, key);
    },
  });

  const mlsService = new MLSService(apiClient, mockCoreCrypto, mockedDb, recurringTaskScheduler);

  mlsService['_config'] = {...defaultMLSInitConfig, nbKeyPackages: 100, keyingMaterialUpdateThreshold: 1};
  return [mlsService, {apiClient, coreCrypto: mockCoreCrypto, recurringTaskScheduler, transactionContext}] as const;
};

afterAll(() => {
  jest.clearAllTimers();
});

describe('MLSService', () => {
  afterAll(() => {
    apiClients.forEach(client => client.disconnect());
  });

  describe('registerConversation', () => {
    let mlsService: MLSService;
    let apiClient: APIClient;

    beforeEach(async () => {
      const [mockedMLSService, {apiClient: mockApiClient}] = await createMLSService();
      mlsService = mockedMLSService;
      apiClient = mockApiClient;
      jest
        .spyOn(apiClient.api.client, 'getPublicKeys')
        .mockResolvedValue({removal: {ed25519: 'mXOagqRIX/RFd7QyXJA8/Ed8X+hvQgLXIiwYHm3OQFc='}});

      jest.spyOn(apiClient.api.client, 'claimMLSKeyPackages').mockResolvedValue({key_packages: []});
      jest.spyOn(mlsService, 'scheduleKeyMaterialRenewal').mockImplementation();
      jest.spyOn(mlsService as any, 'cancelKeyMaterialRenewal').mockImplementation();
    });

    it('creates a new mls conversation and avoid adding the selfUser', async () => {
      const groupId = 'mXOagqRIX/RFd7QyXJA8/Ed8X+hvQgLXIiwYHm3OQFc=';
      const selfUser = createUserId();
      const creator = {user: selfUser, client: 'client-1'};
      const users = [createUserId(), createUserId()];

      await mlsService.registerConversation(groupId, [...users, selfUser], {creator});

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

    it('returns a list of failure reasons if it was not possible to claim keys for intended users', async () => {
      const groupId = 'mXOagqRIX/RFd7QyXJA8/Ed8X+hvQgLXIiwYHm3OQFc=';
      const selfUser = createUserId();
      const creator = {user: selfUser, client: 'client-1'};
      const users = [createUserId(), createUserId()];

      const failure: AddUsersFailure = {reason: AddUsersFailureReasons.OFFLINE_FOR_TOO_LONG, users};

      jest.spyOn(mlsService, 'getKeyPackagesPayload').mockResolvedValueOnce({
        keyPackages: [],
        failures: [failure],
      });

      const failures = await mlsService.registerConversation(groupId, [...users, selfUser], {creator});

      expect(failures).toEqual([failure]);
      expect(mlsService.scheduleKeyMaterialRenewal).toHaveBeenCalledWith(groupId);
    });
  });

  describe('getKeyPackagesPayload', () => {
    it('succesfully claims keys for all users', async () => {
      const [mlsService, {apiClient}] = await createMLSService();
      const users = [createUserId(), createUserId()];

      jest.spyOn(apiClient.api.client, 'claimMLSKeyPackages').mockImplementation(async userId => ({
        key_packages: [{client: 'client-1', domain: 'domain-1', key_package: '', key_package_ref: '', user: userId}],
      }));

      const {failures, keyPackages} = await mlsService.getKeyPackagesPayload(users);

      expect(failures).toEqual([]);
      expect(keyPackages).toHaveLength(2);
    });

    it('returns failure reasons list if it was not possible to claim user keys', async () => {
      const [mlsService, {apiClient}] = await createMLSService();
      const users = [createUserId(), createUserId(), createUserId()];

      jest.spyOn(apiClient.api.client, 'claimMLSKeyPackages').mockRejectedValueOnce(undefined);

      jest.spyOn(apiClient.api.client, 'claimMLSKeyPackages').mockResolvedValueOnce({
        key_packages: [],
      });

      jest.spyOn(apiClient.api.client, 'claimMLSKeyPackages').mockResolvedValueOnce({
        key_packages: [
          {client: 'client-1', domain: 'domain-1', key_package: '', key_package_ref: '', user: users[2].id},
        ],
      });

      const {failures, keyPackages} = await mlsService.getKeyPackagesPayload(users);

      expect(failures).toEqual([
        {reason: AddUsersFailureReasons.OFFLINE_FOR_TOO_LONG, users: [users[1]]},
        {reason: AddUsersFailureReasons.UNREACHABLE_BACKENDS, users: [users[0]], backends: [users[1].domain]},
      ]);

      expect(keyPackages).toHaveLength(1);
    });
  });

  describe('isConversationEstablished', () => {
    it('returns false if conversation does not exist locally', async () => {
      const [mlsService, {coreCrypto}] = await createMLSService();

      const groupId = 'mXOagqRIX/RFd7QyXJA8/Ed8X+hvQgLXIiwYHm3OQFc=';

      jest.spyOn(coreCrypto, 'conversationExists').mockResolvedValueOnce(false);

      const isEstablshed = await mlsService.isConversationEstablished(groupId);

      expect(isEstablshed).toBe(false);
    });

    it('returns false if epoch number is 0', async () => {
      const [mlsService, {coreCrypto}] = await createMLSService();

      const groupId = 'mXOagqRIX/RFd7QyXJA8/Ed8X+hvQgLXIiwYHm3OQFc=';

      jest.spyOn(coreCrypto, 'conversationExists').mockResolvedValueOnce(true);
      jest.spyOn(mlsService, 'getEpoch').mockResolvedValueOnce(0);

      const isEstablshed = await mlsService.isConversationEstablished(groupId);

      expect(isEstablshed).toBe(false);
    });

    it.each([1, 2, 100])('returns false if epoch number is 1 or more', async epoch => {
      const [mlsService, {coreCrypto}] = await createMLSService();

      const groupId = 'mXOagqRIX/RFd7QyXJA8/Ed8X+hvQgLXIiwYHm3OQFc=';

      jest.spyOn(coreCrypto, 'conversationExists').mockResolvedValueOnce(true);
      jest.spyOn(mlsService, 'getEpoch').mockResolvedValueOnce(epoch);

      const isEstablshed = await mlsService.isConversationEstablished(groupId);

      expect(isEstablshed).toBe(true);
    });
  });

  describe('isInitializedMLSClient', () => {
    it.each([
      [Ciphersuite.MLS_128_DHKEMX25519_AES128GCM_SHA256_Ed25519],
      [Ciphersuite.MLS_128_DHKEMP256_AES128GCM_SHA256_P256],
      [Ciphersuite.MLS_128_DHKEMX25519_CHACHA20POLY1305_SHA256_Ed25519],
      [Ciphersuite.MLS_256_DHKEMX448_AES256GCM_SHA512_Ed448],
      [Ciphersuite.MLS_256_DHKEMP521_AES256GCM_SHA512_P521],
      [Ciphersuite.MLS_256_DHKEMX448_CHACHA20POLY1305_SHA512_Ed448],
      [Ciphersuite.MLS_256_DHKEMP384_AES256GCM_SHA384_P384],
    ])('always return false for empty mls_public_keys (%d)', async ciphersuite => {
      const [mlsService] = await createMLSService();

      const mockClient = {mls_public_keys: {}} as unknown as RegisteredClient;

      mlsService['_config'] = {
        ...defaultMLSInitConfig,
        defaultCiphersuite: ciphersuite,
        nbKeyPackages: 100,
        keyingMaterialUpdateThreshold: 1,
      };

      const isInitialized = mlsService.isInitializedMLSClient(mockClient);

      expect(isInitialized).toBe(false);
    });

    it.each([
      [Ciphersuite.MLS_128_DHKEMX25519_AES128GCM_SHA256_Ed25519, 'ed25519'],
      [Ciphersuite.MLS_128_DHKEMP256_AES128GCM_SHA256_P256, 'ecdsa_secp256r1_sha256'],
      [Ciphersuite.MLS_128_DHKEMX25519_CHACHA20POLY1305_SHA256_Ed25519, 'ed25519'],
      [Ciphersuite.MLS_256_DHKEMX448_AES256GCM_SHA512_Ed448, 'ed448'],
      [Ciphersuite.MLS_256_DHKEMP521_AES256GCM_SHA512_P521, 'ecdsa_secp521r1_sha512'],
      [Ciphersuite.MLS_256_DHKEMX448_CHACHA20POLY1305_SHA512_Ed448, 'ed448'],
      [Ciphersuite.MLS_256_DHKEMP384_AES256GCM_SHA384_P384, 'ecdsa_secp384r1_sha384'],
    ])(
      'returns true if there is a signature corresponding to the ciphersuite used (%d, %s)',
      async (ciphersuite, signatureAlgo) => {
        const [mlsService] = await createMLSService();

        const mockClient = {mls_public_keys: {[signatureAlgo]: 'signature'}} as unknown as RegisteredClient;

        mlsService['_config'] = {
          ...defaultMLSInitConfig,
          defaultCiphersuite: ciphersuite,
          nbKeyPackages: 100,
          keyingMaterialUpdateThreshold: 1,
        };

        const isInitialized = mlsService.isInitializedMLSClient(mockClient);

        expect(isInitialized).toBe(true);
      },
    );

    it.each([
      [Ciphersuite.MLS_128_DHKEMX25519_AES128GCM_SHA256_Ed25519, 'p256'],
      [Ciphersuite.MLS_128_DHKEMP256_AES128GCM_SHA256_P256, 'ed25519'],
      [Ciphersuite.MLS_128_DHKEMX25519_CHACHA20POLY1305_SHA256_Ed25519, 'p256'],
      [Ciphersuite.MLS_256_DHKEMX448_AES256GCM_SHA512_Ed448, 'p384'],
      [Ciphersuite.MLS_256_DHKEMP521_AES256GCM_SHA512_P521, 'ed448'],
      [Ciphersuite.MLS_256_DHKEMX448_CHACHA20POLY1305_SHA512_Ed448, 'p256'],
      [Ciphersuite.MLS_256_DHKEMP384_AES256GCM_SHA384_P384, 'p256'],
    ])(
      'returns false if there is a signature not corresponding to the ciphersuite used (%d, %s)',
      async (ciphersuite, signatureAlgo) => {
        const [mlsService] = await createMLSService();

        const mockClient = {mls_public_keys: {[signatureAlgo]: 'signature'}} as unknown as RegisteredClient;

        mlsService['_config'] = {
          ...defaultMLSInitConfig,
          defaultCiphersuite: ciphersuite,
          nbKeyPackages: 100,
          keyingMaterialUpdateThreshold: 1,
        };

        const isInitialized = mlsService.isInitializedMLSClient(mockClient);

        expect(isInitialized).toBe(false);
      },
    );
  });

  describe('initClient', () => {
    it('uses the default config if config is not provided by the consumer', async () => {
      const [mlsService, {apiClient, coreCrypto, transactionContext}] = await createMLSService();

      const mockUserId = {id: 'user-1', domain: 'local.zinfra.io'};
      const mockClientId = 'client-1';
      const mockClient = {mls_public_keys: {}, id: mockClientId} as unknown as RegisteredClient;

      apiClient.context = {clientType: ClientType.PERMANENT, clientId: mockClientId, userId: ''};

      const mockedClientPublicKey = new Uint8Array();

      jest.spyOn(coreCrypto, 'clientPublicKey').mockResolvedValueOnce(mockedClientPublicKey);
      jest.spyOn(apiClient.api.client, 'putClient').mockResolvedValueOnce(undefined);
      jest.spyOn(apiClient.api.client, 'getMLSKeyPackageCount').mockResolvedValueOnce(mlsService.config.nbKeyPackages);

      const config = {...defaultMLSInitConfig};

      await mlsService.initClient(mockUserId, mockClient, config);

      expect(transactionContext.mlsInit).toHaveBeenCalledWith(
        expect.any(ClientId),
        [Ciphersuite.MLS_128_DHKEMX25519_AES128GCM_SHA256_Ed25519],
        100,
      );

      expect(mlsService.config.nbKeyPackages).toEqual(100);
    });

    it('uses the config provided by the consumer', async () => {
      const [mlsService, {apiClient, transactionContext, coreCrypto}] = await createMLSService();

      const mockUserId = {id: 'user-1', domain: 'local.zinfra.io'};
      const mockClientId = 'client-1';
      const mockClient = {mls_public_keys: {}, id: mockClientId} as unknown as RegisteredClient;

      apiClient.context = {clientType: ClientType.PERMANENT, clientId: mockClientId, userId: ''};

      const mockedClientPublicKey = new Uint8Array();

      jest.spyOn(coreCrypto, 'clientPublicKey').mockResolvedValueOnce(mockedClientPublicKey);
      jest.spyOn(apiClient.api.client, 'putClient').mockResolvedValueOnce(undefined);
      jest.spyOn(apiClient.api.client, 'getMLSKeyPackageCount').mockResolvedValueOnce(mlsService.config.nbKeyPackages);

      const config = {...defaultMLSInitConfig, nbKeyPackages: 40, keyingMaterialUpdateThreshold: TimeInMillis.DAY};

      await mlsService.initClient(mockUserId, mockClient, config);

      expect(transactionContext.mlsInit).toHaveBeenCalledWith(
        expect.any(ClientId),
        [Ciphersuite.MLS_128_DHKEMX25519_AES128GCM_SHA256_Ed25519],
        config.nbKeyPackages,
      );

      expect(mlsService.config).toEqual(config);
    });

    it('uses the default config value when provided with undefined by the consumer', async () => {
      const [mlsService, {apiClient, transactionContext, coreCrypto}] = await createMLSService();

      const mockUserId = {id: 'user-1', domain: 'local.zinfra.io'};
      const mockClientId = 'client-1';
      const mockClient = {mls_public_keys: {}, id: mockClientId} as unknown as RegisteredClient;

      apiClient.context = {clientType: ClientType.PERMANENT, clientId: mockClientId, userId: ''};

      const mockedClientPublicKey = new Uint8Array();

      jest.spyOn(coreCrypto, 'clientPublicKey').mockResolvedValueOnce(mockedClientPublicKey);
      jest.spyOn(apiClient.api.client, 'putClient').mockResolvedValueOnce(undefined);
      jest.spyOn(apiClient.api.client, 'getMLSKeyPackageCount').mockResolvedValueOnce(mlsService.config.nbKeyPackages);

      const config = {
        ...defaultMLSInitConfig,
        nbKeyPackages: undefined,
        keyingMaterialUpdateThreshold: TimeInMillis.DAY,
      };

      await mlsService.initClient(mockUserId, mockClient, config);

      expect(transactionContext.mlsInit).toHaveBeenCalledWith(
        expect.any(ClientId),
        [Ciphersuite.MLS_128_DHKEMX25519_AES128GCM_SHA256_Ed25519],
        100,
      );

      expect(mlsService.config).toEqual({...config, nbKeyPackages: 100});
    });

    it('uploads public key only if it was not yet defined on client entity', async () => {
      const [mlsService, {apiClient, transactionContext, coreCrypto}] = await createMLSService();

      const mockUserId = {id: 'user-1', domain: 'local.zinfra.io'};
      const mockClientId = 'client-1';
      const mockClient = {mls_public_keys: {}, id: mockClientId} as unknown as RegisteredClient;

      apiClient.context = {clientType: ClientType.PERMANENT, clientId: mockClientId, userId: ''};

      jest.spyOn(apiClient.api.client, 'putClient').mockResolvedValueOnce(undefined);
      jest.spyOn(apiClient.api.client, 'getMLSKeyPackageCount').mockResolvedValueOnce(mlsService.config.nbKeyPackages);
      jest.spyOn(Helper, 'getMLSDeviceStatus').mockReturnValueOnce(Helper.MLSDeviceStatus.FRESH);
      jest.spyOn(coreCrypto, 'clientPublicKey').mockResolvedValue(new Uint8Array());

      await mlsService.initClient(mockUserId, mockClient, defaultMLSInitConfig);

      expect(transactionContext.mlsInit).toHaveBeenCalled();
      expect(apiClient.api.client.putClient).toHaveBeenCalledWith(mockClientId, expect.anything());
    });

    it('uploads key packages if there are not enough keys on backend', async () => {
      const [mlsService, {apiClient, transactionContext, coreCrypto}] = await createMLSService();

      const mockUserId = {id: 'user-1', domain: 'local.zinfra.io'};
      const mockClientId = 'client-1';

      const mockClient = {mls_public_keys: {ed25519: 'key'}, id: mockClientId} as unknown as RegisteredClient;

      apiClient.context = {clientType: ClientType.PERMANENT, clientId: mockClientId, userId: ''};

      const mockedClientKeyPackages = [new Uint8Array()];
      jest.spyOn(transactionContext, 'clientKeypackages').mockResolvedValueOnce(mockedClientKeyPackages);
      jest.spyOn(coreCrypto, 'clientPublicKey').mockResolvedValueOnce(new Uint8Array());
      jest.spyOn(Helper, 'getMLSDeviceStatus').mockReturnValueOnce(Helper.MLSDeviceStatus.REGISTERED);
      jest.spyOn(apiClient.api.client, 'uploadMLSKeyPackages').mockResolvedValueOnce(undefined);

      jest
        .spyOn(apiClient.api.client, 'getMLSKeyPackageCount')
        .mockResolvedValueOnce(mlsService['minRequiredKeyPackages'] - 1);

      await mlsService.initClient(mockUserId, mockClient, defaultMLSInitConfig);

      expect(transactionContext.mlsInit).toHaveBeenCalled();
      expect(apiClient.api.client.uploadMLSKeyPackages).toHaveBeenCalledWith(mockClientId, expect.anything());
    });

    it('does not upload public key or key packages if both are already uploaded', async () => {
      const [mlsService, {apiClient, transactionContext, coreCrypto}] = await createMLSService();

      const mockUserId = {id: 'user-1', domain: 'local.zinfra.io'};
      const mockClientId = 'client-1';
      const mockClient = {mls_public_keys: {ed25519: 'key'}, id: mockClientId} as unknown as RegisteredClient;

      apiClient.context = {clientType: ClientType.PERMANENT, clientId: mockClientId, userId: ''};

      jest.spyOn(apiClient.api.client, 'getClient').mockResolvedValueOnce(mockClient);

      jest.spyOn(apiClient.api.client, 'getMLSKeyPackageCount').mockResolvedValueOnce(mlsService.config.nbKeyPackages);
      jest.spyOn(apiClient.api.client, 'uploadMLSKeyPackages');
      jest.spyOn(apiClient.api.client, 'putClient');

      jest.spyOn(coreCrypto, 'clientPublicKey').mockResolvedValueOnce(new Uint8Array());

      await mlsService.initClient(mockUserId, mockClient, defaultMLSInitConfig);

      expect(transactionContext.mlsInit).toHaveBeenCalled();
      expect(apiClient.api.client.uploadMLSKeyPackages).not.toHaveBeenCalled();
      expect(apiClient.api.client.putClient).not.toHaveBeenCalled();
    });
  });

  describe('wipeConversation', () => {
    it('wipes a group and cancels its timers', async () => {
      const [mlsService, {recurringTaskScheduler, coreCrypto, transactionContext}] = await createMLSService();
      const groupId = 'mXOagqRIX/RFd7QyXJA8/Ed8X+hvQgLXIiwYHm4OQFc=';

      coreCrypto.conversationExists = jest.fn().mockResolvedValue(true);
      transactionContext.wipeConversation = jest.fn().mockResolvedValue(undefined);

      jest.spyOn(recurringTaskScheduler, 'cancelTask');
      jest.spyOn(TaskScheduler, 'cancelTask');

      await mlsService.wipeConversation(groupId);

      expect(recurringTaskScheduler.cancelTask).toHaveBeenCalledWith(expect.stringContaining(groupId));
      expect(TaskScheduler.cancelTask).toHaveBeenCalledWith(expect.stringContaining(groupId));
      expect(transactionContext.wipeConversation).toHaveBeenCalled();
    });

    it('does not try to wipe a group if it does not exist already', async () => {
      const [mlsService, {recurringTaskScheduler, transactionContext, coreCrypto}] = await createMLSService();
      const groupId = 'mXOagqRIX/RFd7QyXJA8/Ed8X+hvQgLXIiwYHm4OQFc=';

      coreCrypto.conversationExists = jest.fn().mockResolvedValue(false);
      transactionContext.wipeConversation = jest.fn().mockResolvedValue(undefined);

      jest.spyOn(recurringTaskScheduler, 'cancelTask');
      jest.spyOn(TaskScheduler, 'cancelTask');

      await mlsService.wipeConversation(groupId);

      expect(recurringTaskScheduler.cancelTask).toHaveBeenCalledWith(expect.stringContaining(groupId));
      expect(TaskScheduler.cancelTask).toHaveBeenCalledWith(expect.stringContaining(groupId));
      expect(transactionContext.wipeConversation).not.toHaveBeenCalled();
    });
  });

  describe('handleMLSMessageAddEvent', () => {
    it('decrypts a message', async () => {
      const [mlsService, {transactionContext, coreCrypto}] = await createMLSService();

      const mockGroupId = 'mXOagqRIX/RFd7QyXJA8/Ed8X+hvQgLXIiwYHm3OQFc=';
      const mockedNewEpoch = 3;

      const getGroupIdFromConversationId = () => Promise.resolve(mockGroupId);

      const mockedDecryptoedMessage: DecryptedMessage = {
        hasEpochChanged: true,
        isActive: false,
      };

      jest.spyOn(transactionContext, 'decryptMessage').mockResolvedValueOnce(mockedDecryptoedMessage);
      jest.spyOn(coreCrypto, 'conversationEpoch').mockResolvedValueOnce(mockedNewEpoch);

      const mockedMLSWelcomeEvent: ConversationMLSMessageAddEvent = {
        type: CONVERSATION_EVENT.MLS_MESSAGE_ADD,
        senderClientId: '',
        conversation: '',
        data: mockedMLSWelcomeEventData,
        from: '',
        time: '',
      };

      await mlsService.handleMLSMessageAddEvent(mockedMLSWelcomeEvent, getGroupIdFromConversationId);
      expect(transactionContext.decryptMessage).toHaveBeenCalled();
    });

    it('handles pending propoals with a delay after decrypting a message', async () => {
      const [mlsService, {transactionContext, coreCrypto}] = await createMLSService();
      jest.useFakeTimers();

      const mockGroupId = 'mXOagqRIX/RFd7QyXJA8/Ed8X+hvQgLXIiwYHm3OQFc=';
      const mockedNewEpoch = 3;
      const commitDelay = 1000;

      const getGroupIdFromConversationId = () => Promise.resolve(mockGroupId);

      const mockedDecryptoedMessage: DecryptedMessage = {
        hasEpochChanged: true,
        isActive: false,
        commitDelay,
      };

      jest.spyOn(transactionContext, 'decryptMessage').mockResolvedValueOnce(mockedDecryptoedMessage);
      jest.spyOn(coreCrypto, 'conversationEpoch').mockResolvedValueOnce(mockedNewEpoch);

      jest.spyOn(mlsService, 'commitPendingProposals');

      const mockedMLSWelcomeEvent: ConversationMLSMessageAddEvent = {
        type: CONVERSATION_EVENT.MLS_MESSAGE_ADD,
        senderClientId: '',
        conversation: '',
        data: mockedMLSWelcomeEventData,
        from: '',
        time: new Date().toISOString(),
      };

      await mlsService.handleMLSMessageAddEvent(mockedMLSWelcomeEvent, getGroupIdFromConversationId);

      jest.advanceTimersByTime(commitDelay);
      expect(transactionContext.decryptMessage).toHaveBeenCalled();
    });
  });

  describe('handleMLSWelcomeMessageEvent', () => {
    it("before processing welcome it verifies that there's enough key packages locally", async () => {
      const [mlsService, {apiClient, transactionContext}] = await createMLSService();

      const mockClientId = 'client-1';
      const mockClient = {mls_public_keys: {ed25519: 'key'}, id: mockClientId} as unknown as RegisteredClient;

      apiClient.context = {clientType: ClientType.PERMANENT, clientId: mockClientId, userId: ''};

      const mockedClientKeyPackages = [new Uint8Array()];
      jest.spyOn(transactionContext, 'clientKeypackages').mockResolvedValueOnce(mockedClientKeyPackages);

      const numberOfKeysBelowThreshold = mlsService['minRequiredKeyPackages'] - 1;
      jest.spyOn(apiClient.api.client, 'getMLSKeyPackageCount').mockResolvedValueOnce(numberOfKeysBelowThreshold);
      jest.spyOn(transactionContext, 'clientValidKeypackagesCount').mockResolvedValue(numberOfKeysBelowThreshold);

      jest.spyOn(apiClient.api.client, 'uploadMLSKeyPackages').mockResolvedValueOnce(undefined);
      jest.spyOn(transactionContext, 'processWelcomeMessage').mockResolvedValue({
        id: new ConversationId(new Uint8Array()),
        crlNewDistributionPoints: [],
      } as unknown as WelcomeBundle);

      jest.spyOn(mlsService, 'scheduleKeyMaterialRenewal').mockImplementation(jest.fn());

      const mockedMLSWelcomeEvent: ConversationMLSWelcomeEvent = {
        type: CONVERSATION_EVENT.MLS_WELCOME_MESSAGE,
        conversation: '',
        data: mockedMLSWelcomeEventData,
        from: '',
        time: '',
      };

      await mlsService.handleMLSWelcomeMessageEvent(mockedMLSWelcomeEvent, mockClient.id);

      expect(transactionContext.processWelcomeMessage).toHaveBeenCalled();
      expect(apiClient.api.client.uploadMLSKeyPackages).toHaveBeenCalledWith(mockClientId, expect.anything());
    });

    it('before processing welcome it does not generate new keys if there is enough key packages locally', async () => {
      const [mlsService, {apiClient, transactionContext}] = await createMLSService();

      const mockClientId = 'client-1';
      const mockClient = {mls_public_keys: {ed25519: 'key'}, id: mockClientId} as unknown as RegisteredClient;

      apiClient.context = {clientType: ClientType.PERMANENT, clientId: mockClientId, userId: ''};

      const mockedClientKeyPackages = [new Uint8Array()];
      jest.spyOn(transactionContext, 'clientKeypackages').mockResolvedValueOnce(mockedClientKeyPackages);

      const numberOfKeysAboveThreshold = mlsService['minRequiredKeyPackages'] + 1;
      jest.spyOn(transactionContext, 'clientValidKeypackagesCount').mockResolvedValue(numberOfKeysAboveThreshold);
      jest.spyOn(apiClient.api.client, 'getMLSKeyPackageCount').mockResolvedValueOnce(numberOfKeysAboveThreshold);

      jest.spyOn(apiClient.api.client, 'uploadMLSKeyPackages').mockResolvedValueOnce(undefined);
      jest.spyOn(transactionContext, 'processWelcomeMessage').mockResolvedValue({
        id: new ConversationId(new Uint8Array()),
        crlNewDistributionPoints: [],
      } as unknown as WelcomeBundle);

      jest.spyOn(mlsService, 'scheduleKeyMaterialRenewal').mockImplementation(jest.fn());

      const mockedMLSWelcomeEvent: ConversationMLSWelcomeEvent = {
        type: CONVERSATION_EVENT.MLS_WELCOME_MESSAGE,
        conversation: '',
        data: mockedMLSWelcomeEventData,
        from: '',
        time: '',
      };

      await mlsService.handleMLSWelcomeMessageEvent(mockedMLSWelcomeEvent, mockClient.id);

      expect(transactionContext.processWelcomeMessage).toHaveBeenCalled();
      expect(apiClient.api.client.uploadMLSKeyPackages).not.toHaveBeenCalled();
    });

    it('before processing welcome it does not generate new keys if there is enough key packages uploaded to backend', async () => {
      const [mlsService, {apiClient, transactionContext}] = await createMLSService();

      const mockClientId = 'client-1';
      const mockClient = {mls_public_keys: {ed25519: 'key'}, id: mockClientId} as unknown as RegisteredClient;

      apiClient.context = {clientType: ClientType.PERMANENT, clientId: mockClientId, userId: ''};

      const mockedClientKeyPackages = [new Uint8Array()];
      jest.spyOn(transactionContext, 'clientKeypackages').mockResolvedValueOnce(mockedClientKeyPackages);

      const numberOfKeysBelowThreshold = mlsService['minRequiredKeyPackages'] - 1;
      const numberOfKeysAboveThreshold = mlsService['minRequiredKeyPackages'] + 1;

      jest.spyOn(transactionContext, 'clientValidKeypackagesCount').mockResolvedValue(numberOfKeysBelowThreshold);
      jest.spyOn(apiClient.api.client, 'getMLSKeyPackageCount').mockResolvedValueOnce(numberOfKeysAboveThreshold);

      jest.spyOn(apiClient.api.client, 'uploadMLSKeyPackages').mockResolvedValueOnce(undefined);
      jest.spyOn(transactionContext, 'processWelcomeMessage').mockResolvedValue({
        id: new ConversationId(new Uint8Array()),
        crlNewDistributionPoints: [],
      } as unknown as WelcomeBundle);

      jest.spyOn(mlsService, 'scheduleKeyMaterialRenewal').mockImplementation(jest.fn());

      const mockedMLSWelcomeEvent: ConversationMLSWelcomeEvent = {
        type: CONVERSATION_EVENT.MLS_WELCOME_MESSAGE,
        conversation: '',
        data: mockedMLSWelcomeEventData,
        from: '',
        time: '',
      };

      await mlsService.handleMLSWelcomeMessageEvent(mockedMLSWelcomeEvent, mockClient.id);

      expect(transactionContext.processWelcomeMessage).toHaveBeenCalled();
      expect(apiClient.api.client.uploadMLSKeyPackages).not.toHaveBeenCalled();
    });
  });

  describe('tryEstablishingMLSGroup', () => {
    it('returns false if group did already exist locally', async () => {
      const [mlsService, {coreCrypto}] = await createMLSService();

      jest.spyOn(coreCrypto, 'conversationExists').mockResolvedValueOnce(true);
      jest.spyOn(mlsService, 'registerConversation').mockImplementation(jest.fn());

      const wasConversationEstablished = await mlsService.tryEstablishingMLSGroup(mockGroupId);

      expect(mlsService.registerConversation).not.toHaveBeenCalled();
      expect(wasConversationEstablished).toBe(false);
    });

    it('returns false if corecrypto has thrown an error when trying to register group locally', async () => {
      const [mlsService, {coreCrypto}] = await createMLSService();

      jest.spyOn(coreCrypto, 'conversationExists').mockResolvedValueOnce(false);

      const conversationAlreadyExistsError = new Error();
      conversationAlreadyExistsError.name = CORE_CRYPTO_ERROR_NAMES.MlsErrorConversationAlreadyExists;

      jest.spyOn(mlsService, 'registerConversation').mockRejectedValueOnce(conversationAlreadyExistsError);

      const wasConversationEstablished = await mlsService.tryEstablishingMLSGroup(mockGroupId);

      expect(mlsService.registerConversation).toHaveBeenCalledWith(mockGroupId, []);
      expect(wasConversationEstablished).toBe(false);
    });

    it('returns false and wipes group locally if any backend error was thrown', async () => {
      const [mlsService, {transactionContext}] = await createMLSService();

      jest.spyOn(transactionContext, 'conversationExists').mockResolvedValueOnce(false);
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
      const [mlsService, {transactionContext}] = await createMLSService();

      jest.spyOn(transactionContext, 'conversationExists').mockResolvedValueOnce(false);
      jest.spyOn(mlsService, 'registerConversation').mockResolvedValueOnce([]);
      jest.spyOn(mlsService, 'wipeConversation').mockImplementation(jest.fn());

      const wasConversationEstablished = await mlsService.tryEstablishingMLSGroup(mockGroupId);

      expect(mlsService.registerConversation).toHaveBeenCalledWith(mockGroupId, []);
      expect(mlsService.wipeConversation).not.toHaveBeenCalled();
      expect(wasConversationEstablished).toBe(true);
    });
  });
});
