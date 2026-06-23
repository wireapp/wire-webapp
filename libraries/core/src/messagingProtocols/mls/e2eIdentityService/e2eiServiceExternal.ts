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
import {RegisteredClient} from '@wireapp/api-client/lib/client';
import {TimeInMillis} from '@wireapp/commons/lib/util/TimeUtil';
import {Decoder} from 'bazinga64';

import {APIClient} from '@wireapp/api-client';
import {LogFactory, TypedEventEmitter} from '@wireapp/commons';
import {
  CoreCrypto,
  Database,
  E2eiConversationState,
  WireIdentity,
  DeviceStatus,
  CredentialType,
  ConversationId,
  ClientId,
  Uuid,
  PkiEnvironment,
  PkiEnvironmentHooks,
  HttpMethod,
  X509CredentialAcquisition,
  X509CredentialAcquisitionConfiguration,
} from '@wireapp/core-crypto/browser';

import {AcmeService} from './connection';
import {getAllConversationsCallback, getTokenCallback} from './e2eiServiceInternal';
import {createE2EIEnrollmentStorage} from './storage/e2eiStorage';
import {User} from './e2eiService.types';

import {ClientService} from '../../../client';
import {CoreDatabase} from '../../../storage/coreDb';
import {parseFullQualifiedClientId} from '../../../util/fullyQualifiedClientIdUtils';
import {LowPrecisionTaskScheduler} from '../../../util/lowPrecisionTaskScheduler';
import {StringifiedQualifiedId, stringifyQualifiedId} from '../../../util/qualifiedIdUtil';
import {RecurringTaskScheduler} from '../../../util/recurringTaskScheduler';
import {coreCryptoClientIdToString, createCoreCryptoClientId} from '../coreCryptoV10';
import {MLSService, MLSServiceEvents} from '../mlsService';

export type DeviceIdentity = Omit<WireIdentity, 'free' | 'status' | typeof Symbol.dispose> & {
  status?: DeviceStatus;
  deviceId: string;
  qualifiedUserId: QualifiedId;
};

type Events = {
  crlChanged: {domain: string};
};

const HTTP_METHOD_NAMES: Record<HttpMethod, string> = {
  [HttpMethod.Get]: 'GET',
  [HttpMethod.Post]: 'POST',
  [HttpMethod.Put]: 'PUT',
  [HttpMethod.Delete]: 'DELETE',
  [HttpMethod.Patch]: 'PATCH',
  [HttpMethod.Head]: 'HEAD',
};

const CERTIFICATE_PEM_PATTERN = /-----BEGIN CERTIFICATE-----[\s\S]+?-----END CERTIFICATE-----/g;

// This export is meant to be accessible from the outside (e.g the Webapp / UI)
export class E2EIServiceExternal extends TypedEventEmitter<Events> {
  private readonly logger = LogFactory.getLogger('@wireapp/core/E2EIdentityServiceExternal');
  private _acmeService?: AcmeService;
  private pkiEnvironment?: PkiEnvironment;
  private getOAuthToken?: getTokenCallback;
  private isResumingCredentialAcquisition = false;
  private readonly enrollmentStorage: ReturnType<typeof createE2EIEnrollmentStorage>;

  public constructor(
    private readonly coreCryptoClient: CoreCrypto,
    private readonly coreCryptoDatabase: Database,
    private readonly apiClient: APIClient,
    private readonly coreDatabase: CoreDatabase,
    private readonly recurringTaskScheduler: RecurringTaskScheduler,
    private readonly clientService: ClientService,
    private readonly mlsService: MLSService,
  ) {
    super();
    this.enrollmentStorage = createE2EIEnrollmentStorage(coreDatabase);
  }

  public setAuthenticationCallback(getOAuthToken: getTokenCallback): void {
    this.getOAuthToken = getOAuthToken;
  }

