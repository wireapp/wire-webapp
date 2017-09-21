/*
 * Wire
 * Copyright (C) 2017 Wire Swiss GmbH
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

'use strict';

window.z = window.z || {};
window.z.client = z.client || {};

z.client.ClientMapper = class ClientMapper {
  constructor() {}

  /**
   * Maps a JSON into a Client entity.
   * @param {Object} client_payload - Client data
   * @returns {z.client.Client} Mapped client entity
   */
  map_client(client_payload) {
    const client_et = new z.client.Client(client_payload);

    if (client_payload.meta) {
      client_et.meta.is_verified(client_payload.meta.is_verified);
      client_et.meta.primary_key = client_payload.meta.primary_key;
      client_et.meta.user_id = z.client.Client.dismantle_user_client_id(client_payload.meta.primary_key).user_id;
    }

    return client_et;
  }

  /**
   * Maps an object of client IDs with their payloads to client entities.
   * @param {Array<Object>} clients_payload - Clients data
   * @returns {Array<z.client.Client>} - Mapped client entities
   */
  map_clients(clients_payload) {
    return clients_payload.map(client_payload => this.map_client(client_payload));
  }

  /**
   * Update a client entity or object from JSON.
   *
   * @param {z.client.Client|Object} client - Client data
   * @param {Object} update_payload - JSON possibly containing updates
   * @returns {Object} Contains the client and whether there was a change
   */
  update_client(client, update_payload) {
    let contains_update = false;

    for (const member in update_payload) {
      if (JSON.stringify(client[member]) !== JSON.stringify(update_payload[member])) {
        contains_update = true;
        client[member] = update_payload[member];
      }
    }

    return {client: client, was_updated: contains_update};
  }
};
