/*
 * Wire
 * Copyright (C) 2023 Wire Swiss GmbH
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

import {createFireAndForgetInvoker} from '@enormora/fire-and-forget';
import {TimeInMillis} from '@wireapp/commons/lib/util/TimeUtil';
import axios from 'axios';
import {task} from 'true-myth';

import {APIClient} from '@wireapp/api-client';
import {
  CoreCrypto,
  CoreCryptoContext,
  CredentialType,
  DeviceStatus,
  HttpMethod,
  PkiEnvironment,
  type PkiEnvironmentHooks,
  Uuid,
  WireIdentity,
} from '@wireapp/core-crypto';

import {E2EIServiceExternal} from './e2eiServiceExternal';

import {createPkiEnvironment} from '../../proteus/proteusService/cryptoClient/coreCryptoWrapper';
import {ClientService} from '../../../client';
import {openDB} from '../../../storage/coreDb';
import {getUUID} from '../../../test/payloadHelper';
import {parseFullQualifiedClientId} from '../../../util/fullyQualifiedClientIdUtils';
import {stringifyQualifiedId} from '../../../util/qualifiedIdUtil';
import {RecurringTaskScheduler} from '../../../util/recurringTaskScheduler';
import {MLSService} from '../mlsService';
import {createMLSClientId} from '../utils/mlsId';

jest.mock('../../proteus/proteusService/cryptoClient/coreCryptoWrapper', () => {
  return {createPkiEnvironment: jest.fn()};
});

const createPkiEnvironmentMock = createPkiEnvironment as jest.MockedFunction<typeof createPkiEnvironment>;

type InitializedService = E2EIServiceTestSetup[1] & {
  readonly authenticate: jest.Mock;
  readonly hooks: PkiEnvironmentHooks;
  readonly service: E2EIServiceExternal;
};

type E2EIServiceTestSetup = readonly [
  E2EIServiceExternal,
  {
    readonly apiClient: jest.Mocked<APIClient>;
    readonly coreCrypto: jest.Mocked<CoreCrypto>;
    readonly mlsService: MLSService;
    readonly pkiEnvironment: jest.Mocked<PkiEnvironment>;
    readonly recurringTaskScheduler: RecurringTaskScheduler;
    readonly transactionContext: jest.Mocked<CoreCryptoContext>;
  },
];

async function buildE2EIService(dbName = 'core-test-db'): Promise<E2EIServiceTestSetup> {
  const transactionContext = {
    checkCredentials: jest.fn().mockResolvedValue(undefined),
  } as unknown as jest.Mocked<CoreCryptoContext>;

  const coreCrypto = {
    getUserIdentities: jest.fn(),
    getClientIds: jest.fn().mockResolvedValue([]),
    getPkiEnvironment: jest.fn().mockResolvedValue(undefined),
    transaction: jest.fn(fn => {
      return fn(transactionContext);
    }),
  } as unknown as jest.Mocked<CoreCrypto>;

  const apiClient = {
    validatedClientId: 'client-id',
    api: {
      client: {
        getNonce: jest.fn(),
        getAccessToken: jest.fn(),
      },
    },
  } as unknown as jest.Mocked<APIClient>;

  const clientService = {} as jest.Mocked<ClientService>;

  const mockedDb = await openDB(dbName);

  const mockedMLSService = {
    on: jest.fn(),
    getClientIds: jest.fn(),
    conversationExists: jest.fn(),
  } as unknown as MLSService;

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

  const pkiEnvironment = {
    addTrustAnchor: jest.fn(),
    addIntermediateCert: jest.fn(),
    getTrustAnchors: jest.fn().mockResolvedValue([]),
  } as unknown as jest.Mocked<PkiEnvironment>;

  createPkiEnvironmentMock.mockImplementation(() => {
    // Mirrors `createPkiEnvironment` in coreCryptoWrapper, which sets the environment on CoreCrypto
    coreCrypto.getPkiEnvironment.mockResolvedValue(pkiEnvironment);
    return task.resolve(pkiEnvironment);
  });
  return [
    new E2EIServiceExternal(coreCrypto, apiClient, mockedDb, recurringTaskScheduler, clientService, mockedMLSService),
    {apiClient, coreCrypto, mlsService: mockedMLSService, pkiEnvironment, recurringTaskScheduler, transactionContext},
  ] as const;
}

function generateCoreCryptoIdentity({userId, deviceId = getUUID()}: {userId: string; deviceId?: string}): WireIdentity {
  return {
    clientId: createMLSClientId({id: userId, domain: 'elna.wire.link'}, deviceId),
    status: DeviceStatus.Valid,
    thumbprint: 'mNyAo88vAF5s7v0UWBNxlQKxP3dfT91A-4PbuzEA5uQ',
    credentialType: CredentialType.X509,
  };
}

const groupId = 'AAEAAhJrE+8TbFFUqiagedTYDUMAZWxuYS53aXJlLmxpbms=';

const discoveryUrl = 'https://some.crl.discovery.url';
const mockedRootCA = 'cert';
const federatedCerts = ['federatedCert1', 'federatedCert2'];
const axiosMock = axios as jest.Mocked<typeof axios>;

describe('E2EIServiceExternal', () => {
  beforeEach(() => {
    axiosMock.get = jest.fn(async url => {
      if (url === `${discoveryUrl}/roots.pem`) {
        return {data: mockedRootCA};
      }

      if (url === `${discoveryUrl}/federation`) {
        return {data: {crts: federatedCerts}};
      }

      return {data: null};
    }) as unknown as typeof axiosMock.get;
    axiosMock.request = jest.fn(async () => {
      return {status: 200, headers: {}, data: new ArrayBuffer(0)};
    }) as unknown as typeof axiosMock.request;
    axiosMock.create = jest.fn(() => {
      return axiosMock;
    }) as unknown as typeof axiosMock.create;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getUsersIdentities', () => {
    it('returns undefined if conversation does not exist', async () => {
      const [service, {mlsService}] = await buildE2EIService('usersIdentitiesNoConversation');
      const user1 = {domain: 'elna.wire.link', id: '48a1c3b0-4b0e-4bcd-93ad-64c7344b1534'};
      const user2 = {domain: 'elna.wire.link', id: 'b7d287e4-7bbd-40e0-a550-6b18dcaf5f31'};
      const userIds = [user1, user2];

      jest.spyOn(mlsService, 'conversationExists').mockResolvedValue(false);

      const userIdentities = await service.getUsersIdentities(groupId, userIds);

      expect(userIdentities?.get(stringifyQualifiedId(user1))).toEqual(undefined);
      expect(userIdentities?.get(stringifyQualifiedId(user2))).toEqual(undefined);
    });

    it('returns the user identities', async () => {
      const [service, {coreCrypto, mlsService}] = await buildE2EIService('usersIdentities');
      const user1 = {domain: 'elna.wire.link', id: '48a1c3b0-4b0e-4bcd-93ad-64c7344b1534'};
      const user2 = {domain: 'elna.wire.link', id: 'b7d287e4-7bbd-40e0-a550-6b18dcaf5f31'};
      const userIds = [user1, user2];

      coreCrypto.getUserIdentities.mockResolvedValue(
        new Map([
          [
            new Uuid(user1.id),
            [generateCoreCryptoIdentity({userId: user1.id}), generateCoreCryptoIdentity({userId: user1.id})],
          ],
          [new Uuid(user2.id), [generateCoreCryptoIdentity({userId: user2.id})]],
        ]),
      );

      jest.spyOn(mlsService, 'conversationExists').mockResolvedValue(true);

      const userIdentities = await service.getUsersIdentities(groupId, userIds);

      expect(userIdentities?.get(stringifyQualifiedId(user1))).toHaveLength(2);
      expect(userIdentities?.get(stringifyQualifiedId(user2))).toHaveLength(1);
    });

    it('returns MLS basic devices with empty identity', async () => {
      const [service, {coreCrypto, mlsService}] = await buildE2EIService('usersIdentitiesBasicDevices');
      const user1 = {domain: 'elna.wire.link', id: '48a1c3b0-4b0e-4bcd-93ad-64c7344b1534'};
      const user2 = {domain: 'elna.wire.link', id: 'b7d287e4-7bbd-40e0-a550-6b18dcaf5f31'};
      const userIds = [user1, user2];

      const user1Identities = [
        generateCoreCryptoIdentity({userId: user1.id}),
        generateCoreCryptoIdentity({userId: user1.id}),
      ];
      coreCrypto.getUserIdentities.mockResolvedValue(new Map([[new Uuid(user1.id), user1Identities]]));

      const allClients = [
        ...user1Identities.map(identity => {
          return new TextDecoder().decode(identity.clientId?.copyBytes());
        }),
        `${user1.id}:74a50c1f4352b41f@elna.wire.link`,
        `${user2.id}:452cb4c65f0369a8@elna.wire.link`,
      ];
      coreCrypto.getClientIds.mockResolvedValue(
        allClients.map(clientId => {
          const {user, client, domain} = parseFullQualifiedClientId(clientId);
          return createMLSClientId({id: user, domain}, client);
        }),
      );

      jest.spyOn(mlsService, 'conversationExists').mockResolvedValue(true);

      const userIdentities = await service.getUsersIdentities(groupId, userIds);

      expect(userIdentities?.get(stringifyQualifiedId(user1))).toHaveLength(3);
      expect(userIdentities?.get(stringifyQualifiedId(user2))).toHaveLength(1);
    });
  });

  describe('getAllGroupUsersIdentities', () => {
    it('returns undefined if mls group does not exist', async () => {
      const [service, {mlsService}] = await buildE2EIService('groupUsersIdentitiesNoGroup');
      const user1 = {
        domain: 'elna.wire.link',
        userId: '48a1c3b0-4b0e-4bcd-93ad-64c7344b1534',
        clientId: '74a50c1f4352b41f',
      };
      const user2 = {
        domain: 'elna.wire.link',
        userId: 'b7d287e4-7bbd-40e0-a550-6b18dcaf5f31',
        clientId: '452cb4c65f0369a8',
      };

      const clientIds = [user1, user2];

      jest.spyOn(mlsService, 'getClientIds').mockResolvedValue(clientIds);
      jest.spyOn(mlsService, 'conversationExists').mockResolvedValue(false);

      const userIdentities = await service.getAllGroupUsersIdentities(groupId);

      expect(userIdentities?.get(stringifyQualifiedId({domain: user1.domain, id: user1.userId}))).toEqual(undefined);
      expect(userIdentities?.get(stringifyQualifiedId({domain: user2.domain, id: user2.userId}))).toEqual(undefined);
    });

    it('returns all the user identities of a mls group', async () => {
      const [service, {coreCrypto, mlsService}] = await buildE2EIService('groupUsersIdentities');
      const user1 = {
        domain: 'elna.wire.link',
        userId: '48a1c3b0-4b0e-4bcd-93ad-64c7344b1534',
        clientId: '74a50c1f4352b41f',
      };
      const user2 = {
        domain: 'elna.wire.link',
        userId: 'b7d287e4-7bbd-40e0-a550-6b18dcaf5f31',
        clientId: '452cb4c65f0369a8',
      };
      const clientIds = [user1, user2];

      jest.spyOn(mlsService, 'getClientIds').mockResolvedValue(clientIds);
      jest.spyOn(mlsService, 'conversationExists').mockResolvedValue(true);

      coreCrypto.getUserIdentities.mockResolvedValue(
        new Map([
          [
            new Uuid(user1.userId),
            [generateCoreCryptoIdentity({userId: user1.userId}), generateCoreCryptoIdentity({userId: user1.userId})],
          ],
          [new Uuid(user2.userId), [generateCoreCryptoIdentity({userId: user2.userId})]],
        ]),
      );

      const userIdentities = await service.getAllGroupUsersIdentities(groupId);

      expect(userIdentities?.get(stringifyQualifiedId({id: user1.userId, domain: user1.domain}))).toHaveLength(2);
      expect(userIdentities?.get(stringifyQualifiedId({id: user2.userId, domain: user2.domain}))).toHaveLength(1);
    });
  });

  describe('initialize', () => {
    const authenticate = jest.fn(async () => {
      return 'id-token';
    });

    it('registers the server certificates on initialization', async () => {
      const [service, {pkiEnvironment}] = await buildE2EIService('initializeRegistersCertificates');
      // A fresh environment has no trust anchor yet, so the deployment root has to be added.
      pkiEnvironment.getTrustAnchors.mockResolvedValue([]);

      await service.initialize(discoveryUrl, authenticate);

      expect(createPkiEnvironmentMock).toHaveBeenCalledTimes(1);
      expect(pkiEnvironment.addTrustAnchor).toHaveBeenCalledWith(mockedRootCA);
      expect(pkiEnvironment.addIntermediateCert).toHaveBeenCalledWith(federatedCerts[0]);
      expect(pkiEnvironment.addIntermediateCert).toHaveBeenCalledWith(federatedCerts[1]);
      expect(pkiEnvironment.addIntermediateCert).toHaveBeenCalledTimes(2);
    });

    it('does not register the root cert if a trust anchor already exists', async () => {
      const [service, {pkiEnvironment}] = await buildE2EIService('initializeExistingTrustAnchor');
      pkiEnvironment.getTrustAnchors.mockResolvedValue(['existing trust anchor']);

      await service.initialize(discoveryUrl, authenticate);

      expect(pkiEnvironment.addTrustAnchor).not.toHaveBeenCalled();
      expect(pkiEnvironment.addIntermediateCert).toHaveBeenCalledTimes(2);
    });

    it('does not create a second PKI environment when one is already set', async () => {
      const [service, {coreCrypto, pkiEnvironment}] = await buildE2EIService('initializeExistingEnvironment');
      coreCrypto.getPkiEnvironment.mockResolvedValue(pkiEnvironment);

      await service.initialize(discoveryUrl, authenticate);

      expect(createPkiEnvironmentMock).not.toHaveBeenCalled();
      expect(pkiEnvironment.addTrustAnchor).not.toHaveBeenCalled();
      expect(pkiEnvironment.addIntermediateCert).toHaveBeenCalledTimes(2);
    });

    it('refreshes revocation data on demand', async () => {
      const [service, {pkiEnvironment, transactionContext}] = await buildE2EIService('initializeRefreshRevocationData');

      await service.initialize(discoveryUrl, authenticate);
      expect(pkiEnvironment.addIntermediateCert).toHaveBeenCalledTimes(2);
      expect(transactionContext.checkCredentials).toHaveBeenCalledTimes(1);

      await service.refreshRevocationData();
      expect(pkiEnvironment.addIntermediateCert).toHaveBeenCalledTimes(4);
      expect(transactionContext.checkCredentials).toHaveBeenCalledTimes(2);
    });
  });

  describe('credentials check', () => {
    const authenticate = jest.fn(async () => {
      return 'id-token';
    });

    it('emits credentialsChecked after a successful check', async () => {
      const [service] = await buildE2EIService('credentialsCheckedEvent');
      const listener = jest.fn();
      service.on('credentialsChecked', listener);

      await service.initialize(discoveryUrl, authenticate);

      expect(listener).toHaveBeenCalledTimes(1);
    });

    it('logs a failed check without emitting credentialsChecked', async () => {
      const [service, {transactionContext}] = await buildE2EIService('credentialsCheckFailure');
      const listener = jest.fn();
      service.on('credentialsChecked', listener);
      transactionContext.checkCredentials.mockRejectedValueOnce(new Error('CRL endpoint unavailable'));

      await expect(service.initialize(discoveryUrl, authenticate)).resolves.toBeUndefined();

      expect(transactionContext.checkCredentials).toHaveBeenCalledTimes(1);
      expect(listener).not.toHaveBeenCalled();
    });

    it('schedules a check every 24 hours and runs it once on first initialization', async () => {
      const [service, {recurringTaskScheduler, transactionContext}] =
        await buildE2EIService('credentialsCheckSchedule');
      const registerTask = jest.spyOn(recurringTaskScheduler, 'registerTask');

      await service.initialize(discoveryUrl, authenticate);

      expect(transactionContext.checkCredentials).toHaveBeenCalledTimes(1);
      expect(registerTask).toHaveBeenCalledWith(
        expect.objectContaining({every: TimeInMillis.DAY, key: 'check-credentials'}),
      );
    });

    it('does not run the check twice when the task was already scheduled before a restart', async () => {
      const dbName = 'credentialsCheckIdempotent';
      const [firstService, firstDependencies] = await buildE2EIService(dbName);
      await firstService.initialize(discoveryUrl, authenticate);
      expect(firstDependencies.transactionContext.checkCredentials).toHaveBeenCalledTimes(1);

      // A new service instance and scheduler sharing the same database models an app restart.
      const [secondService, secondDependencies] = await buildE2EIService(dbName);
      await secondService.initialize(discoveryUrl, authenticate);

      expect(secondDependencies.transactionContext.checkCredentials).not.toHaveBeenCalled();
    });
  });

  describe('PKI environment hooks', () => {
    const initializeService = async (dbName: string, crlProxy?: string): Promise<InitializedService> => {
      const [service, dependencies] = await buildE2EIService(dbName);
      const authenticate = jest.fn(async () => {
        return 'id-token';
      });
      await service.initialize(discoveryUrl, authenticate, {crlProxy});
      const hooks = createPkiEnvironmentMock.mock.calls[0][0];
      return {service, ...dependencies, authenticate, hooks};
    };

    it('persists the acquisition snapshot before authenticating and returns the id token', async () => {
      const {service, authenticate, hooks} = await initializeService('hooksAuthenticate');
      const snapshot = new Uint8Array([1, 2, 3]);

      await expect(hooks.authenticate('idp-url', 'key-auth', 'acme-aud', snapshot)).resolves.toBe('id-token');

      expect(authenticate).toHaveBeenCalledWith({
        idp: 'idp-url',
        keyAuth: 'key-auth',
        acmeAudience: 'acme-aud',
        acquisitionSnapshot: snapshot,
      });
      await expect(service.isEnrollmentInProgress()).resolves.toBe(true);
    });

    it('forwards the backend nonce request to the client api', async () => {
      const {apiClient, hooks} = await initializeService('hooksBackendNonce');
      (apiClient.api.client.getNonce as jest.Mock).mockResolvedValue('backend-nonce');

      await expect(hooks.getBackendNonce()).resolves.toBe('backend-nonce');
      expect(apiClient.api.client.getNonce).toHaveBeenCalledWith('client-id');
    });

    it('forwards the backend access token request to the client api', async () => {
      const {apiClient, hooks} = await initializeService('hooksBackendAccessToken');
      (apiClient.api.client.getAccessToken as jest.Mock).mockResolvedValue({
        token: 'access-token',
        type: 'DPoP',
        expires_in: 60,
      });

      await expect(hooks.fetchBackendAccessToken('dpop-token')).resolves.toBe('access-token');
      expect(apiClient.api.client.getAccessToken).toHaveBeenCalledWith(
        'client-id',
        new TextEncoder().encode('dpop-token'),
      );
    });

    it('performs ACME requests with the given method, headers and body', async () => {
      const {hooks} = await initializeService('hooksHttpRequest');
      const responseBody = new TextEncoder().encode('{"ok":true}').buffer;
      axiosMock.request = jest.fn(async () => {
        return {status: 200, headers: {'replay-nonce': 'nonce'}, data: responseBody};
      }) as unknown as typeof axiosMock.request;

      const response = await hooks.httpRequest(
        HttpMethod.Post,
        'https://acme.example/new-order',
        [{name: 'content-type', value: 'application/jose+json'}],
        new Uint8Array([4, 5, 6]),
      );

      expect(axiosMock.request).toHaveBeenCalledWith(
        expect.objectContaining({
          method: 'post',
          url: 'https://acme.example/new-order',
          headers: {'content-type': 'application/jose+json'},
          data: new Uint8Array([4, 5, 6]),
        }),
      );
      expect(response).toEqual({
        status: 200,
        headers: [{name: 'replay-nonce', value: 'nonce'}],
        body: new Uint8Array([123, 34, 111, 107, 34, 58, 116, 114, 117, 101, 125]),
      });
    });

    it.each([
      ['https://crl.example.test/crl', 'https://proxy.example.test/proxyCrl/crl.example.test'],
      ['https://crl.example.test/some/nested/path/crl', 'https://proxy.example.test/proxyCrl/crl.example.test'],
      ['https://crl.example.test/crl?tenant=wire', 'https://proxy.example.test/proxyCrl/crl.example.test'],
    ])('routes the CRL URL %s through the proxy', async (crlUrl, expectedUrl) => {
      const {hooks} = await initializeService('hooksCrlProxyRewrite', 'https://proxy.example.test/proxyCrl');

      await hooks.httpRequest(HttpMethod.Get, crlUrl, [], new Uint8Array());

      expect(axiosMock.request).toHaveBeenCalledWith(expect.objectContaining({url: expectedUrl}));
    });

    it('does not add a second slash when the proxy URL ends with one', async () => {
      const {hooks} = await initializeService('hooksCrlProxyTrailingSlash', 'https://proxy.example.test/proxyCrl/');

      await hooks.httpRequest(HttpMethod.Get, 'https://crl.example.test/crl', [], new Uint8Array());

      expect(axiosMock.request).toHaveBeenCalledWith(
        expect.objectContaining({url: 'https://proxy.example.test/proxyCrl/crl.example.test'}),
      );
    });

    it('keeps non CRL requests untouched when a proxy is configured', async () => {
      const {hooks} = await initializeService('hooksCrlProxyNonCrl', 'https://proxy.example.test/proxyCrl');

      await hooks.httpRequest(HttpMethod.Post, 'https://acme.example.test/new-order', [], new Uint8Array());

      expect(axiosMock.request).toHaveBeenCalledWith(
        expect.objectContaining({url: 'https://acme.example.test/new-order'}),
      );
    });

    it('keeps the raw CRL URL when no proxy is configured', async () => {
      const {hooks} = await initializeService('hooksCrlWithoutProxy');

      await hooks.httpRequest(HttpMethod.Get, 'https://crl.example.test/crl', [], new Uint8Array());

      expect(axiosMock.request).toHaveBeenCalledWith(expect.objectContaining({url: 'https://crl.example.test/crl'}));
    });

    it('rejects a malformed URL instead of passing it through', async () => {
      const {hooks} = await initializeService('hooksMalformedUrl', 'https://proxy.example.test/proxyCrl');

      await expect(hooks.httpRequest(HttpMethod.Get, 'not a url', [], new Uint8Array())).rejects.toThrow(
        'Could not parse request URL',
      );
      expect(axiosMock.request).not.toHaveBeenCalled();
    });
  });
});