  private createPkiEnvironmentHooks(): PkiEnvironmentHooks {
    return {
      httpRequest: async (method, url, headers, body, asyncOpts) => {
        const requestHeaders = new Headers();
        headers.forEach(({name, value}) => requestHeaders.append(name, value));
        const requestBody = new ArrayBuffer(body.length);
        new Uint8Array(requestBody).set(body);

        const response = await fetch(url, {
          method: HTTP_METHOD_NAMES[method],
          headers: requestHeaders,
          body: method === HttpMethod.Get || method === HttpMethod.Head || body.length === 0 ? undefined : requestBody,
          signal: asyncOpts?.signal,
        });

        const responseHeaders: Array<{name: string; value: string}> = [];
        response.headers.forEach((value, name) => responseHeaders.push({name, value}));

        return {
          status: response.status,
          headers: responseHeaders,
          body: new Uint8Array(await response.arrayBuffer()),
        };
      },
      authenticate: async (idp, keyAuth, acmeAud, acquisitionSnapshot) => {
        if (this.getOAuthToken === undefined) {
          throw new Error('Cannot authenticate E2EI X509 acquisition: OAuth token callback is not configured');
        }

        const snapshot = new Uint8Array(acquisitionSnapshot.length);
        snapshot.set(acquisitionSnapshot);
        await this.enrollmentStorage.savePendingEnrollmentData({
          type: 'x509-credential-acquisition',
          acquisitionSnapshot: snapshot,
        });

        const idToken = this.isResumingCredentialAcquisition
          ? await this.getOAuthToken()
          : await this.getOAuthToken({keyAuth, challenge: {target: idp, url: acmeAud}});
        if (idToken === undefined || idToken.length === 0) {
          throw new Error('Cannot authenticate E2EI X509 acquisition: no ID token received');
        }

        return idToken;
      },
      getBackendNonce: async () => {
        const clientId = await this.getCurrentClientId();
        return this.apiClient.api.client.getNonce(clientId);
      },
      fetchBackendAccessToken: async dpop => {
        const clientId = await this.getCurrentClientId();
        const {token} = await this.apiClient.api.client.getAccessToken(clientId, new TextEncoder().encode(dpop));
        return token;
      },
    };
  }

  private async getCurrentClientId(): Promise<string> {
    const contextClientId = this.apiClient.context?.clientId;
    if (contextClientId !== undefined && contextClientId.length > 0) {
      return contextClientId;
    }

    const client = await this.clientService.loadClient();
    if (client !== undefined) {
      return client.id;
    }

    throw new Error('Cannot resolve current client id for E2EI PKI environment');
  }

  private isX509CredentialAcquisitionEnrollmentData(
    data: Awaited<ReturnType<typeof this.enrollmentStorage.getPendingEnrollmentData>>,
  ): data is {type: 'x509-credential-acquisition'; acquisitionSnapshot: Uint8Array<ArrayBuffer>} {
    return data !== undefined && 'type' in data && data.type === 'x509-credential-acquisition';
  }

  public async getOrCreatePkiEnvironment(): Promise<PkiEnvironment> {
    const existingPkiEnvironment = this.pkiEnvironment ?? (await this.coreCryptoClient.getPkiEnvironment());
    if (existingPkiEnvironment !== undefined) {
      this.pkiEnvironment = existingPkiEnvironment;
      return existingPkiEnvironment;
    }

    const pkiEnvironment = await PkiEnvironment.create(this.createPkiEnvironmentHooks(), this.coreCryptoDatabase);
    await this.coreCryptoClient.setPkiEnvironment(pkiEnvironment);
    this.pkiEnvironment = pkiEnvironment;
    return pkiEnvironment;
  }

