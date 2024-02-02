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
import {CoreCrypto, E2eiConversationState, WireIdentity, DeviceStatus} from '@wireapp/core-crypto';

import {AcmeService} from './Connection';
import {getE2EIClientId} from './Helper';
import {E2EIStorage} from './Storage/E2EIStorage';

import {ClientService} from '../../../client';
import {CoreDatabase} from '../../../storage/CoreDB';
import {parseFullQualifiedClientId} from '../../../util/fullyQualifiedClientIdUtils';
import {LocalStorageStore} from '../../../util/LocalStorageStore';
import {LowPrecisionTaskScheduler} from '../../../util/LowPrecisionTaskScheduler';
import {stringifyQualifiedId} from '../../../util/qualifiedIdUtil';
import {RecurringTaskScheduler} from '../../../util/RecurringTaskScheduler';
import {MLSService} from '../MLSService';

export type DeviceIdentity = Omit<WireIdentity, 'free' | 'status'> & {status?: DeviceStatus; deviceId: string};

type Events = {
  remoteCrlChanged: undefined;
  selfCrlChanged: undefined;
};

// This export is meant to be accessible from the outside (e.g the Webapp / UI)
export class E2EIServiceExternal extends TypedEventEmitter<Events> {
  private _acmeService?: AcmeService;

  public constructor(
    private readonly coreCryptoClient: CoreCrypto,
    private readonly coreDatabase: CoreDatabase,
    private readonly recurringTaskScheduler: RecurringTaskScheduler,
    private readonly clientService: ClientService,
    private readonly mlsService: MLSService,
  ) {
    super();
    void this.initialiseCrlDistributionTimers();
    mlsService.on('newCrlDistributionPoints', this.handleNewRemoteCrlDistributionPoints);
  }

  // If we have a handle in the local storage, we are in the enrollment process (this handle is saved before oauth redirect)
  public isEnrollmentInProgress(): boolean {
    return E2EIStorage.has.handle();
  }

  public clearAllProgress(): void {
    E2EIStorage.remove.temporaryData();
  }

  public getConversationState(conversationId: Uint8Array): Promise<E2eiConversationState> {
    return this.coreCryptoClient.e2eiConversationState(conversationId);
  }

  public isE2EIEnabled(): Promise<boolean> {
    return this.coreCryptoClient.e2eiIsEnabled(this.mlsService.config.cipherSuite);
  }

