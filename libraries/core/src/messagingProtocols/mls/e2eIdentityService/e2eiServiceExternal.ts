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

import {QualifiedId} from '@wireapp/api-client/lib/user';
import {TimeInMillis} from '@wireapp/commons/lib/util/TimeUtil';
import axios from 'axios';
import {Decoder} from 'bazinga64';

import {APIClient} from '@wireapp/api-client';
import {TypedEventEmitter} from '@wireapp/commons';
import {
  ConversationId,
  CoreCrypto,
  DeviceStatus,
  E2eiConversationState,
  HttpMethod,
  Uuid,
  WireIdentity,
  CredentialType,
  type HttpHeader,
  type HttpResponse,
  type PkiEnvironment,
  type PkiEnvironmentHooks,
} from '@wireapp/core-crypto';

import {AcmeService} from './connection';
import {E2EIAuthenticateCallback} from './e2eiService.types';
import {createE2EIEnrollmentStorage} from './storage/e2eiStorage';

import {ClientService} from '../../../client';
import {createPkiEnvironment} from '../../../messagingProtocols/proteus/proteusService/cryptoClient/coreCryptoWrapper';
import {CoreDatabase} from '../../../storage/coreDb';
import {parseFullQualifiedClientId} from '../../../util/fullyQualifiedClientIdUtils';
import {StringifiedQualifiedId, stringifyQualifiedId} from '../../../util/qualifiedIdUtil';
import {RecurringTaskScheduler} from '../../../util/recurringTaskScheduler';
import {MLSService} from '../mlsService';
import {createMLSClientId} from '../utils/mlsId';

/**
 * Identity of a device in an MLS conversation.
 *
 * `clientId` is exposed in its Wire format (`<user-id>:<device-id>@<domain>`) because the webapp
 * and the backend speak that format. X509 specific fields live in `x509Identity`, the way
 * CoreCrypto models them.
 */
export type DeviceIdentity = Omit<WireIdentity, 'clientId' | 'status'> & {
  status?: DeviceStatus;
  clientId: string;
  deviceId: string;
  qualifiedUserId: QualifiedId;
};

type Events = {
  /** Emitted when a CRL that affects the self domain changed. */
  crlChanged: {domain: string};
};

const axiosMethods: Record<HttpMethod, 'get' | 'post' | 'put' | 'delete' | 'patch' | 'head'> = {
  [HttpMethod.Get]: 'get',
  [HttpMethod.Post]: 'post',
  [HttpMethod.Put]: 'put',
  [HttpMethod.Delete]: 'delete',
  [HttpMethod.Patch]: 'patch',
  [HttpMethod.Head]: 'head',
};

const decodeClientId = (clientId: WireIdentity['clientId']): string => {
  return clientId === undefined ? '' : new TextDecoder().decode(clientId.copyBytes());
};

// This export is meant to be accessible from the outside (e.g the Webapp / UI)
export class E2EIServiceExternal extends TypedEventEmitter<Events> {
  private _acmeService?: AcmeService;
  private readonly enrollmentStorage: ReturnType<typeof createE2EIEnrollmentStorage>;

  public constructor(
    private readonly coreCryptoClient: CoreCrypto,
    private readonly apiClient: APIClient,
    coreDatabase: CoreDatabase,
    private readonly recurringTaskScheduler: RecurringTaskScheduler,
    private readonly clientService: ClientService,
    private readonly mlsService: MLSService,
  ) {
    super();
    this.enrollmentStorage = createE2EIEnrollmentStorage(coreDatabase);
  }

  // If we have a snapshot of an interrupted acquisition in the local storage, we are in the enrollment process
  public async isEnrollmentInProgress(): Promise<boolean> {
    const snapshot = await this.enrollmentStorage.getPendingAcquisitionSnapshot();
    return snapshot.isJust;
  }

  public clearAllProgress(): Promise<void> {
    return this.enrollmentStorage.deletePendingAcquisitionSnapshot();
  }

  public async getConversationState(conversationId: Uint8Array): Promise<E2eiConversationState> {
    return this.coreCryptoClient.transaction(cx => {
      return cx.e2eiConversationState(new ConversationId(conversationId));
    });
  }

  public isE2EIEnabled(): Promise<boolean> {
    return this.mlsService.hasCredential(CredentialType.X509);
  }

  public async getAllGroupUsersIdentities(
    groupId: string,
  ): Promise<Map<StringifiedQualifiedId, DeviceIdentity[]> | undefined> {
    const conversationExists = await this.mlsService.conversationExists(groupId);

    if (!conversationExists) {
      return undefined;
    }

    const allGroupClients = await this.mlsService.getClientIds(groupId);

    const userIdsMap = allGroupClients.reduce(
      (acc, {userId, domain}) => {
        const qualifiedId = {id: userId, domain};
        acc[stringifyQualifiedId(qualifiedId)] = qualifiedId;
        return acc;
      },
      {} as Record<string, QualifiedId>,
    );

    const userIds = Object.values(userIdsMap);
    return this.getUsersIdentities(groupId, userIds);
  }

