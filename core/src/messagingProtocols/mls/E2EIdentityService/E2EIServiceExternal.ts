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
import {Decoder} from 'bazinga64';

import {TypedEventEmitter} from '@wireapp/commons';
import {
  CoreCrypto,
  E2eiConversationState,
  WireIdentity,
  DeviceStatus,
  CredentialType,
  ConversationId,
  ClientId,
} from '@wireapp/core-crypto';

import {AcmeService} from './Connection';
import {getE2EIClientId} from './Helper';
import {createE2EIEnrollmentStorage} from './Storage/E2EIStorage';

import {ClientService} from '../../../client';
import {CoreDatabase} from '../../../storage/CoreDB';
import {parseFullQualifiedClientId} from '../../../util/fullyQualifiedClientIdUtils';
import {LowPrecisionTaskScheduler} from '../../../util/LowPrecisionTaskScheduler';
import {StringifiedQualifiedId, stringifyQualifiedId} from '../../../util/qualifiedIdUtil';
import {RecurringTaskScheduler} from '../../../util/RecurringTaskScheduler';
import {MLSService, MLSServiceEvents} from '../MLSService';

export type DeviceIdentity = Omit<WireIdentity, 'free' | 'status'> & {
  status?: DeviceStatus;
  deviceId: string;
  qualifiedUserId: QualifiedId;
};

type Events = {
  crlChanged: {domain: string};
};

// This export is meant to be accessible from the outside (e.g the Webapp / UI)
export class E2EIServiceExternal extends TypedEventEmitter<Events> {
  private _acmeService?: AcmeService;
  private readonly enrollmentStorage: ReturnType<typeof createE2EIEnrollmentStorage>;

  public constructor(
    private readonly coreCryptoClient: CoreCrypto,
    private readonly coreDatabase: CoreDatabase,
    private readonly recurringTaskScheduler: RecurringTaskScheduler,
    private readonly clientService: ClientService,
    private readonly mlsService: MLSService,
  ) {
    super();
    this.enrollmentStorage = createE2EIEnrollmentStorage(coreDatabase);
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
    const textDecoder = new TextDecoder();

    // we get all the devices that have an identity (either valid, expired or revoked)
    const userIdentities = await this.coreCryptoClient.getUserIdentities(
      new ConversationId(groupIdBytes),
      userIds.map(userId => userId.id),
    );

    // We get all the devices in the conversation (in order to get devices that have no identity)
    const allUsersMLSDevices = (await this.coreCryptoClient.getClientIds(new ConversationId(groupIdBytes)))
      .map(id => textDecoder.decode(id.copyBytes()))
      .map(fullyQualifiedId => parseFullQualifiedClientId(fullyQualifiedId));

    const mappedUserIdentities = new Map<StringifiedQualifiedId, DeviceIdentity[]>();
    for (const userId of userIds) {
      const identities = (userIdentities.get(userId.id) || []).map(identity => ({
        ...identity,
        deviceId: parseFullQualifiedClientId(identity.clientId).client,
        qualifiedUserId: userId,
      }));

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
          clientId: id.client,
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
    const clientIds: Array<ClientId> = Object.entries(userClientsMap).map(
      ([clientId, userId]) => new ClientId(getE2EIClientId(clientId, userId.id, userId.domain).asBytes),
    );
    const deviceIdentities = await this.coreCryptoClient.getDeviceIdentities(
      new ConversationId(Decoder.fromBase64(groupId).asBytes),
      clientIds,
    );

    return deviceIdentities.map(identity => ({
      ...identity,
      deviceId: parseFullQualifiedClientId(identity.clientId).client,
      credentialType: identity.credentialType,
      qualifiedUserId: userClientsMap[identity.clientId],
    }));
  }

  public async isFreshMLSSelfClient(): Promise<boolean> {
    const client = await this.clientService.loadClient();
    return !client || !this.mlsService.isInitializedMLSClient(client);
  }

  private async registerLocalCertificateRoot(acmeService: AcmeService): Promise<string> {
    const localCertificateRoot = await acmeService.getLocalCertificateRoot();
    await this.coreCryptoClient.transaction(cx => cx.e2eiRegisterAcmeCA(localCertificateRoot));

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
    const certificates = await acmeService.getFederationCrossSignedCertificates();
    await Promise.all(
      certificates.map(cert => this.coreCryptoClient.transaction(cx => cx.e2eiRegisterIntermediateCA(cert))),
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
    const isRootRegistered = await this.coreCryptoClient.transaction(cx => cx.e2eiIsPKIEnvSetup());

    // Register root certificate if not already registered
    if (!isRootRegistered) {
      await this.registerLocalCertificateRoot(this.acmeService);
    }

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

  private async addCrlDistributionTimer({expiresAt, url}: {expiresAt: number; url: string}): Promise<void> {
    await this.coreDatabase.put('crls', {expiresAt, url}, url);
    this.scheduleCrlDistributionTimer({expiresAt, url});
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
    const {expiration: expirationTimestampSeconds, dirty} = await this.coreCryptoClient.transaction(cx =>
      cx.e2eiRegisterCRL(url, crl),
    );

    const expirationTimestamp = expirationTimestampSeconds && expirationTimestampSeconds * TimeInMillis.SECOND;

    await this.cancelCrlDistributionTimer(url);

    //set a new timer that will execute a task once the CRL is expired
    if (expirationTimestamp !== undefined) {
      await this.addCrlDistributionTimer({expiresAt: expirationTimestamp, url});
    }

    //if it was dirty, trigger e2eiconversationstate for every conversation
    if (dirty) {
      onDirty();
    }
  }

  private async handleNewCrlDistributionPoints(distributionPoints: string[]): Promise<void> {
    const uniqueDistributionPoints = Array.from(new Set(distributionPoints));
    for (const distributionPointUrl of uniqueDistributionPoints) {
      await this.validateCrlDistributionPoint(distributionPointUrl);
    }
  }
}
