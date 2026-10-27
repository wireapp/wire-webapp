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

import {ClientType, MLSPublicKeyAlgorithmKeys, RegisteredClient} from '@wireapp/api-client/lib/client';
import {
  MLSGroupOutOfSyncError,
  MLSInvalidLeafNodeIndexError,
  MLSInvalidLeafNodeSignatureError,
  MLSStaleMessageError,
} from '@wireapp/api-client/lib/conversation';
import {
  CONVERSATION_EVENT,
  ConversationMLSMessageAddEvent,
  ConversationMLSWelcomeEvent,
} from '@wireapp/api-client/lib/event';
import {BackendError, BackendErrorLabel, StatusCode} from '@wireapp/api-client/lib/http';
import {TimeInMillis} from '@wireapp/commons/lib/util/TimeUtil';
import {Decoder} from 'bazinga64';

import {randomUUID, UUID} from 'crypto';
import {createFireAndForgetInvoker} from '@enormora/fire-and-forget';

import {APIClient} from '@wireapp/api-client';
import {
  CipherSuite as Ciphersuite,
  ClientId,
  CommitBundle,
  ConversationId,
  CoreCrypto,
  CoreCryptoError,
  CoreCryptoContext,
  Credential,
  CredentialRef,
  CredentialType,
  DecryptedMessage,
  DeviceStatus,
  ExternalSender,
  KeyPackage,
  KeyPackageRef,
  MlsTransportError,
  MlsError,
  SignatureScheme,
  WireIdentity,
} from '@wireapp/core-crypto';

import {UPLOAD_COMMIT_BUNDLE_ABORT_REASONS, serializeAbortReason} from './coreCryptoMlsError';
import {InitClientOptions, MLSService, MLSServiceEvents} from './mlsService';

import {AddUsersFailure, AddUsersFailureReasons} from '../../../conversation';
import {openDB, CoreDatabase} from '../../../storage/coreDb';
import {RecurringTaskScheduler} from '../../../util/recurringTaskScheduler';
import {TaskScheduler} from '../../../util/taskScheduler';
import * as Helper from './mlsDeviceStatus';

type MLSServiceTestSetup = readonly [
  MLSService,
  {
    readonly apiClient: APIClient;
    readonly coreCrypto: jest.Mocked<CoreCrypto>;
    readonly recurringTaskScheduler: RecurringTaskScheduler;
    readonly transactionContext: jest.Mocked<CoreCryptoContext>;
    readonly coreDatabase: CoreDatabase;
  },
];

jest.mock('./mlsDeviceStatus', () => {
  return {
    ...jest.requireActual('./mlsDeviceStatus'),
    getMLSDeviceStatus: jest.fn(),
  };
});

jest.createMockFromModule('@wireapp/api-client');

function createUserId(): {id: UUID; domain: string} {
  return {id: randomUUID(), domain: ''};
}

const defaultMLSInitConfig: InitClientOptions = {
  ciphersuites: [Ciphersuite.Mls128Dhkemx25519Aes128gcmSha256Ed25519],
  defaultCiphersuite: Ciphersuite.Mls128Dhkemx25519Aes128gcmSha256Ed25519,
};

// Needs to be divisible by 4 to be a valid base64 string
const mockGroupId = 'Z3JvdXAtdGVzdC0x';
const mockedMLSWelcomeEventData = '';

const apiClients: APIClient[] = [];

const mockWireIdentity: WireIdentity = {
  credentialType: CredentialType.Basic,
  status: DeviceStatus.Valid,
  thumbprint: 'mock-thumbprint',
};

const createCredentialRef = (credentialType: CredentialType, earliestValidity = 0n): CredentialRef => {
  return {
    cipherSuite: jest.fn(() => defaultMLSInitConfig.defaultCiphersuite),
    earliestValidity: jest.fn(() => earliestValidity),
    signatureScheme: jest.fn(() => SignatureScheme.Ed25519),
    type: jest.fn(() => credentialType),
  } as unknown as CredentialRef;
};

const createKeyPackage = (bytes = new Uint8Array()): KeyPackage => {
  return {serialize: jest.fn(() => bytes)} as unknown as KeyPackage;
};

const createKeyPackageRef = ({
  cipherSuite = defaultMLSInitConfig.defaultCiphersuite,
  credentialType = CredentialType.Basic,
  isValid = true,
}: {
  cipherSuite?: Ciphersuite;
  credentialType?: CredentialType;
  isValid?: boolean;
} = {}): KeyPackageRef => {
  return {
    cipherSuite: jest.fn(() => cipherSuite),
    credentialType: jest.fn(() => credentialType),
    isValid: jest.fn(() => isValid),
  } as unknown as KeyPackageRef;
};

const createMLSService = async (): Promise<MLSServiceTestSetup> => {
  const apiClient = new APIClient();
  apiClients.push(apiClient);
  const basicCredentialRef = createCredentialRef(CredentialType.Basic);
  const transactionContext = {
    addCredential: jest.fn().mockResolvedValue(basicCredentialRef),
    addClientsToConversation: jest.fn().mockResolvedValue([]),
    mlsInit: jest.fn(),
    wipeConversation: jest.fn(),
    generateKeyPackage: jest.fn().mockResolvedValue(createKeyPackage()),
    getKeyPackages: jest.fn().mockResolvedValue([]),
    createConversation: jest.fn(),
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
    version: jest.fn(),
    conversationExists: jest.fn(),
    findCredentials: jest.fn(({credentialType}: {credentialType?: CredentialType}) => {
      return Promise.resolve(credentialType === CredentialType.X509 ? [] : [basicCredentialRef]);
    }),
    publicKey: jest.fn().mockResolvedValue(new Uint8Array()),
    conversationEpoch: jest.fn(),
  } as unknown as jest.Mocked<CoreCrypto>;

  const mockedDb = await openDB('core-test-db');
  const recurringTaskScheduler = new RecurringTaskScheduler(
    {
      delete: key => {
        return mockedDb.delete('recurringTasks', key);
      },
      get: async key => {
        return (await mockedDb.get('recurringTasks', key))?.firingDate;
      },
      set: async (key, timestamp) => {
        await mockedDb.put('recurringTasks', {key, firingDate: timestamp}, key);
      },
    },
    createFireAndForgetInvoker({reportError: jest.fn<void, [unknown]>()}),
  );

  const mlsService = new MLSService(apiClient, mockCoreCrypto, mockedDb, recurringTaskScheduler);

  mlsService['_config'] = {
    ...defaultMLSInitConfig,
    nbKeyPackages: 100,
    keyingMaterialUpdateThreshold: 1,
    signatureAlgorithm: MLSPublicKeyAlgorithmKeys.ED25519,
  };
  return [
    mlsService,
    {apiClient, coreCrypto: mockCoreCrypto, recurringTaskScheduler, transactionContext, coreDatabase: mockedDb},
  ] as const;
};

