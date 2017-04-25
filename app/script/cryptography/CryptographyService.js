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
window.z.cryptography = z.cryptography || {};

const URL_CLIENTS = '/clients';
const URL_USERS = '/users';

z.cryptography.CryptographyService = class CryptographyService {
  /**
   * Construct a new Cryptography Service.
   * @param {z.service.Client} client - Client for the API calls
   * @returns {CryptographyService} The new service for cryptography interactions
   */
  constructor(client) {
    this.client = client;
    this.logger = new z.util.Logger('z.cryptography.CryptographyService', z.config.LOGGER.OPTIONS);
    return this;
  }

  /**
   * Gets a pre-key for each client of a user client map.
   * @see https://staging-nginz-https.zinfra.io/swagger-ui/#!/users/getMultiPrekeyBundles
   *
   * @param {Object} user_client_map - User client map to request pre-keys for
   * @returns {Promise} Resolves with a pre-key for each client of the given map
   */
  get_users_pre_keys(user_client_map) {
    return this.client.send_json({
      data: user_client_map,
      type: 'POST',
      url: this.client.create_url(`${URL_USERS}/prekeys`),
    });
  }

  /**
   * Put pre-keys for client to be used by remote clients for session initialization.
   *
   * @param {string} client_id - Local client ID
   * @param {Array<string>} serialized_pre_keys - Additional pre-keys to be made available
   * @returns {Promise} Resolves once the pre-keys are accepted
   */
  put_client_prekeys(client_id, serialized_pre_keys) {
    return this.client.send_json({
      data: {
        prekeys: serialized_pre_keys,
      },
      type: 'PUT',
      url: this.client.create_url(`${URL_CLIENTS}/${client_id}`),
    });
  }
};