  public async getAllGroupUsersIdentities(groupId: string): Promise<Map<string, DeviceIdentity[]>> {
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

  public async getUsersIdentities(groupId: string, userIds: QualifiedId[]): Promise<Map<string, DeviceIdentity[]>> {
    const groupIdBytes = Decoder.fromBase64(groupId).asBytes;
    const textDecoder = new TextDecoder();

    // we get all the devices that have an identity (either valid, expired or revoked)
    const userIdentities = await this.coreCryptoClient.getUserIdentities(
      groupIdBytes,
      userIds.map(userId => userId.id),
    );

    // We get all the devices in the conversation (in order to get devices that have no identity)
    const allUsersMLSDevices = (await this.coreCryptoClient.getClientIds(groupIdBytes))
      .map(id => textDecoder.decode(id))
      .map(fullyQualifiedId => parseFullQualifiedClientId(fullyQualifiedId));

    const mappedUserIdentities = new Map<string, DeviceIdentity[]>();
    for (const userId of userIds) {
      const identities = (userIdentities.get(userId.id) || []).map(identity => ({
        ...identity,
        deviceId: parseFullQualifiedClientId((identity as any).client_id).client,
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
          clientId: id.client,
        }));

      mappedUserIdentities.set(userId.id, [...identities, ...basicMLSDevices]);
    }

    return mappedUserIdentities;
  }

  // Returns devices e2ei certificates
  public async getDevicesIdentities(
    groupId: string,
    userClientsMap: Record<string, QualifiedId>,
  ): Promise<DeviceIdentity[]> {
    const clientIds = Object.entries(userClientsMap).map(
      ([clientId, userId]) => getE2EIClientId(clientId, userId.id, userId.domain).asBytes,
    );
    const deviceIdentities = await this.coreCryptoClient.getDeviceIdentities(
      Decoder.fromBase64(groupId).asBytes,
      clientIds,
    );

    return deviceIdentities.map(identity => ({
      ...identity,
      deviceId: parseFullQualifiedClientId((identity as any).client_id).client,
    }));
  }

  public async isFreshMLSSelfClient(): Promise<boolean> {
    const client = await this.clientService.loadClient();
    if (!client) {
      return true;
    }
    return typeof client.mls_public_keys.ed25519 !== 'string' || client.mls_public_keys.ed25519.length === 0;
  }

  private async registerLocalCertificateRoot(acmeService: AcmeService): Promise<string> {
    const localCertificateRoot = await acmeService.getLocalCertificateRoot();
    await this.coreCryptoClient.e2eiRegisterAcmeCA(localCertificateRoot);

    return localCertificateRoot;
  }

  public async initialize(discoveryUrl: string): Promise<void> {
    this._acmeService = new AcmeService(discoveryUrl);
  }

  private get acmeService(): AcmeService {
    if (!this._acmeService) {
      throw new Error('AcmeService not initialized');
    }
    return this._acmeService;
  }

  private async registerCrossSignedCertificates(acmeService: AcmeService): Promise<void> {
    const certificates = await acmeService.getFederationCrossSignedCertificates();
    await Promise.all(certificates.map(cert => this.coreCryptoClient.e2eiRegisterIntermediateCA(cert)));
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
   *
   * @param discoveryUrl
   */
  public async registerServerCertificates(): Promise<void> {
    const ROOT_CA_KEY = 'e2ei_root-registered';
    const store = LocalStorageStore(ROOT_CA_KEY);

    // Register root certificate if not already registered
    if (!store.has(ROOT_CA_KEY)) {
      await this.registerLocalCertificateRoot(this.acmeService);
      store.add(ROOT_CA_KEY, 'true');
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

  public async getCRLFromDistributionPoint(distributionPointUrl: string): Promise<Uint8Array> {
    return this.acmeService.getCRLFromDistributionPoint(distributionPointUrl);
  }

  private scheduleCrlDistributionTimer({expiresAt, url}: {expiresAt: number; url: string}): void {
    LowPrecisionTaskScheduler.addTask({
      intervalDelay: TimeInMillis.SECOND,
      firingDate: expiresAt,
      key: url,
      task: () => this.validateRemoteCrlDistributionPoint(url),
    });
  }

  private async initialiseCrlDistributionTimers(): Promise<void> {
    const crls = await this.coreDatabase.getAll('crls');

    for (const crl of crls) {
      this.scheduleCrlDistributionTimer(crl);
    }
  }

  private async addCrlDistributionTimer({expiresAt, url}: {expiresAt: number; url: string}): Promise<void> {
    await this.coreDatabase.add('crls', {expiresAt, url}, url);
    this.scheduleCrlDistributionTimer({expiresAt, url});
  }

  private async cancelCrlDistributionTimer(url: string): Promise<void> {
    await this.coreDatabase.delete('crls', url);
  }

  public async validateSelfCrl(): Promise<void> {
    const {crl, url} = await this.acmeService.getSelfCRL();

    await this.validateCrl(url, crl, async () => {
      this.emit('selfCrlChanged');
    });
  }

  private async validateRemoteCrlDistributionPoint(distributionPointUrl: string): Promise<void> {
    const domain = new URL(distributionPointUrl).hostname;
    const crl = await this.getCRLFromDistributionPoint(domain);

    await this.validateCrl(distributionPointUrl, crl, async () => {
      this.emit('remoteCrlChanged');
    });
  }

  private async validateCrl(url: string, crl: Uint8Array, onDirty: () => Promise<void>): Promise<void> {
    const {expiration: expirationTimestampSeconds, dirty} = await this.coreCryptoClient.e2eiRegisterCRL(url, crl);

    const expirationTimestamp = expirationTimestampSeconds && expirationTimestampSeconds * TimeInMillis.SECOND;

    await this.cancelCrlDistributionTimer(url);

    //set a new timer that will execute a task once the CRL is expired
    if (expirationTimestamp !== undefined) {
      await this.addCrlDistributionTimer({expiresAt: expirationTimestamp, url});
    }

    //if it was dirty, trigger e2eiconversationstate for every conversation
    if (dirty) {
      await onDirty();
    }
  }

  private async handleNewRemoteCrlDistributionPoints(distributionPoints: string[]): Promise<void> {
    for (const distributionPointUrl of distributionPoints) {
      await this.validateRemoteCrlDistributionPoint(distributionPointUrl);
    }
  }
}