  public async getUsersIdentities(
    groupId: string,
    userIds: QualifiedId[],
  ): Promise<Map<StringifiedQualifiedId, DeviceIdentity[]> | undefined> {
    const conversationExists = await this.mlsService.conversationExists(groupId);

    if (!conversationExists) {
      return undefined;
    }

    const groupIdBytes = Decoder.fromBase64(groupId).asBytes;

    // we get all the devices that have an identity (either valid, expired or revoked)
    const userIdentities = await this.coreCryptoClient.getUserIdentities(
      new ConversationId(groupIdBytes),
      userIds.map(userId => {
        return new Uuid(userId.id);
      }),
    );

    // We get all the devices in the conversation (in order to get devices that have no identity)
    const allUsersMLSDevices = (await this.coreCryptoClient.getClientIds(new ConversationId(groupIdBytes)))
      .map(id => {
        return decodeClientId(id);
      })
      .map(fullyQualifiedId => {
        return parseFullQualifiedClientId(fullyQualifiedId);
      });

    const mappedUserIdentities = new Map<StringifiedQualifiedId, DeviceIdentity[]>();
    for (const userId of userIds) {
      // The map is keyed by `Uuid` instances, which cannot be looked up with a fresh instance,
      // so the entries are matched by their string representation instead.
      const identities = Array.from(userIdentities.entries())
        .filter(([uuid]) => {
          return uuid.toString() === userId.id;
        })
        .flatMap(([, identities]) => {
          return identities;
        })
        .flatMap(identity => {
          const clientId = decodeClientId(identity.clientId);
          if (clientId.length === 0) {
            return [];
          }

          return [
            {
              ...identity,
              clientId,
              deviceId: parseFullQualifiedClientId(clientId).client,
              qualifiedUserId: userId,
            },
          ];
        });

      const basicMLSDevices = allUsersMLSDevices
        .filter(({user}) => {
          return user === userId.id;
        })
        // filtering devices that have a valid identity
        .filter(({client}) => {
          return !identities
            .map(identity => {
              return identity.deviceId;
            })
            .includes(client);
        })
        // map basic MLS devices to "fake" identity object
        .map<DeviceIdentity>(id => {
          return {
            clientId: `${id.user}:${id.client}@${id.domain}`,
            deviceId: id.client,
            thumbprint: '',
            qualifiedUserId: userId,
            credentialType: CredentialType.Basic,
          };
        });

      mappedUserIdentities.set(stringifyQualifiedId(userId), [...identities, ...basicMLSDevices]);
    }

    return mappedUserIdentities;
  }

  // Returns devices e2ei certificates
  public async getDevicesIdentities(
    groupId: string,
    userClientsMap: Record<string, QualifiedId>,
  ): Promise<DeviceIdentity[]> {
    const clientIds = Object.entries(userClientsMap).map(([clientId, userId]) => {
      return createMLSClientId(userId, clientId);
    });
    const deviceIdentities = await this.coreCryptoClient.getDeviceIdentities(
      new ConversationId(Decoder.fromBase64(groupId).asBytes),
      clientIds,
    );

    return deviceIdentities.flatMap(identity => {
      const clientId = decodeClientId(identity.clientId);
      const qualifiedUserId = userClientsMap[clientId];

      if (qualifiedUserId === undefined) {
        return [];
      }

      return [
        {
          ...identity,
          clientId,
          deviceId: parseFullQualifiedClientId(clientId).client,
          credentialType: identity.credentialType,
          qualifiedUserId,
        },
      ];
    });
  }

  public async isFreshMLSSelfClient(): Promise<boolean> {
    const client = await this.clientService.loadClient();
    return client === undefined || !this.mlsService.isInitializedMLSClient(client);
  }

  private get acmeService(): AcmeService {
    if (this._acmeService === undefined) {
      throw new Error('AcmeService not initialized');
    }
    return this._acmeService;
  }

  private async getPkiEnvironment(): Promise<PkiEnvironment> {
    const pkiEnvironment = await this.coreCryptoClient.getPkiEnvironment();
    if (pkiEnvironment === undefined) {
      throw new Error('The PKI environment is not initialized');
    }
    return pkiEnvironment;
  }

  /**
   * will initialize the E2EIServiceExternal with the given discoveryUrl and userId.
   * It will create the PKI environment, register the server certificates in CoreCrypto and start
   * the background process that keeps the intermediate certificates up to date.
   *
   * @param discoveryUrl the discovery url of the acme server
   * @param authenticate authenticates the user against its identity provider. This is owned by the webapp
   * because it needs the OIDC details, while the rest of the PKI environment hooks live in core.
   */
  public async initialize(discoveryUrl: string, authenticate: E2EIAuthenticateCallback): Promise<void> {
    this._acmeService = new AcmeService(discoveryUrl);

    await this.initializePkiEnvironment(authenticate);
    await this.registerIntermediateCertificates();
  }