  public async enroll({
    certificateTtl,
    client,
    discoveryUrl,
    getAllConversations,
    getOAuthToken,
    nbKeyPackages,
    user,
  }: {
    certificateTtl: number;
    client: RegisteredClient;
    discoveryUrl: string;
    getAllConversations: getAllConversationsCallback;
    getOAuthToken: getTokenCallback;
    nbKeyPackages: number;
    user: User;
  }): Promise<void> {
    this._acmeService = new AcmeService(discoveryUrl);
    this.setAuthenticationCallback(getOAuthToken);

    const pkiEnvironment = await this.getOrCreatePkiEnvironment();
    const clientId = createCoreCryptoClientId(user.id, client.id, user.domain);
    const config = X509CredentialAcquisitionConfiguration.new({
      acmeDirectoryUrl: discoveryUrl,
      cipherSuite: this.mlsService.config.defaultCiphersuite,
      displayName: user.displayName,
      clientId,
      handle: user.handle,
      domain: user.domain,
      team: user.teamId,
      validityPeriodSecs: BigInt(certificateTtl),
    });

    const pendingEnrollmentData = await this.enrollmentStorage.getPendingEnrollmentData();
    const isResumingCredentialAcquisition = this.isX509CredentialAcquisitionEnrollmentData(pendingEnrollmentData);
    const baseCredentialRef = await this.mlsService.getCurrentCredentialRef();
    const acquisition = isResumingCredentialAcquisition
      ? X509CredentialAcquisition.fromBytes(pkiEnvironment, pendingEnrollmentData.acquisitionSnapshot)
      : await X509CredentialAcquisition.newFromCredentialRef(
          pkiEnvironment,
          config,
          baseCredentialRef,
          this.coreCryptoDatabase,
        );

    this.isResumingCredentialAcquisition = isResumingCredentialAcquisition;
    try {
      const credential = await acquisition.finalize();
      const credentialRef = await this.coreCryptoClient.transaction(cx => cx.addCredential(credential));

      const conversations = await getAllConversations();
      for (const conversation of conversations) {
        if (conversation.group_id?.length) {
          try {
            await this.mlsService.setConversationCredential(conversation.group_id, credentialRef);
          } catch (error) {
            this.logger.warn('Failed to set X509 credential for conversation', {groupId: conversation.group_id, error});
          }
        } else {
          this.logger.error('No group id found in conversation');
        }
      }

      const keyPackages = await this.mlsService.generateKeyPackagesForCredential(credentialRef, nbKeyPackages);
      if (!this.mlsService.isInitializedMLSClient(client)) {
        await this.mlsService.uploadMLSPublicKeys(client);
      }
      await this.mlsService.replaceKeyPackages(client.id, keyPackages);
      await this.mlsService.verifyRemoteMLSKeyPackagesAmount(client.id);
      await this.enrollmentStorage.deletePendingEnrollmentData();
    } finally {
      this.isResumingCredentialAcquisition = false;
    }
  }

  // If we have a handle in the local storage, we are in the enrollment process (this handle is saved before oauth redirect)
  public async isEnrollmentInProgress(): Promise<boolean> {
    const data = await this.enrollmentStorage.getPendingEnrollmentData();
    return !!data;
  }

  public clearAllProgress() {
    return this.enrollmentStorage.deletePendingEnrollmentData();
  }

  public async getConversationState(conversationId: Uint8Array): Promise<E2eiConversationState> {
    return this.coreCryptoClient.transaction(cx => cx.e2eiConversationState(new ConversationId(conversationId)));
  }

  public isE2EIEnabled(): Promise<boolean> {
    return this.coreCryptoClient.e2eiIsEnabled(this.mlsService.config.defaultCiphersuite);
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
      userIds.map(userId => new Uuid(userId.id)),
    );

    // We get all the devices in the conversation (in order to get devices that have no identity)
    const allUsersMLSDevices = (await this.coreCryptoClient.getClientIds(new ConversationId(groupIdBytes)))
      .map(coreCryptoClientIdToString)
      .map(fullyQualifiedId => parseFullQualifiedClientId(fullyQualifiedId));