describe('MLSService', () => {
  afterAll(() => {
    jest.clearAllTimers();
  });

  afterAll(() => {
    apiClients.forEach(client => {
      client.disconnect();
    });
  });

  describe('MLS transport', () => {
    const welcomeBytes = new Uint8Array([3]);
    const commitBundle = {
      commit: new Uint8Array([1]),
      groupInfo: {payload: new Uint8Array([2])},
      welcome: {serialize: jest.fn(() => welcomeBytes)} as unknown as NonNullable<CommitBundle['welcome']>,
    } as CommitBundle;

    it('uploads a commit bundle and emits the distributed events', async () => {
      const [mlsService, {apiClient}] = await createMLSService();
      const response = {events: [], time: '2026-10-27T10:00:00.000Z'};
      const onDistributed = jest.fn();

      jest.spyOn(apiClient.api.conversation, 'postMlsCommitBundle').mockResolvedValueOnce(response);
      mlsService.on(MLSServiceEvents.MLS_EVENT_DISTRIBUTED, onDistributed);

      await expect(mlsService['mlsTransport'].sendCommitBundle(commitBundle)).resolves.toBeUndefined();

      expect(apiClient.api.conversation.postMlsCommitBundle).toHaveBeenCalledWith(new Uint8Array([1, 2, 3]));
      expect(onDistributed).toHaveBeenCalledWith(response);
    });

    it('rejects a partially delivered commit bundle with the V11 transport error', async () => {
      const [mlsService, {apiClient}] = await createMLSService();
      jest.spyOn(apiClient.api.conversation, 'postMlsCommitBundle').mockResolvedValueOnce({
        events: [],
        failed_to_send: [{id: randomUUID(), domain: 'example.com'}],
        time: '2026-10-27T10:00:00.000Z',
      });

      await expect(mlsService['mlsTransport'].sendCommitBundle(commitBundle)).rejects.toMatchObject({
        inner: {
          reason: serializeAbortReason({message: UPLOAD_COMMIT_BUNDLE_ABORT_REASONS.OTHER}),
        },
      } satisfies Partial<MlsTransportError>);
    });

    it.each([
      [
        new MLSInvalidLeafNodeSignatureError('invalid signature'),
        serializeAbortReason({message: UPLOAD_COMMIT_BUNDLE_ABORT_REASONS.BROKEN_MLS_CONVERSATION}),
      ],
      [
        new MLSInvalidLeafNodeIndexError('invalid index'),
        serializeAbortReason({message: UPLOAD_COMMIT_BUNDLE_ABORT_REASONS.BROKEN_MLS_CONVERSATION}),
      ],
      [
        new MLSStaleMessageError('stale message'),
        serializeAbortReason({message: UPLOAD_COMMIT_BUNDLE_ABORT_REASONS.MLS_STALE_MESSAGE}),
      ],
      [
        new MLSGroupOutOfSyncError(StatusCode.CONFLICT, [{id: 'user-id', domain: 'example.com'}], 'out of sync'),
        serializeAbortReason({
          message: UPLOAD_COMMIT_BUNDLE_ABORT_REASONS.MLS_GROUP_OUT_OF_SYNC,
          missing_users: [{id: 'user-id', domain: 'example.com'}],
        }),
      ],
    ])('maps backend rejection %s to a V11 transport rejection', async (backendError, reason) => {
      const [mlsService, {apiClient}] = await createMLSService();
      jest.spyOn(apiClient.api.conversation, 'postMlsCommitBundle').mockRejectedValueOnce(backendError);

      await expect(mlsService['mlsTransport'].sendCommitBundle(commitBundle)).rejects.toMatchObject({
        inner: {reason},
      } satisfies Partial<MlsTransportError>);
    });

    it('forwards opaque history secret data unchanged', async () => {
      const [mlsService] = await createMLSService();
      const data = new Uint8Array([4, 5, 6]);

      await expect(mlsService['mlsTransport'].prepareForTransport({clientId: {} as ClientId, data})).resolves.toBe(
        data,
      );
    });
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

    it('establishes an empty group with one single transaction', async () => {
      const [mlsService, {apiClient, coreCrypto, transactionContext}] = await createMLSService();
      const groupId = 'mXOagqRIX/RFd7QyXJA8/Ed8X+hvQgLXIiwYHm4OQFc=';
      const externalSender = {} as ExternalSender;

      jest
        .spyOn(apiClient.api.client, 'getPublicKeys')
        .mockResolvedValue({removal: {ed25519: 'mXOagqRIX/RFd7QyXJA8/Ed8X+hvQgLXIiwYHm3OQFc='}});
      jest.spyOn(ExternalSender, 'parse').mockReturnValueOnce(externalSender);
      jest.spyOn(mlsService, 'getKeyPackagesPayload').mockResolvedValueOnce({keyPackages: [], failures: []});
      jest.spyOn(mlsService, 'addUsersToExistingConversation').mockResolvedValueOnce(undefined);
      jest.spyOn(mlsService, 'scheduleKeyMaterialRenewal').mockResolvedValueOnce(undefined);

      await mlsService.registerConversation(groupId, []);

      expect(coreCrypto.transaction).toHaveBeenCalledTimes(1);
      expect(transactionContext.createConversation).toHaveBeenCalledWith(
        expect.any(ConversationId),
        expect.anything(),
        externalSender,
      );
      expect(mlsService.addUsersToExistingConversation).not.toHaveBeenCalled();
    });

    it('fails to establish an empty group when the keying material commit is rejected', async () => {
      const [mlsService, {apiClient, transactionContext}] = await createMLSService();
      const groupId = 'mXOagqRIX/RFd7QyXJA8/Ed8X+hvQgLXIiwYHm4OQFc=';
      const staleCommit = new Error('mls-stale-message');

      jest
        .spyOn(apiClient.api.client, 'getPublicKeys')
        .mockResolvedValue({removal: {ed25519: 'mXOagqRIX/RFd7QyXJA8/Ed8X+hvQgLXIiwYHm3OQFc='}});
      jest.spyOn(mlsService, 'getKeyPackagesPayload').mockResolvedValueOnce({keyPackages: [], failures: []});
      const scheduleRenewalSpy = jest.spyOn(mlsService, 'scheduleKeyMaterialRenewal').mockResolvedValue(undefined);

      // Losing the race against another client rejects our commit at the now stale epoch
      jest.spyOn(transactionContext, 'updateKeyingMaterial').mockRejectedValue(staleCommit);

      await expect(mlsService.registerConversation(groupId, [])).rejects.toThrow(staleCommit);

      // Reporting success here is what left the client behind the group's epoch with no way back
      expect(scheduleRenewalSpy).not.toHaveBeenCalled();
    });

    it('adds users to a group with one single transaction', async () => {
      const [mlsService, {apiClient, coreCrypto, transactionContext}] = await createMLSService();
      const groupId = 'mXOagqRIX/RFd7QyXJA8/Ed8X+hvQgLXIiwYHm4OQFd=';
      const keyPackages = [new Uint8Array([1, 2, 3])];

      jest
        .spyOn(apiClient.api.client, 'getPublicKeys')
        .mockResolvedValue({removal: {ed25519: 'mXOagqRIX/RFd7QyXJA8/Ed8X+hvQgLXIiwYHm3OQFc='}});
      jest.spyOn(mlsService, 'getKeyPackagesPayload').mockResolvedValueOnce({keyPackages, failures: []});
      jest.spyOn(mlsService, 'addUsersToExistingConversation').mockResolvedValueOnce(undefined);
      jest.spyOn(mlsService, 'scheduleKeyMaterialRenewal').mockResolvedValueOnce(undefined);

      await mlsService.registerConversation(groupId, []);

      expect(coreCrypto.transaction).toHaveBeenCalledTimes(1);
      expect(transactionContext.createConversation).toHaveBeenCalledTimes(1);
      expect(mlsService.addUsersToExistingConversation).toHaveBeenCalledWith(groupId, keyPackages, transactionContext);
    });
  });

  describe('getKeyPackagesPayload', () => {
    it('returns decoded key packages from successful claims for all users', async () => {
      const [mlsService, {apiClient}] = await createMLSService();
      const users = [createUserId(), createUserId()];

      jest.spyOn(apiClient.api.client, 'claimMLSKeyPackages').mockImplementation(async userId => {
        return {
          key_packages: [
            {client: 'client-1', domain: 'domain-1', key_package: 'AQID', key_package_ref: '', user: userId},
          ],
        };
      });

      const {failures, keyPackages} = await mlsService.getKeyPackagesPayload(users);

      expect(failures).toEqual([]);
      expect(keyPackages).toEqual([new Uint8Array([1, 2, 3]), new Uint8Array([1, 2, 3])]);
    });

    it('returns not-MLS-capable when a successful claim has no key packages', async () => {
      const [mlsService, {apiClient}] = await createMLSService();
      const user = createUserId();

      jest.spyOn(apiClient.api.client, 'claimMLSKeyPackages').mockResolvedValue({key_packages: []});

      const {failures, keyPackages} = await mlsService.getKeyPackagesPayload([user]);

      expect(failures).toEqual([{reason: AddUsersFailureReasons.NOT_MLS_CAPABLE, users: [user]}]);
      expect(keyPackages).toEqual([]);
    });

    it('returns a generic failure when a key-package claim is rejected for another reason', async () => {
      const [mlsService, {apiClient}] = await createMLSService();
      const user = createUserId();

      jest
        .spyOn(apiClient.api.client, 'claimMLSKeyPackages')
        .mockRejectedValue(new BackendError('claim failed', BackendErrorLabel.CLIENT_ERROR, StatusCode.BAD_REQUEST));

      const {failures} = await mlsService.getKeyPackagesPayload([user]);

      expect(failures).toEqual([{reason: AddUsersFailureReasons.KEY_PACKAGE_CLAIM_FAILED, users: [user]}]);
      expect(failures).not.toContainEqual(
        expect.objectContaining({reason: AddUsersFailureReasons.UNREACHABLE_BACKENDS}),
      );
    });

    it('groups multiple rejected claims under the generic failure reason', async () => {
      const [mlsService, {apiClient}] = await createMLSService();
      const users = [createUserId(), createUserId()];

      jest.spyOn(apiClient.api.client, 'claimMLSKeyPackages').mockRejectedValue(new Error('claim failed'));

      const {failures, keyPackages} = await mlsService.getKeyPackagesPayload(users);

      expect(failures).toEqual([{reason: AddUsersFailureReasons.KEY_PACKAGE_CLAIM_FAILED, users}]);
      expect(keyPackages).toEqual([]);
    });

    it('processes successful claims when another user claim rejects', async () => {
      const [mlsService, {apiClient}] = await createMLSService();
      const failedUser = createUserId();
      const successfulUser = createUserId();

      jest
        .spyOn(apiClient.api.client, 'claimMLSKeyPackages')
        .mockRejectedValueOnce(new Error('claim failed'))
        .mockResolvedValueOnce({
          key_packages: [
            {
              client: 'client-1',
              domain: successfulUser.domain,
              key_package: 'AQID',
              key_package_ref: '',
              user: successfulUser.id,
            },
          ],
        });

      const {failures, keyPackages} = await mlsService.getKeyPackagesPayload([failedUser, successfulUser]);

      expect(failures).toEqual([{reason: AddUsersFailureReasons.KEY_PACKAGE_CLAIM_FAILED, users: [failedUser]}]);
      expect(keyPackages).toEqual([new Uint8Array([1, 2, 3])]);
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
      [Ciphersuite.Mls128Dhkemx25519Aes128gcmSha256Ed25519, MLSPublicKeyAlgorithmKeys.ED25519],
      [Ciphersuite.Mls128Dhkemp256Aes128gcmSha256P256, MLSPublicKeyAlgorithmKeys.ECDSA_SECP256R1_SHA256],
      [Ciphersuite.Mls128Dhkemx25519Chacha20poly1305Sha256Ed25519, MLSPublicKeyAlgorithmKeys.ED25519],
      [Ciphersuite.Mls256Dhkemx448Aes256gcmSha512Ed448, MLSPublicKeyAlgorithmKeys.ED448],
      [Ciphersuite.Mls256Dhkemp521Aes256gcmSha512P521, MLSPublicKeyAlgorithmKeys.ECDSA_SECP521R1_SHA512],
      [Ciphersuite.Mls256Dhkemx448Chacha20poly1305Sha512Ed448, MLSPublicKeyAlgorithmKeys.ED448],
      [Ciphersuite.Mls256Dhkemp384Aes256gcmSha384P384, MLSPublicKeyAlgorithmKeys.ECDSA_SECP384R1_SHA384],
    ])('always return false for empty mls_public_keys (%d)', async (ciphersuite, signatureAlgorithm) => {
      const [mlsService] = await createMLSService();

      const mockClient = {mls_public_keys: {}} as unknown as RegisteredClient;

      mlsService['_config'] = {
        ...defaultMLSInitConfig,
        defaultCiphersuite: ciphersuite,
        nbKeyPackages: 100,
        keyingMaterialUpdateThreshold: 1,
        signatureAlgorithm,
      };

      const isInitialized = mlsService.isInitializedMLSClient(mockClient);

      expect(isInitialized).toBe(false);
    });

    it.each([
      [Ciphersuite.Mls128Dhkemx25519Aes128gcmSha256Ed25519, MLSPublicKeyAlgorithmKeys.ED25519],
      [Ciphersuite.Mls128Dhkemp256Aes128gcmSha256P256, MLSPublicKeyAlgorithmKeys.ECDSA_SECP256R1_SHA256],
      [Ciphersuite.Mls128Dhkemx25519Chacha20poly1305Sha256Ed25519, MLSPublicKeyAlgorithmKeys.ED25519],
      [Ciphersuite.Mls256Dhkemx448Aes256gcmSha512Ed448, MLSPublicKeyAlgorithmKeys.ED448],
      [Ciphersuite.Mls256Dhkemp521Aes256gcmSha512P521, MLSPublicKeyAlgorithmKeys.ECDSA_SECP521R1_SHA512],
      [Ciphersuite.Mls256Dhkemx448Chacha20poly1305Sha512Ed448, MLSPublicKeyAlgorithmKeys.ED448],
      [Ciphersuite.Mls256Dhkemp384Aes256gcmSha384P384, MLSPublicKeyAlgorithmKeys.ECDSA_SECP384R1_SHA384],
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
          signatureAlgorithm: signatureAlgo,
        };

        const isInitialized = mlsService.isInitializedMLSClient(mockClient);

        expect(isInitialized).toBe(true);
      },
    );

    it.each([
      [Ciphersuite.Mls128Dhkemx25519Aes128gcmSha256Ed25519, 'p256', MLSPublicKeyAlgorithmKeys.ED25519],
      [Ciphersuite.Mls128Dhkemp256Aes128gcmSha256P256, 'ed25519', MLSPublicKeyAlgorithmKeys.ECDSA_SECP256R1_SHA256],
      [Ciphersuite.Mls128Dhkemx25519Chacha20poly1305Sha256Ed25519, 'p256', MLSPublicKeyAlgorithmKeys.ED25519],
      [Ciphersuite.Mls256Dhkemx448Aes256gcmSha512Ed448, 'p384', MLSPublicKeyAlgorithmKeys.ED448],
      [Ciphersuite.Mls256Dhkemp521Aes256gcmSha512P521, 'ed448', MLSPublicKeyAlgorithmKeys.ECDSA_SECP521R1_SHA512],
      [Ciphersuite.Mls256Dhkemx448Chacha20poly1305Sha512Ed448, 'p256', MLSPublicKeyAlgorithmKeys.ED448],
      [Ciphersuite.Mls256Dhkemp384Aes256gcmSha384P384, 'p256', MLSPublicKeyAlgorithmKeys.ECDSA_SECP384R1_SHA384],
    ])(
      'returns false if there is a signature not corresponding to the ciphersuite used (%d, %s)',
      async (ciphersuite, signatureAlgo, expectedSignatureAlgorithm) => {
        const [mlsService] = await createMLSService();

        const mockClient = {mls_public_keys: {[signatureAlgo]: 'signature'}} as unknown as RegisteredClient;

        mlsService['_config'] = {
          ...defaultMLSInitConfig,
          defaultCiphersuite: ciphersuite,
          nbKeyPackages: 100,
          keyingMaterialUpdateThreshold: 1,
          signatureAlgorithm: expectedSignatureAlgorithm,
        };

        const isInitialized = mlsService.isInitializedMLSClient(mockClient);

        expect(isInitialized).toBe(false);
      },
    );
  });

  describe('initClient', () => {
    const validClientId = '0000000000000001';
    const expectedMlsTransport = expect.objectContaining({
      prepareForTransport: expect.any(Function),
      sendCommitBundle: expect.any(Function),
    });

    it('registers a basic credential when the database does not contain one', async () => {
      const [mlsService, {apiClient, coreCrypto, transactionContext}] = await createMLSService();
      const basicCredential = {} as Credential;
      const basicCredentialRef = createCredentialRef(CredentialType.Basic);
      let credentialAdded = false;

      jest.spyOn(Credential, 'basic').mockReturnValue(basicCredential);
      jest.spyOn(coreCrypto, 'findCredentials').mockImplementation(async ({credentialType}) => {
        if (credentialType === CredentialType.X509) {
          return [];
        }
        return credentialAdded ? [basicCredentialRef] : [];
      });
      transactionContext.addCredential.mockImplementation(async () => {
        credentialAdded = true;
        return basicCredentialRef;
      });
      jest.spyOn(Helper, 'getMLSDeviceStatus').mockReturnValueOnce(Helper.MLSDeviceStatus.REGISTERED);
      jest.spyOn(apiClient.api.client, 'getMLSKeyPackageCount').mockResolvedValueOnce(100);

      await mlsService.initClient(
        {...createUserId(), domain: 'local.zinfra.io'},
        {id: validClientId, mls_public_keys: {}} as RegisteredClient,
        defaultMLSInitConfig,
      );

      expect(Credential.basic).toHaveBeenCalledWith(defaultMLSInitConfig.defaultCiphersuite, expect.any(ClientId));
      expect(transactionContext.addCredential).toHaveBeenCalledWith(basicCredential);
    });

    it('uses the default config if config is not provided by the consumer', async () => {
      const [mlsService, {apiClient, coreCrypto, transactionContext}] = await createMLSService();

      const mockUserId = {...createUserId(), domain: 'local.zinfra.io'};
      const mockClientId = validClientId;
      const mockClient = {mls_public_keys: {}, id: mockClientId} as unknown as RegisteredClient;

      apiClient.context = {clientType: ClientType.PERMANENT, clientId: mockClientId, userId: ''};

      const mockedClientPublicKey = new Uint8Array();

      jest.spyOn(coreCrypto, 'publicKey').mockResolvedValueOnce(mockedClientPublicKey);
      jest.spyOn(apiClient.api.client, 'putClient').mockResolvedValueOnce(undefined);
      jest.spyOn(apiClient.api.client, 'getMLSKeyPackageCount').mockResolvedValueOnce(mlsService.config.nbKeyPackages);

      const config = {...defaultMLSInitConfig};

      await mlsService.initClient(mockUserId, mockClient, config);

      expect(transactionContext.mlsInit).toHaveBeenCalledWith(expect.any(ClientId), expectedMlsTransport);

      expect(mlsService.config.nbKeyPackages).toEqual(100);
    });

    it('uses the config provided by the consumer', async () => {
      const [mlsService, {apiClient, coreCrypto, transactionContext}] = await createMLSService();

      const mockUserId = {...createUserId(), domain: 'local.zinfra.io'};
      const mockClientId = validClientId;
      const mockClient = {mls_public_keys: {}, id: mockClientId} as unknown as RegisteredClient;

      apiClient.context = {clientType: ClientType.PERMANENT, clientId: mockClientId, userId: ''};

      const mockedClientPublicKey = new Uint8Array();

      jest.spyOn(coreCrypto, 'publicKey').mockResolvedValueOnce(mockedClientPublicKey);
      jest.spyOn(apiClient.api.client, 'putClient').mockResolvedValueOnce(undefined);
      jest.spyOn(apiClient.api.client, 'getMLSKeyPackageCount').mockResolvedValueOnce(mlsService.config.nbKeyPackages);

      const config = {...defaultMLSInitConfig, nbKeyPackages: 40, keyingMaterialUpdateThreshold: TimeInMillis.DAY};

      await mlsService.initClient(mockUserId, mockClient, config);

      expect(transactionContext.mlsInit).toHaveBeenCalledWith(expect.any(ClientId), expectedMlsTransport);

      expect(mlsService.config).toEqual({...config, signatureAlgorithm: MLSPublicKeyAlgorithmKeys.ED25519});
    });

    it('uses the default config value when provided with undefined by the consumer', async () => {
      const [mlsService, {apiClient, transactionContext, coreCrypto}] = await createMLSService();

      const mockUserId = {...createUserId(), domain: 'local.zinfra.io'};
      const mockClientId = validClientId;
      const mockClient = {mls_public_keys: {}, id: mockClientId} as unknown as RegisteredClient;

      apiClient.context = {clientType: ClientType.PERMANENT, clientId: mockClientId, userId: ''};

      const mockedClientPublicKey = new Uint8Array();

      jest.spyOn(coreCrypto, 'publicKey').mockResolvedValueOnce(mockedClientPublicKey);
      jest.spyOn(apiClient.api.client, 'putClient').mockResolvedValueOnce(undefined);
      jest.spyOn(apiClient.api.client, 'getMLSKeyPackageCount').mockResolvedValueOnce(mlsService.config.nbKeyPackages);

      const config = {
        ...defaultMLSInitConfig,
        nbKeyPackages: undefined,
        keyingMaterialUpdateThreshold: TimeInMillis.DAY,
      };

      await mlsService.initClient(mockUserId, mockClient, config);

      expect(transactionContext.mlsInit).toHaveBeenCalledWith(expect.any(ClientId), expectedMlsTransport);

      expect(mlsService.config).toEqual({
        ...config,
        nbKeyPackages: 100,
        signatureAlgorithm: MLSPublicKeyAlgorithmKeys.ED25519,
      });
    });

    it.each([100, 1000])(
      'uploads %s initial key packages after registering the public key without requiring recovery',
      async amount => {
        const [mlsService, {apiClient, transactionContext, coreCrypto, coreDatabase}] = await createMLSService();
        await coreDatabase.clear('mlsConversationRecovery');
        const onRecoveryRequired = jest.fn();
        mlsService.on(MLSServiceEvents.MLS_CONVERSATION_RECOVERY_REQUIRED, onRecoveryRequired);

        const mockUserId = {...createUserId(), domain: 'local.zinfra.io'};
        const mockClientId = validClientId;
        const mockClient = {mls_public_keys: {}, id: mockClientId} as unknown as RegisteredClient;

        apiClient.context = {clientType: ClientType.PERMANENT, clientId: mockClientId, userId: ''};

        let publicKeyRegistered = false;
        jest.spyOn(apiClient.api.client, 'putClient').mockImplementationOnce(async () => {
          publicKeyRegistered = true;
        });
        const generateKeyPackages = jest
          .spyOn(mlsService, 'clientKeypackages')
          .mockResolvedValueOnce([new Uint8Array([1, 2, 3])]);
        jest.spyOn(apiClient.api.client, 'uploadMLSKeyPackages').mockImplementationOnce(async () => {
          expect(publicKeyRegistered).toBe(true);
        });
        jest.spyOn(Helper, 'getMLSDeviceStatus').mockReturnValueOnce(Helper.MLSDeviceStatus.FRESH);
        jest.spyOn(coreCrypto, 'publicKey').mockResolvedValue(new Uint8Array());

        await mlsService.initClient(mockUserId, mockClient, {
          ...defaultMLSInitConfig,
          getNbKeyPackages: () => {
            return amount;
          },
        });

        expect(transactionContext.mlsInit).toHaveBeenCalled();
        expect(apiClient.api.client.putClient).toHaveBeenCalledWith(mockClientId, expect.anything());
        expect(generateKeyPackages).toHaveBeenCalledWith(amount);
        expect(apiClient.api.client.uploadMLSKeyPackages).toHaveBeenCalledWith(mockClientId, ['AQID']);
        expect(await mlsService.isMLSConversationRecoveryRequired()).toBe(false);
        expect(onRecoveryRequired).not.toHaveBeenCalled();
      },
    );

    it('defers fresh client registration and key package upload when E2EI enrollment is required', async () => {
      const [mlsService, {apiClient, coreCrypto}] = await createMLSService();
      const mockClient = {mls_public_keys: {}, id: validClientId} as RegisteredClient;
      jest.spyOn(Helper, 'getMLSDeviceStatus').mockReturnValueOnce(Helper.MLSDeviceStatus.FRESH);
      jest.spyOn(coreCrypto, 'publicKey').mockResolvedValue(new Uint8Array());
      const putClient = jest.spyOn(apiClient.api.client, 'putClient');
      const uploadKeyPackages = jest.spyOn(apiClient.api.client, 'uploadMLSKeyPackages');

      await mlsService.initClient(createUserId(), mockClient, {...defaultMLSInitConfig, skipInitIdentity: true});

      expect(putClient).not.toHaveBeenCalled();
      expect(uploadKeyPackages).not.toHaveBeenCalled();
    });

    it('uploads key packages if there are not enough keys on backend', async () => {
      const [mlsService, {apiClient, transactionContext, coreCrypto}] = await createMLSService();

      const mockUserId = {...createUserId(), domain: 'local.zinfra.io'};
      const mockClientId = validClientId;

      const mockClient = {mls_public_keys: {ed25519: 'key'}, id: mockClientId} as unknown as RegisteredClient;

      apiClient.context = {clientType: ClientType.PERMANENT, clientId: mockClientId, userId: ''};

      jest.spyOn(mlsService, 'clientKeypackages').mockResolvedValueOnce([new Uint8Array()]);
      jest.spyOn(coreCrypto, 'publicKey').mockResolvedValueOnce(new Uint8Array());
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

      const mockUserId = {...createUserId(), domain: 'local.zinfra.io'};
      const mockClientId = validClientId;
      const mockClient = {mls_public_keys: {ed25519: 'key'}, id: mockClientId} as unknown as RegisteredClient;

      apiClient.context = {clientType: ClientType.PERMANENT, clientId: mockClientId, userId: ''};

      jest.spyOn(apiClient.api.client, 'getClient').mockResolvedValueOnce(mockClient);

      jest.spyOn(apiClient.api.client, 'getMLSKeyPackageCount').mockResolvedValueOnce(mlsService.config.nbKeyPackages);
      jest.spyOn(apiClient.api.client, 'uploadMLSKeyPackages');
      jest.spyOn(apiClient.api.client, 'putClient');

      jest.spyOn(coreCrypto, 'publicKey').mockResolvedValueOnce(new Uint8Array());

      await mlsService.initClient(mockUserId, mockClient, defaultMLSInitConfig);

      expect(transactionContext.mlsInit).toHaveBeenCalled();
      expect(apiClient.api.client.uploadMLSKeyPackages).not.toHaveBeenCalled();
      expect(apiClient.api.client.putClient).not.toHaveBeenCalled();
    });
  });

  describe('CoreCrypto key package APIs', () => {
    it('generates and serializes the requested number of key packages', async () => {
      const [mlsService, {transactionContext}] = await createMLSService();
      transactionContext.generateKeyPackage
        .mockResolvedValueOnce(createKeyPackage(new Uint8Array([1])))
        .mockResolvedValueOnce(createKeyPackage(new Uint8Array([2])));

      await expect(mlsService.clientKeypackages(2)).resolves.toEqual([new Uint8Array([1]), new Uint8Array([2])]);
      expect(transactionContext.generateKeyPackage).toHaveBeenCalledTimes(2);
      expect(transactionContext.generateKeyPackage).toHaveBeenCalledWith(expect.anything());
    });

    it('counts only valid key packages for the active credential type and cipher suite', async () => {
      const [mlsService, {transactionContext}] = await createMLSService();
      transactionContext.getKeyPackages.mockResolvedValue([
        createKeyPackageRef(),
        createKeyPackageRef({isValid: false}),
        createKeyPackageRef({credentialType: CredentialType.X509}),
        createKeyPackageRef({cipherSuite: Ciphersuite.Mls128Dhkemp256Aes128gcmSha256P256}),
      ]);

      await expect(mlsService.clientValidKeypackagesCount()).resolves.toBe(1);
    });
  });

  describe('migration key package allowance', () => {
    it.each([
      [true, 999, true],
      [true, 1000, false],
      [false, 499, true],
      [false, 500, false],
      [false, 501, false],
    ])('startup=%s, backend count=%s, uploads=%s', async (startup, count, uploads) => {
      const [mlsService, {apiClient, coreCrypto}] = await createMLSService();
      mlsService.config.getNbKeyPackages = () => {
        return 1000;
      };
      jest.spyOn(apiClient.api.client, 'getMLSKeyPackageCount').mockResolvedValue(count);
      const generateKeyPackages = jest.spyOn(mlsService, 'clientKeypackages').mockResolvedValue([new Uint8Array()]);
      const upload = jest.spyOn(apiClient.api.client, 'uploadMLSKeyPackages').mockResolvedValue(undefined);

      if (startup) {
        jest.spyOn(Helper, 'getMLSDeviceStatus').mockReturnValueOnce(Helper.MLSDeviceStatus.REGISTERED);
        jest.spyOn(coreCrypto, 'publicKey').mockResolvedValue(new Uint8Array());
        await mlsService.initClient(createUserId(), {id: '0000000000000001'} as RegisteredClient, {
          ...defaultMLSInitConfig,
          getNbKeyPackages: () => {
            return 1000;
          },
        });
      } else {
        await mlsService['verifyRemoteMLSKeyPackagesAmount']('client-1');
      }

      expect(upload).toHaveBeenCalledTimes(uploads ? 1 : 0);
      if (uploads) {
        expect(generateKeyPackages).toHaveBeenCalledWith(1000);
      }
    });

    it('uses the latest allowance on subsequent checks', async () => {
      const [mlsService, {apiClient}] = await createMLSService();
      let allowance = 1000;
      mlsService.config.getNbKeyPackages = () => {
        return allowance;
      };
      jest.spyOn(apiClient.api.client, 'getMLSKeyPackageCount').mockResolvedValueOnce(999).mockResolvedValue(49);
      const generateKeyPackages = jest.spyOn(mlsService, 'clientKeypackages').mockResolvedValue([new Uint8Array()]);
      jest.spyOn(apiClient.api.client, 'uploadMLSKeyPackages').mockResolvedValue(undefined);
      await mlsService.refreshKeyPackages('client-1');
      allowance = 100;
      await mlsService.refreshKeyPackages('client-1');
      expect(generateKeyPackages.mock.calls.map(call => call[0])).toEqual([1000, 100]);
    });

    it('checks enrolled E2EI clients at startup even when identity initialization is skipped', async () => {
      const [mlsService, {apiClient, coreCrypto}] = await createMLSService();
      jest.spyOn(Helper, 'getMLSDeviceStatus').mockReturnValueOnce(Helper.MLSDeviceStatus.REGISTERED);
      jest.spyOn(coreCrypto, 'publicKey').mockResolvedValue(new Uint8Array());
      jest.spyOn(coreCrypto, 'findCredentials').mockImplementation(async ({credentialType}) => {
        return credentialType === CredentialType.X509
          ? [createCredentialRef(CredentialType.X509)]
          : [createCredentialRef(CredentialType.Basic)];
      });
      jest.spyOn(apiClient.api.client, 'getMLSKeyPackageCount').mockResolvedValue(999);
      const generateKeyPackages = jest.spyOn(mlsService, 'clientKeypackages').mockResolvedValue([new Uint8Array()]);
      const upload = jest.spyOn(apiClient.api.client, 'uploadMLSKeyPackages').mockResolvedValue(undefined);

      await mlsService.initClient(createUserId(), {id: '0000000000000001'} as RegisteredClient, {
        ...defaultMLSInitConfig,
        getNbKeyPackages: () => {
          return 1000;
        },
        skipInitIdentity: true,
      });

      expect(upload).toHaveBeenCalledTimes(1);
      expect(generateKeyPackages).toHaveBeenCalledWith(1000);
    });

    it('defers policy-change uploads until identity enrollment completes', async () => {
      const [mlsService, {apiClient}] = await createMLSService();
      mlsService['initialKeyPackageUploadDeferred'] = true;
      const count = jest.spyOn(apiClient.api.client, 'getMLSKeyPackageCount');
      await mlsService.refreshKeyPackages('client-1');
      expect(count).not.toHaveBeenCalled();
    });
  });

  describe('MLS conversation recovery after key-package exhaustion', () => {
    it('persists recovery after uploading when the backend count is zero', async () => {
      const [mlsService, {apiClient, coreDatabase}] = await createMLSService();
      await coreDatabase.clear('mlsConversationRecovery');
      jest.spyOn(apiClient.api.client, 'getMLSKeyPackageCount').mockResolvedValueOnce(0);
      jest.spyOn(mlsService, 'clientKeypackages').mockResolvedValueOnce([new Uint8Array()]);
      jest.spyOn(apiClient.api.client, 'uploadMLSKeyPackages').mockImplementationOnce(async () => {
        expect(await mlsService.isMLSConversationRecoveryRequired()).toBe(false);
      });
      const emitSpy = jest.spyOn(mlsService, 'emit');

      await mlsService['verifyRemoteMLSKeyPackagesAmount']('client-1');

      expect(await mlsService.isMLSConversationRecoveryRequired()).toBe(true);
      expect(emitSpy).toHaveBeenCalledWith(MLSServiceEvents.MLS_CONVERSATION_RECOVERY_REQUIRED);
    });

    it('does not schedule recovery for a normal low-count refill', async () => {
      const [mlsService, {apiClient, coreDatabase}] = await createMLSService();
      await coreDatabase.clear('mlsConversationRecovery');
      jest.spyOn(apiClient.api.client, 'getMLSKeyPackageCount').mockResolvedValueOnce(1);
      jest.spyOn(mlsService, 'clientKeypackages').mockResolvedValueOnce([new Uint8Array()]);
      jest.spyOn(apiClient.api.client, 'uploadMLSKeyPackages').mockResolvedValueOnce(undefined);
      const emitSpy = jest.spyOn(mlsService, 'emit');

      await mlsService['verifyRemoteMLSKeyPackagesAmount']('client-1');

      expect(await mlsService.isMLSConversationRecoveryRequired()).toBe(false);
      expect(emitSpy).not.toHaveBeenCalledWith(MLSServiceEvents.MLS_CONVERSATION_RECOVERY_REQUIRED);
    });

    it('does not persist recovery and does not emit when the zero-count refill fails', async () => {
      const [mlsService, {apiClient, coreDatabase}] = await createMLSService();
      await coreDatabase.clear('mlsConversationRecovery');
      jest.spyOn(apiClient.api.client, 'getMLSKeyPackageCount').mockResolvedValueOnce(0);
      jest.spyOn(mlsService, 'clientKeypackages').mockResolvedValueOnce([new Uint8Array()]);
      jest.spyOn(apiClient.api.client, 'uploadMLSKeyPackages').mockRejectedValueOnce(new Error('upload failed'));
      const emitSpy = jest.spyOn(mlsService, 'emit');

      await expect(mlsService['verifyRemoteMLSKeyPackagesAmount']('client-1')).rejects.toThrow('upload failed');

      expect(await mlsService.isMLSConversationRecoveryRequired()).toBe(false);
      expect(emitSpy).not.toHaveBeenCalledWith(MLSServiceEvents.MLS_CONVERSATION_RECOVERY_REQUIRED);
    });

    it('does not fail refill when recovery marker persistence fails', async () => {
      const [mlsService, {apiClient, coreDatabase}] = await createMLSService();
      await coreDatabase.clear('mlsConversationRecovery');
      jest.spyOn(apiClient.api.client, 'getMLSKeyPackageCount').mockResolvedValueOnce(0);
      const generateKeyPackages = jest.spyOn(mlsService, 'clientKeypackages').mockResolvedValueOnce([new Uint8Array()]);
      coreDatabase.put = jest.fn().mockRejectedValueOnce(new Error('DB write failed')) as typeof coreDatabase.put;
      jest.spyOn(apiClient.api.client, 'uploadMLSKeyPackages').mockResolvedValueOnce(undefined);
      const emitSpy = jest.spyOn(mlsService, 'emit');

      await expect(mlsService['verifyRemoteMLSKeyPackagesAmount']('client-1')).resolves.toBeUndefined();

      expect(generateKeyPackages).toHaveBeenCalled();
      expect(apiClient.api.client.uploadMLSKeyPackages).toHaveBeenCalled();
      expect(await mlsService.isMLSConversationRecoveryRequired()).toBe(false);
      expect(emitSpy).not.toHaveBeenCalledWith(MLSServiceEvents.MLS_CONVERSATION_RECOVERY_REQUIRED);
    });

    it('resumes persisted recovery after restart when packages are already available', async () => {
      const [mlsService, {apiClient, coreDatabase}] = await createMLSService();
      await coreDatabase.put('mlsConversationRecovery', {required: true}, 'required');
      jest.spyOn(apiClient.api.client, 'getMLSKeyPackageCount').mockResolvedValueOnce(mlsService.config.nbKeyPackages);
      jest.spyOn(apiClient.api.client, 'uploadMLSKeyPackages');
      const emitSpy = jest.spyOn(mlsService, 'emit');

      expect(await mlsService.prepareMLSConversationRecovery('client-1')).toBe(true);

      expect(apiClient.api.client.uploadMLSKeyPackages).not.toHaveBeenCalled();
      expect(emitSpy).toHaveBeenCalledWith(MLSServiceEvents.MLS_CONVERSATION_RECOVERY_REQUIRED);
    });

    it('clears recovery only when explicitly completed', async () => {
      const [mlsService, {coreDatabase}] = await createMLSService();
      await coreDatabase.put('mlsConversationRecovery', {required: true}, 'required');

      await mlsService.completeMLSConversationRecovery();

      expect(await mlsService.isMLSConversationRecoveryRequired()).toBe(false);
    });

    it('tracks pending conversation IDs during recovery', async () => {
      const [mlsService, {coreDatabase}] = await createMLSService();
      await coreDatabase.put('mlsConversationRecovery', {required: true}, 'required');

      const pendingIds = [
        {id: 'conv1', domain: 'domain.com'},
        {id: 'conv2', domain: 'domain.com'},
        {id: 'conv3', domain: 'domain.com'},
      ];
      await mlsService.updatePendingRecoveryConversationIds(pendingIds);

      expect(await mlsService.getPendingRecoveryConversationIds()).toEqual(pendingIds);
    });

    it('removes conversations from pending list as they are recovered', async () => {
      const [mlsService, {coreDatabase}] = await createMLSService();
      await coreDatabase.put('mlsConversationRecovery', {required: true}, 'required');
      const initialPendingIds = [
        {id: 'conv1', domain: 'domain.com'},
        {id: 'conv2', domain: 'domain.com'},
        {id: 'conv3', domain: 'domain.com'},
      ];
      await mlsService.updatePendingRecoveryConversationIds(initialPendingIds);

      const updatedPendingIds = initialPendingIds.filter(({id}) => {
        return id !== 'conv2';
      });
      await mlsService.updatePendingRecoveryConversationIds(updatedPendingIds);

      expect(await mlsService.getPendingRecoveryConversationIds()).toEqual([
        {id: 'conv1', domain: 'domain.com'},
        {id: 'conv3', domain: 'domain.com'},
      ]);
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

  describe('pending proposals lifecycle', () => {
    afterEach(() => {
      jest.restoreAllMocks();
    });

    it('commits pending proposals once and clears the persisted task', async () => {
      const [mlsService, {coreCrypto, transactionContext, coreDatabase}] = await createMLSService();
      const groupId = 'mXOagqRIX/RFd7QyXJA8/Ed8X+hvQgLXIiwYHm4OQFc=';
      const firingDate = 1_798_000_000_000;

      await coreDatabase.put('pendingProposals', {groupId, firingDate}, groupId);
      coreCrypto.conversationExists.mockResolvedValue(true);

      await mlsService.commitPendingProposals(groupId);

      expect(coreCrypto.transaction).toHaveBeenCalledTimes(1);
      expect(transactionContext.commitPendingProposals).toHaveBeenCalledTimes(1);
      await expect(coreDatabase.get('pendingProposals', groupId)).resolves.toBeUndefined();
    });

    it('leaves replay to the recovery orchestrator after a rejected transaction', async () => {
      const [mlsService, {coreCrypto, transactionContext, coreDatabase}] = await createMLSService();
      const groupId = 'mXOagqRIX/RFd7QyXJA8/Ed8X+hvQgLXIiwYHm4OQFc=';
      const firingDate = 1_798_000_000_000;
      const rejection = CoreCryptoError.Mls.new({
        mlsError: MlsError.MessageRejected.new({
          reason: serializeAbortReason({message: UPLOAD_COMMIT_BUNDLE_ABORT_REASONS.MLS_STALE_MESSAGE}),
        }),
      });

      await coreDatabase.put('pendingProposals', {groupId, firingDate}, groupId);
      coreCrypto.conversationExists.mockResolvedValue(true);
      transactionContext.commitPendingProposals.mockRejectedValue(rejection);

      await expect(mlsService.commitPendingProposals(groupId)).rejects.toBe(rejection);

      expect(coreCrypto.transaction).toHaveBeenCalledTimes(1);
      expect(transactionContext.commitPendingProposals).toHaveBeenCalledTimes(1);
      await expect(coreDatabase.get('pendingProposals', groupId)).resolves.toEqual({groupId, firingDate});
    });

    it('retries a failed immediate proposal commit only after processing incoming MLS state', async () => {
      const [mlsService, {coreCrypto, transactionContext, coreDatabase}] = await createMLSService();
      const groupId = 'mXOagqRIX/RFd7QyXJA8/Ed8X+hvQgLXIiwYHm4OQFc=';
      const firingDate = 1_798_000_000_000;
      const scheduledTasks: Array<() => Promise<void> | void> = [];
      const rejection = CoreCryptoError.Mls.new({
        mlsError: MlsError.MessageRejected.new({
          reason: serializeAbortReason({message: UPLOAD_COMMIT_BUNDLE_ABORT_REASONS.MLS_STALE_MESSAGE}),
        }),
      });

      jest.spyOn(TaskScheduler, 'addTask').mockImplementation(({task}) => {
        scheduledTasks.push(task);
      });
      coreCrypto.conversationExists.mockResolvedValue(true);
      transactionContext.commitPendingProposals.mockRejectedValueOnce(rejection);

      await mlsService.handlePendingProposals({
        delayInMs: 0,
        eventTime: new Date(firingDate).toISOString(),
        groupId,
      });

      expect(scheduledTasks).toHaveLength(1);
      await scheduledTasks[0]?.();
      expect(transactionContext.commitPendingProposals).toHaveBeenCalledTimes(1);
      await expect(coreDatabase.get('pendingProposals', groupId)).resolves.toEqual({groupId, firingDate});

      transactionContext.decryptMessage.mockResolvedValue(
        DecryptedMessage.Commit.new({identity: mockWireIdentity, isActive: true}),
      );
      await mlsService.decryptMessage(new ConversationId(Decoder.fromBase64(groupId).asBytes), new Uint8Array(), {
        domain: 'example.com',
        id: randomUUID(),
      });

      expect(scheduledTasks).toHaveLength(2);
      expect(TaskScheduler.addTask).toHaveBeenLastCalledWith(expect.objectContaining({firingDate}));

      await scheduledTasks[1]?.();
      expect(transactionContext.commitPendingProposals).toHaveBeenCalledTimes(2);
      await expect(coreDatabase.get('pendingProposals', groupId)).resolves.toBeUndefined();
    });

    it('skips commit and clears pending task when local conversation is missing', async () => {
      const [mlsService, {coreCrypto, transactionContext}] = await createMLSService();
      const groupId = 'mXOagqRIX/RFd7QyXJA8/Ed8X+hvQgLXIiwYHm4OQFc=';

      coreCrypto.conversationExists = jest.fn().mockResolvedValue(false);

      jest.spyOn(TaskScheduler, 'cancelTask');

      await mlsService.commitPendingProposals(groupId);

      expect(coreCrypto.transaction).not.toHaveBeenCalled();
      expect(transactionContext.commitPendingProposals).not.toHaveBeenCalled();
      expect(TaskScheduler.cancelTask).toHaveBeenCalledWith(expect.stringContaining(groupId));
    });

    it('prunes stale pending proposal tasks on startup rehydration', async () => {
      const [mlsService, {coreCrypto, coreDatabase}] = await createMLSService();
      const groupId = 'mXOagqRIX/RFd7QyXJA8/Ed8X+hvQgLXIiwYHm4OQFc=';

      await coreDatabase.put('pendingProposals', {groupId, firingDate: Date.now() - 1_000}, groupId);
      coreCrypto.conversationExists = jest.fn().mockResolvedValue(false);

      jest.spyOn(TaskScheduler, 'addTask');

      await mlsService.initialisePendingProposalsTasks();

      expect(TaskScheduler.addTask).not.toHaveBeenCalled();
      await expect(coreDatabase.get('pendingProposals', groupId)).resolves.toBeUndefined();
    });

    it('rehydrates pending proposal task when local conversation exists', async () => {
      const [mlsService, {coreCrypto, coreDatabase}] = await createMLSService();
      const groupId = 'mXOagqRIX/RFd7QyXJA8/Ed8X+hvQgLXIiwYHm4OQFc=';
      const firingDate = Date.now() + 5_000;

      await coreDatabase.put('pendingProposals', {groupId, firingDate}, groupId);
      coreCrypto.conversationExists = jest.fn().mockResolvedValue(true);

      jest.spyOn(TaskScheduler, 'addTask');

      await mlsService.initialisePendingProposalsTasks();

      expect(TaskScheduler.addTask).toHaveBeenCalledWith(
        expect.objectContaining({
          firingDate,
          key: expect.stringContaining(groupId),
        }),
      );
    });
  });

  describe('handleMLSMessageAddEvent', () => {
    afterEach(() => {
      jest.useRealTimers();
    });

    it('decrypts a message', async () => {
      const [mlsService, {transactionContext, coreCrypto}] = await createMLSService();

      const mockGroupId = 'mXOagqRIX/RFd7QyXJA8/Ed8X+hvQgLXIiwYHm3OQFc=';
      const mockedNewEpoch = 3;

      const getGroupIdFromConversationId = (): Promise<string> => {
        return Promise.resolve(mockGroupId);
      };

      const mockedDecryptoedMessage = DecryptedMessage.Commit.new({identity: mockWireIdentity, isActive: false});

      jest.spyOn(transactionContext, 'decryptMessage').mockResolvedValueOnce(mockedDecryptoedMessage);
      jest.spyOn(coreCrypto, 'conversationEpoch').mockResolvedValueOnce(BigInt(mockedNewEpoch));

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
      const commitDelay = 1n;

      const getGroupIdFromConversationId = (): Promise<string> => {
        return Promise.resolve(mockGroupId);
      };

      const mockedDecryptoedMessage = DecryptedMessage.Proposal.new({
        delay: commitDelay,
        identity: mockWireIdentity,
      });

      jest.spyOn(transactionContext, 'decryptMessage').mockResolvedValueOnce(mockedDecryptoedMessage);
      jest.spyOn(coreCrypto, 'conversationEpoch').mockResolvedValueOnce(BigInt(mockedNewEpoch));

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

      jest.advanceTimersByTime(Number(commitDelay) * TimeInMillis.SECOND);
      expect(transactionContext.decryptMessage).toHaveBeenCalled();
    });

    it('Throws if decryption fails', async () => {
      const [mlsService, {transactionContext}] = await createMLSService();

      const mockGroupId = 'mXOagqRIX/RFd7QyXJA8/Ed8X+hvQgLXIiwYHm3OQFc=';
      const getGroupIdFromConversationId = (): Promise<string> => {
        return Promise.resolve(mockGroupId);
      };
      const wrongEpochError = CoreCryptoError.Mls.new({mlsError: MlsError.WrongEpoch.new()});
      jest.spyOn(transactionContext, 'decryptMessage').mockRejectedValueOnce(wrongEpochError);

      const mockedMLSMessageAddEvent: ConversationMLSMessageAddEvent = {
        type: CONVERSATION_EVENT.MLS_MESSAGE_ADD,
        senderClientId: '',
        conversation: '',
        data: mockedMLSWelcomeEventData,
        from: '',
        time: '',
      };

      await expect(
        mlsService.handleMLSMessageAddEvent(mockedMLSMessageAddEvent, getGroupIdFromConversationId),
      ).rejects.toBe(wrongEpochError);

      expect(transactionContext.decryptMessage).toHaveBeenCalled();
    });
  });

  describe('updateKeyingMaterialForConversation', () => {
    it('updates keying material in a core crypto transaction', async () => {
      const [mlsService, {transactionContext}] = await createMLSService();
      const groupId = 'mXOagqRIX/RFd7QyXJA8/Ed8X+hvQgLXIiwYHm4OQFc=';

      await mlsService.updateKeyingMaterialForConversation(groupId);

      expect(transactionContext.updateKeyingMaterial).toHaveBeenCalledWith(expect.any(ConversationId));
    });

    it('propagates the failure to the caller instead of retrying internally', async () => {
      const [mlsService, {transactionContext}] = await createMLSService();
      const groupId = 'mXOagqRIX/RFd7QyXJA8/Ed8X+hvQgLXIiwYHm4OQFc=';
      const error = new Error('commit rejected');

      jest.spyOn(transactionContext, 'updateKeyingMaterial').mockRejectedValue(error);

      // Fake timers are installed only once the service is built, as building it awaits the db
      jest.useFakeTimers();
      try {
        await expect(mlsService.updateKeyingMaterialForConversation(groupId)).rejects.toThrow(error);

        // A stale commit cannot succeed on a second attempt, so nothing must be scheduled for later
        jest.runAllTimers();
        expect(transactionContext.updateKeyingMaterial).toHaveBeenCalledTimes(1);
      } finally {
        jest.useRealTimers();
      }
    });

    it('does not emit a key material update failure event, so the error is handled by the caller', async () => {
      const [mlsService, {transactionContext}] = await createMLSService();
      const groupId = 'mXOagqRIX/RFd7QyXJA8/Ed8X+hvQgLXIiwYHm4OQFc=';
      const onFailure = jest.fn();

      mlsService.on(MLSServiceEvents.KEY_MATERIAL_UPDATE_FAILURE, onFailure);
      jest.spyOn(transactionContext, 'updateKeyingMaterial').mockRejectedValue(new Error('commit rejected'));

      await expect(mlsService.updateKeyingMaterialForConversation(groupId)).rejects.toThrow('commit rejected');

      expect(onFailure).not.toHaveBeenCalled();
    });
  });

  describe('renewKeyMaterial', () => {
    it('emits a key material update failure event when the renewal fails', async () => {
      const [mlsService, {transactionContext}] = await createMLSService();
      const groupId = 'mXOagqRIX/RFd7QyXJA8/Ed8X+hvQgLXIiwYHm4OQFc=';
      const error = new Error('commit rejected');
      const onFailure = jest.fn();

      mlsService.on(MLSServiceEvents.KEY_MATERIAL_UPDATE_FAILURE, onFailure);
      jest.spyOn(mlsService, 'conversationExists').mockResolvedValue(true);
      jest.spyOn(transactionContext, 'updateKeyingMaterial').mockRejectedValue(error);

      // The renewal runs from a scheduled task, so it must not reject
      await expect(mlsService.renewKeyMaterial(groupId)).resolves.toBeUndefined();

      expect(onFailure).toHaveBeenCalledWith({error, groupId});
    });
  });

  describe('handleMLSWelcomeMessageEvent', () => {
    it.each([
      [499, true, true],
      [500, true, false],
      [501, false, false],
    ])(
      'checks the migration allowance on welcome: local=%s, checks backend=%s, uploads=%s',
      async (count, checksBackend, uploads) => {
        const [mlsService, {apiClient, transactionContext}] = await createMLSService();
        mlsService.config.getNbKeyPackages = () => {
          return 1000;
        };
        jest.spyOn(mlsService, 'clientValidKeypackagesCount').mockResolvedValue(count);
        const generateKeyPackages = jest.spyOn(mlsService, 'clientKeypackages').mockResolvedValue([new Uint8Array()]);
        transactionContext.processWelcomeMessage.mockResolvedValue(new ConversationId(new Uint8Array()));
        jest.spyOn(mlsService, 'scheduleKeyMaterialRenewal').mockImplementation(jest.fn());
        const getRemoteCount = jest.spyOn(apiClient.api.client, 'getMLSKeyPackageCount').mockResolvedValue(count);
        const upload = jest.spyOn(apiClient.api.client, 'uploadMLSKeyPackages').mockResolvedValue(undefined);

        await mlsService.handleMLSWelcomeMessageEvent(
          {
            type: CONVERSATION_EVENT.MLS_WELCOME_MESSAGE,
            conversation: '',
            data: mockedMLSWelcomeEventData,
            from: '',
            time: '',
          },
          'client-1',
        );

        expect(getRemoteCount).toHaveBeenCalledTimes(checksBackend ? 1 : 0);
        expect(upload).toHaveBeenCalledTimes(uploads ? 1 : 0);
        if (uploads) {
          expect(generateKeyPackages).toHaveBeenCalledWith(1000);
        }
        expect(transactionContext.processWelcomeMessage).toHaveBeenCalled();
      },
    );

    it('uses allowance changes for local welcome checks without reinitializing', async () => {
      const [mlsService, {apiClient, transactionContext}] = await createMLSService();
      let allowance = 100;
      mlsService.config.getNbKeyPackages = () => {
        return allowance;
      };
      jest.spyOn(mlsService, 'clientValidKeypackagesCount').mockResolvedValue(200);
      jest.spyOn(mlsService, 'clientKeypackages').mockResolvedValue([new Uint8Array()]);
      transactionContext.processWelcomeMessage.mockResolvedValue(new ConversationId(new Uint8Array()));
      jest.spyOn(mlsService, 'scheduleKeyMaterialRenewal').mockImplementation(jest.fn());
      const getRemoteCount = jest.spyOn(apiClient.api.client, 'getMLSKeyPackageCount').mockResolvedValue(200);
      const upload = jest.spyOn(apiClient.api.client, 'uploadMLSKeyPackages').mockResolvedValue(undefined);
      const event: ConversationMLSWelcomeEvent = {
        type: CONVERSATION_EVENT.MLS_WELCOME_MESSAGE,
        conversation: '',
        data: mockedMLSWelcomeEventData,
        from: '',
        time: '',
      };

      await mlsService.handleMLSWelcomeMessageEvent(event, 'client-1');
      expect(getRemoteCount).not.toHaveBeenCalled();
      allowance = 1000;
      await mlsService.handleMLSWelcomeMessageEvent(event, 'client-1');
      expect(getRemoteCount).toHaveBeenCalledTimes(1);
      expect(upload).toHaveBeenCalledTimes(1);
      allowance = 100;
      await mlsService.handleMLSWelcomeMessageEvent(event, 'client-1');
      expect(getRemoteCount).toHaveBeenCalledTimes(1);
      expect(upload).toHaveBeenCalledTimes(1);
    });

    it("before processing welcome it verifies that there's enough key packages locally", async () => {
      const [mlsService, {apiClient, transactionContext}] = await createMLSService();

      const mockClientId = 'client-1';
      const mockClient = {mls_public_keys: {ed25519: 'key'}, id: mockClientId} as unknown as RegisteredClient;

      apiClient.context = {clientType: ClientType.PERMANENT, clientId: mockClientId, userId: ''};

      jest.spyOn(mlsService, 'clientKeypackages').mockResolvedValueOnce([new Uint8Array()]);

      const numberOfKeysBelowThreshold = mlsService['minRequiredKeyPackages'] - 1;
      jest.spyOn(apiClient.api.client, 'getMLSKeyPackageCount').mockResolvedValueOnce(numberOfKeysBelowThreshold);
      jest.spyOn(mlsService, 'clientValidKeypackagesCount').mockResolvedValue(numberOfKeysBelowThreshold);

      jest.spyOn(apiClient.api.client, 'uploadMLSKeyPackages').mockResolvedValueOnce(undefined);
      jest.spyOn(transactionContext, 'processWelcomeMessage').mockResolvedValue(new ConversationId(new Uint8Array()));

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

      jest.spyOn(mlsService, 'clientKeypackages').mockResolvedValueOnce([new Uint8Array()]);

      const numberOfKeysAboveThreshold = mlsService['minRequiredKeyPackages'] + 1;
      jest.spyOn(mlsService, 'clientValidKeypackagesCount').mockResolvedValue(numberOfKeysAboveThreshold);
      jest.spyOn(apiClient.api.client, 'getMLSKeyPackageCount').mockResolvedValueOnce(numberOfKeysAboveThreshold);

      jest.spyOn(apiClient.api.client, 'uploadMLSKeyPackages').mockResolvedValueOnce(undefined);
      jest.spyOn(transactionContext, 'processWelcomeMessage').mockResolvedValue(new ConversationId(new Uint8Array()));

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

      jest.spyOn(mlsService, 'clientKeypackages').mockResolvedValueOnce([new Uint8Array()]);

      const numberOfKeysBelowThreshold = mlsService['minRequiredKeyPackages'] - 1;
      const numberOfKeysAboveThreshold = mlsService['minRequiredKeyPackages'] + 1;

      jest.spyOn(mlsService, 'clientValidKeypackagesCount').mockResolvedValue(numberOfKeysBelowThreshold);
      jest.spyOn(apiClient.api.client, 'getMLSKeyPackageCount').mockResolvedValueOnce(numberOfKeysAboveThreshold);

      jest.spyOn(apiClient.api.client, 'uploadMLSKeyPackages').mockResolvedValueOnce(undefined);
      jest.spyOn(transactionContext, 'processWelcomeMessage').mockResolvedValue(new ConversationId(new Uint8Array()));

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

      const conversationAlreadyExistsError = CoreCryptoError.Mls.new({
        mlsError: MlsError.ConversationAlreadyExists.new({conversationId: new Uint8Array()}),
      });

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
