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
import {Decoder} from 'bazinga64';

import {Ciphersuite, CoreCrypto, E2eiConversationState, WireIdentity, DeviceStatus} from '@wireapp/core-crypto';

import {getE2EIClientId} from './Helper';
import {E2EIStorage} from './Storage/E2EIStorage';

import {ClientService} from '../../../client';
import {parseFullQualifiedClientId} from '../../../util/fullyQualifiedClientIdUtils';

export type DeviceIdentity = Omit<WireIdentity, 'free' | 'status'> & {status?: DeviceStatus; deviceId: string};

// This export is meant to be accessible from the outside (e.g the Webapp / UI)
export class E2EIServiceExternal {
  public constructor(
    private readonly coreCryptoClient: CoreCrypto,
    private readonly clientService: ClientService,
  ) {}

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

  public isE2EIEnabled(ciphersuite: Ciphersuite): Promise<boolean> {
    return this.coreCryptoClient.e2eiIsEnabled(ciphersuite);
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
}
