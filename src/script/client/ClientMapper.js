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

window.z = window.z || {};
window.z.client = z.client || {};

z.client.ClientMapper = class ClientMapper {
  static get CONFIG() {
    return {
      CLIENT_PAYLOAD: ['class', 'id'],
      SELF_CLIENT_PAYLOAD: ['address', 'cookie', 'label', 'location', 'model', 'time', 'type'],
    };
  }

  constructor() {}

  /**
   * Maps a JSON into a Client entity.
   *
   * @param {Object} clientPayload - Client data
   * @param {boolean} isSelfClient - Creating self client
   * @returns {z.client.ClientEntity} Mapped client entity
   */
  mapClient(clientPayload, isSelfClient) {
    const clientEntity = new z.client.ClientEntity(isSelfClient);

    ClientMapper.CONFIG.CLIENT_PAYLOAD.forEach(name => this._mapMember(clientEntity, clientPayload, name));

    if (isSelfClient) {
      ClientMapper.CONFIG.SELF_CLIENT_PAYLOAD.forEach(name => this._mapMember(clientEntity, clientPayload, name));
    }

    if (clientPayload.meta) {
      const {userId} = z.client.ClientEntity.dismantleUserClientId(clientPayload.meta.primary_key);

      clientEntity.meta.isVerified(clientPayload.meta.is_verified);
      clientEntity.meta.primaryKey = clientPayload.meta.primary_key;
      clientEntity.meta.userId = userId;
    }

    return clientEntity;
  }

  /**
   * Maps an object of client IDs with their payloads to client entities.
   *
   * @param {Array<Object>} clientsPayload - Clients data
   * @param {boolean} isSelfClient - Creating self client
   * @returns {Array<z.client.ClientEntity>} - Mapped client entities
   */
  mapClients(clientsPayload, isSelfClient) {
    return clientsPayload.map(clientPayload => this.mapClient(clientPayload, isSelfClient));
  }

  /**
   * Update a client entity or object from JSON.
   *
   * @param {z.client.ClientEntity|Object} clientData - Client data
   * @param {Object} updatePayload - JSON possibly containing updates
   * @returns {Object} Contains the client and whether there was a change
   */
  updateClient(clientData, updatePayload) {
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

  _mapMember(clientEntity, clientPayload, memberName) {
    const payloadValue = clientPayload[memberName];
    const isMemberUndefined = payloadValue === undefined;
    if (!isMemberUndefined) {
      clientEntity[memberName] = payloadValue;
    }
  }
};
