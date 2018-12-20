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

'use strict';

window.z = window.z || {};
window.z.cryptography = z.cryptography || {};

z.cryptography.CryptographyService = class CryptographyService {
  static get CONFIG() {
    return {
      URL_CLIENTS: '/clients',
      URL_USERS: '/users',
    };
  }

  /**
   * Construct a new Cryptography Service.
   * @param {z.service.BackendClient} backendClient - Client for the API calls
   */
  constructor(backendClient) {
    this.backendClient = backendClient;
    this.logger = new z.util.Logger('z.cryptography.CryptographyService', z.config.LOGGER.OPTIONS);
  }

  /**
   * Gets a pre-key for a client of a user.
   * @see https://staging-nginz-https.zinfra.io/swagger-ui/#!/users/getPrekey
   *
   * @param {string} userId - User ID
   * @param {string} clientId - Client ID
   * @returns {Promise} Resolves with a pre-key for given the client of the user
   */
  getUserPreKeyByIds(userId, clientId) {
    return this.backendClient.sendJson({
      type: 'GET',
      url: `${CryptographyService.CONFIG.URL_USERS}/${userId}/prekeys/${clientId}`,
    });
  }

  /**
   * Gets a pre-key for each client of a user client map.
   * @see https://staging-nginz-https.zinfra.io/swagger-ui/#!/users/getMultiPrekeyBundles
   *
   * @param {Object} recipients - User client map to request pre-keys for
   * @returns {Promise} Resolves with a pre-key for each client of the given map
   */
  getUsersPreKeys(recipients) {
    return this.backendClient.sendJson({
      data: recipients,
      type: 'POST',
      url: `${CryptographyService.CONFIG.URL_USERS}/prekeys`,
    });
  }

  /**
   * Put pre-keys for client to be used by remote clients for session initialization.
   *
   * @param {string} clientId - Local client ID
   * @param {Array<string>} serializedPreKeys - Additional pre-keys to be made available
   * @returns {Promise} Resolves once the pre-keys are accepted
   */
  putClientPreKeys(clientId, serializedPreKeys) {
    return this.backendClient.sendJson({
      data: {
        prekeys: serializedPreKeys,
      },
      type: 'PUT',
      url: `${CryptographyService.CONFIG.URL_CLIENTS}/${clientId}`,
    });
  }
};
