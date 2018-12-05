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
window.z.connection = z.connection || {};

z.connection.ConnectionService = class ConnectionService {
  static get URL() {
    return {
      CONNECTIONS: '/connections',
    };
  }

  /**
   * Construct a new Connection Service.
   * @class z.connection.ConnectionService
   * @param {z.service.BackendClient} backendClient - Client for the API calls
   */
  constructor(backendClient) {
    this.backendClient = backendClient;
    this.logger = new z.util.Logger('z.connection.ConnectionService', z.config.LOGGER.OPTIONS);
  }

  /**
   * Retrieves a list of connections to other users.
   *
   * @note The list is already pre-ordered by the backend, so in order to fetch more connections
   * than the limit, you only have to pass the User ID (which is not from the self user)
   * of the last connection item from the received list.
   * @see https://staging-nginz-https.zinfra.io/swagger-ui/tab.html#!//connections
   *
   * @param {number} limit - Number of results to return (default 100, max 500)
   * @param {string} userId - User ID to start from
   * @returns {Promise} Promise that resolves with user connections
   */
  getConnections(limit = 500, userId) {
    return this.backendClient.sendRequest({
      data: {
        size: limit,
        start: userId,
      },
      type: 'GET',
      url: ConnectionService.URL.CONNECTIONS,
    });
  }

  /**
   * Create a connection request to another user.
   *
   * @see https://staging-nginz-https.zinfra.io/swagger-ui/tab.html#!//createConnection
   *
   * @param {string} userId - User ID of the user to request a connection with
   * @param {string} name - Name of the conversation being initiated (1 - 256 characters)
   * @returns {Promise} Promise that resolves when the connection request was created
   */
  postConnections(userId, name) {
    return this.backendClient.sendJson({
      data: {
        message: ' ',
        name: name,
        user: userId,
      },
      type: 'POST',
      url: ConnectionService.URL.CONNECTIONS,
    });
  }

  /**
   * Updates a connection to another user.
   *
   * @example status: ['accepted', 'blocked', 'pending', 'ignored', 'sent' or 'cancelled']
   * @see https://staging-nginz-https.zinfra.io/swagger-ui/tab.html#!//updateConnection
   *
   * @param {string} userId - User ID of the other user
   * @param {z.connection.ConnectionStatus} connectionStatus - New relation status
   * @returns {Promise} Promise that resolves when the status was updated
   */
  putConnections(userId, connectionStatus) {
    return this.backendClient.sendJson({
      data: {
        status: connectionStatus,
      },
      type: 'PUT',
      url: `${ConnectionService.URL.CONNECTIONS}/${userId}`,
    });
  }
};