    const mappedUserIdentities = new Map<StringifiedQualifiedId, DeviceIdentity[]>();
    for (const userId of userIds) {
      const userIdentityEntry = Array.from(userIdentities.entries()).find(([id]) => id.toString() === userId.id);
      const identities = (userIdentityEntry?.[1] || []).flatMap(identity => {
        if (identity.clientId === undefined) {
          return [];
        }
        return [
          {
            ...identity,
            deviceId: parseFullQualifiedClientId(coreCryptoClientIdToString(identity.clientId)).client,
            qualifiedUserId: userId,
          },
        ];
      });

      const basicMLSDevices = allUsersMLSDevices
        .filter(({user}) => user === userId.id)
        // filtering devices that have a valid identity
        .filter(({client}) => !identities.map(identity => identity.deviceId).includes(client))
        // map basic MLS devices to "fake" identity object
        .map<DeviceIdentity>(id => ({
          ...id,
          deviceId: id.client,
          thumbprint: '',
          user: '',
          certificate: '',
          displayName: '',
          handle: '',
          notAfter: BigInt(0),
          notBefore: BigInt(0),
          serialNumber: '',
          clientId: createCoreCryptoClientId(id.user, id.client, id.domain),
          qualifiedUserId: userId,
          credentialType: CredentialType.Basic,
          x509Identity: undefined,
        }));

      mappedUserIdentities.set(stringifyQualifiedId(userId), [...identities, ...basicMLSDevices]);
    }

