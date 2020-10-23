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

import {ClientRecord} from '../storage';
import {ClientEntity} from './ClientEntity';

export class ClientMapper {
  static get CONFIG() {
    return {
      CLIENT_PAYLOAD: ['class', 'id'],
      SELF_CLIENT_PAYLOAD: ['address', 'cookie', 'label', 'location', 'model', 'time', 'type'],
    };
  }

  /**
   * Maps a JSON into a Client entity.
   *
   * @param isSelfClient Creating self client
   * @returns Mapped client entity
   */
  static mapClient(clientPayload: Record<string, any>, isSelfClient: boolean): ClientEntity {
    const clientEntity = new ClientEntity(isSelfClient);

    ClientMapper.CONFIG.CLIENT_PAYLOAD.forEach(name => ClientMapper._mapMember(clientEntity, clientPayload, name));

    if (isSelfClient) {
      ClientMapper.CONFIG.SELF_CLIENT_PAYLOAD.forEach(name =>
        ClientMapper._mapMember(clientEntity, clientPayload, name),
      );
    }

    if (clientPayload.meta) {
      const {userId} = ClientEntity.dismantleUserClientId(clientPayload.meta.primary_key);

      clientEntity.meta.isVerified(clientPayload.meta.is_verified);
      clientEntity.meta.primaryKey = clientPayload.meta.primary_key;
      clientEntity.meta.userId = userId;
    }

    return clientEntity;
  }

  /**
   * Maps an object of client IDs with their payloads to client entities.
   *
   * @param clientsPayload Clients data
   * @param isSelfClient Creating self client
   * @returns Mapped client entities
   */
  static mapClients(clientsPayload: Record<string, any>[], isSelfClient: boolean): ClientEntity[] {
    return clientsPayload.map(clientPayload => ClientMapper.mapClient(clientPayload, isSelfClient));
  }

  /**
   * Update a client entity or object from JSON.
   *
   * @param clientData Client data as entity or object
   * @param updatePayload JSON possibly containing updates
   * @returns Contains the client and whether there was a change
   */
  static updateClient<T extends ClientRecord>(
    clientData: T,
    updatePayload: Partial<T>,
  ): {client: T; wasUpdated: boolean} {
    let containsUpdate = false;

    for (const member in updatePayload) {
      const isDataChange = JSON.stringify(clientData[member]) !== JSON.stringify(updatePayload[member]);

      if (isDataChange) {
        containsUpdate = true;
        clientData[member] = updatePayload[member];
      }
    }

    return {client: clientData, wasUpdated: containsUpdate};
  }

  static _mapMember(clientEntity: any, clientPayload: any, memberName: string): void {
    const payloadValue = clientPayload[memberName];
    const isMemberUndefined = payloadValue === undefined;
    if (!isMemberUndefined) {
      clientEntity[memberName] = payloadValue;
    }
  }
}