  /**
   * Forces an immediate refresh of revocation-related data.
   * - Re-fetches and registers federation intermediate certificates
   *
   * Fetching and registering CRLs is done by CoreCrypto (`checkCredentials`), its scheduling is
   * handled separately.
   */
  public async refreshRevocationData(): Promise<void> {
    await this.registerCrossSignedCertificates(this.acmeService);
  }

  private async initializePkiEnvironment(authenticate: E2EIAuthenticateCallback): Promise<void> {
    const existingPkiEnvironment = await this.coreCryptoClient.getPkiEnvironment();
    if (existingPkiEnvironment !== undefined) {
      return;
    }

    const pkiEnvironment = await createPkiEnvironment(this.buildPkiEnvironmentHooks(authenticate)).match({
      Resolved: environment => {
        return Promise.resolve(environment);
      },
      Rejected: error => {
        return Promise.reject(error);
      },
    });

    // Trust anchors are persisted in the CoreCrypto database. Only add the deployment root if
    // there is none yet, otherwise every app start would add a duplicate anchor.
    const trustAnchors = await pkiEnvironment.getTrustAnchors();
    if (trustAnchors.length === 0) {
      const localCertificateRoot = await this.acmeService.getLocalCertificateRoot();
      await pkiEnvironment.addTrustAnchor(localCertificateRoot);
    }
  }

  private buildPkiEnvironmentHooks(authenticate: E2EIAuthenticateCallback): PkiEnvironmentHooks {
    return {
      httpRequest: (method, url, headers, body) => {
        return this.httpRequest(method, url, headers, body);
      },
      authenticate: async (idp, keyAuth, acmeAud, acquisitionSnapshot) => {
        // Persist the acquisition before the user is redirected to the identity provider. If the
        // page reloads, the next enrollment resumes from this snapshot instead of starting over.
        await this.enrollmentStorage.savePendingAcquisitionSnapshot(acquisitionSnapshot);
        return authenticate({idp, keyAuth, acmeAudience: acmeAud, acquisitionSnapshot});
      },
      getBackendNonce: () => {
        return this.apiClient.api.client.getNonce(this.apiClient.validatedClientId);
      },
      fetchBackendAccessToken: async dpop => {
        const {token} = await this.apiClient.api.client.getAccessToken(
          this.apiClient.validatedClientId,
          new TextEncoder().encode(dpop),
        );
        return token;
      },
    };
  }

  /**
   * Performs an HTTP request on behalf of CoreCrypto.
   *
   * CoreCrypto uses this for every ACME server call (directory, nonce, account, order, challenges
   * and certificate). Every status code is handed back to CoreCrypto, which decides how to react.
   */
  private async httpRequest(
    method: HttpMethod,
    url: string,
    headers: HttpHeader[],
    body: Uint8Array,
  ): Promise<HttpResponse> {
    const response = await axios.request<ArrayBuffer>({
      method: axiosMethods[method],
      url,
      headers: Object.fromEntries(
        headers.map(({name, value}) => {
          return [name, value];
        }),
      ),
      data: body.byteLength > 0 ? body : undefined,
      responseType: 'arraybuffer',
      validateStatus: () => {
        return true;
      },
    });

    const responseBody =
      typeof response.data === 'string' ? new TextEncoder().encode(response.data) : new Uint8Array(response.data);

    return {
      status: response.status,
      headers: Object.entries(response.headers).map(([name, value]) => {
        return {name, value: String(value)};
      }),
      body: responseBody,
    };
  }

  private async registerCrossSignedCertificates(acmeService: AcmeService): Promise<void> {
    const certificates = await acmeService.getFederationCrossSignedCertificates();
    const pkiEnvironment = await this.getPkiEnvironment();
    await Promise.all(
      certificates.map(cert => {
        return pkiEnvironment.addIntermediateCert(cert);
      }),
    );
  }

  /**
   * This function is used to register different server certificates in CoreCrypto.
   *
   * Intermediate certificates are the intermediate certificates of the server. They must be
   * updated every 24 hours.
   */
  private async registerIntermediateCertificates(): Promise<void> {
    const INTERMEDIATE_CA_KEY = 'update-intermediate-certificates';
    const hasPendingTask = await this.recurringTaskScheduler.hasTask(INTERMEDIATE_CA_KEY);

    const task = (): Promise<void> => {
      return this.registerCrossSignedCertificates(this.acmeService);
    };

    // If the task was never registered, we run it once, and then register it to run every 24 hours
    if (!hasPendingTask) {
      await task();
    }

    await this.recurringTaskScheduler.registerTask({
      every: TimeInMillis.DAY,
      key: INTERMEDIATE_CA_KEY,
      task,
    });
  }
}