    return mappedUserIdentities;
  }

  // Returns devices e2ei certificates
  public async getDevicesIdentities(
    groupId: string,
    userClientsMap: Record<string, QualifiedId>,
  ): Promise<DeviceIdentity[]> {
    const clientIds: Array<ClientId> = Object.entries(userClientsMap).map(([clientId, userId]) =>
      createCoreCryptoClientId(userId.id, clientId, userId.domain),
    );
    const deviceIdentities = await this.coreCryptoClient.getDeviceIdentities(
      new ConversationId(Decoder.fromBase64(groupId).asBytes),
      clientIds,
    );

    return deviceIdentities.flatMap(identity => {
      if (identity.clientId === undefined) {
        return [];
      }
      const parsedClientId = parseFullQualifiedClientId(coreCryptoClientIdToString(identity.clientId));
      const qualifiedUserId = userClientsMap[parsedClientId.client];

      if (qualifiedUserId === undefined) {
        return [];
      }

      return [
        {
          ...identity,
          deviceId: parsedClientId.client,
          credentialType: identity.credentialType,
          qualifiedUserId,
        },
      ];
    });
  }

  public async isFreshMLSSelfClient(): Promise<boolean> {
    const client = await this.clientService.loadClient();
    return !client || !this.mlsService.isInitializedMLSClient(client);
  }

  private splitCertificatePemBundle(certificatePemBundle: string): string[] {
    return certificatePemBundle.match(CERTIFICATE_PEM_PATTERN) ?? [certificatePemBundle];
  }

  private async tryAddTrustAnchor(pkiEnvironment: PkiEnvironment, certificate: string): Promise<boolean> {
    try {
      await pkiEnvironment.addTrustAnchor(certificate);
      return true;
    } catch (error) {
      this.logger.debug('Certificate from ACME roots bundle was not accepted as trust anchor', {error});
      return false;
    }
  }

  private async tryAddIntermediateCertificate(
    pkiEnvironment: PkiEnvironment,
    certificate: string,
    source: string,
  ): Promise<void> {
    try {
      await pkiEnvironment.addIntermediateCert(certificate);
    } catch (error) {
      this.logger.warn(`Failed to register ${source} E2EI intermediate certificate`, {error});
    }
  }

  private async registerLocalCertificateRoot(acmeService: AcmeService): Promise<string> {
    const localCertificateRoot = await acmeService.getLocalCertificateRoot();
    const pkiEnvironment = await this.getOrCreatePkiEnvironment();
    const localCertificates = this.splitCertificatePemBundle(localCertificateRoot);

    let trustAnchor: string | undefined;
    const intermediateCandidates: string[] = [];

    for (const certificate of localCertificates) {
      if (trustAnchor === undefined && (await this.tryAddTrustAnchor(pkiEnvironment, certificate))) {
        trustAnchor = certificate;
        continue;
      }

      intermediateCandidates.push(certificate);
    }

    if (trustAnchor === undefined) {
      throw new Error('Failed to register ACME trust anchor from roots.pem');
    }

    await Promise.all(
      intermediateCandidates.map(certificate =>
        this.tryAddIntermediateCertificate(pkiEnvironment, certificate, 'local ACME roots bundle'),
      ),
    );

    return localCertificateRoot;
  }

  /**
   * will initialize the E2EIServiceExternal with the given discoveryUrl and userId.
   * It will also register the server certificates in CoreCrypto and start the CRL background check process
   *
   * @param discoveryUrl the discovery url of the acme server
   */
  public async initialize(discoveryUrl: string): Promise<void> {
    this._acmeService = new AcmeService(discoveryUrl);
    await this.getOrCreatePkiEnvironment();

    this.mlsService.on(MLSServiceEvents.NEW_CRL_DISTRIBUTION_POINTS, distributionPoints =>
      this.handleNewCrlDistributionPoints(distributionPoints),
    );

    await this.registerServerCertificates();
    await this.initialiseCrlDistributionTimers();
  }

  private get acmeService(): AcmeService {
    if (!this._acmeService) {
      throw new Error('AcmeService not initialized');
    }
    return this._acmeService;
  }

  private async registerCrossSignedCertificates(acmeService: AcmeService): Promise<void> {
    const certificates = (await acmeService.getFederationCrossSignedCertificates()).flatMap(certificate =>
      this.splitCertificatePemBundle(certificate),
    );
    const pkiEnvironment = await this.getOrCreatePkiEnvironment();
    await Promise.all(
      certificates.map(certificate =>
        this.tryAddIntermediateCertificate(pkiEnvironment, certificate, 'federation cross-signed'),
      ),
    );
  }

  /**
   * This function is used to register different server certificates in CoreCrypto.
   *
   * 1. Root Certificate: This is the root certificate of the server.
   * - It must only be registered once.
   * - It must be the first certificate to be registered. Nothing else will work
   *
   * 2. Intermediate Certificate: This is the intermediate certificate of the server. It must be updated every 24 hours.
   * - It must be registered after the root certificate.
   * - It must be updated every 24 hours.
   *
   * Both must be registered before the first enrollment.
   */
  private async registerServerCertificates(): Promise<void> {
    await this.registerLocalCertificateRoot(this.acmeService);

    // Register intermediate certificate and update it every 24 hours

    const INTERMEDIATE_CA_KEY = 'update-intermediate-certificates';
    const hasPendingTask = await this.recurringTaskScheduler.hasTask(INTERMEDIATE_CA_KEY);

    const task = () => this.registerCrossSignedCertificates(this.acmeService);

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

  private scheduleCrlDistributionTimer({expiresAt, url}: {expiresAt: number; url: string}): void {
    LowPrecisionTaskScheduler.addTask({
      intervalDelay: TimeInMillis.SECOND,
      firingDate: expiresAt,
      key: url,
      task: () => this.validateCrlDistributionPoint(url),
    });
  }

  private async initialiseCrlDistributionTimers(): Promise<void> {
    const crls = await this.coreDatabase.getAll('crls');

    for (const crl of crls) {
      this.scheduleCrlDistributionTimer(crl);
    }
  }

  private async cancelCrlDistributionTimer(url: string): Promise<void> {
    await this.coreDatabase.delete('crls', url);
  }

  private async validateCrlDistributionPoint(distributionPointUrl: string): Promise<void> {
    const domain = new URL(distributionPointUrl).hostname;
    const crl = await this.acmeService.getCRLFromDistributionPoint(domain);

    await this.validateCrl(distributionPointUrl, crl, () => this.emit('crlChanged', {domain}));
  }

  private async validateCrl(url: string, crl: Uint8Array, onDirty: () => void): Promise<void> {
    await this.cancelCrlDistributionTimer(url);
    onDirty();
  }

  private async handleNewCrlDistributionPoints(distributionPoints: string[]): Promise<void> {
    const uniqueDistributionPoints = Array.from(new Set(distributionPoints));
    for (const distributionPointUrl of uniqueDistributionPoints) {
      await this.validateCrlDistributionPoint(distributionPointUrl);
    }
  }
}
