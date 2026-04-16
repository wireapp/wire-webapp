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

import type {Connection, ConnectionStatus} from '@wireapp/api-client/lib/connection/';
import {QualifiedId} from '@wireapp/api-client/lib/user';
import {container} from 'tsyringe';

import {APIClient} from '../../service/APIClientSingleton';

export class ConnectionService {
  constructor(private readonly apiClient = container.resolve(APIClient)) {}

  /**
   * Retrieves a list of connections to other users.
   *
   * @note The list is already pre-ordered by the backend, so in order to fetch more connections
   * than the limit, you only have to pass the User ID (which is not from the self user)
   * of the last connection item from the received list.
   * @see https://staging-nginz-https.zinfra.io/swagger-ui/tab.html#!//connections
   *
   * @param limit Number of results to return (default 100, max 500)
   * @param userId User ID to start from
   * @returns Promise that resolves with user connections
   */
  getConnections(): Promise<Connection[]> {
    return this.apiClient.api.connection.getConnectionList();
  }

  /**
   * Create a connection request to another user.
   *
   * @see https://staging-nginz-https.zinfra.io/swagger-ui/tab.html#!//createConnection
   *
   * @param userId User ID of the user to request a connection with
   * @returns Promise that resolves when the connection request was created
   */
  postConnections(userId: QualifiedId): Promise<Connection> {
    return this.apiClient.api.connection.postConnection(userId);
  }

  /**
   * Updates a connection to another user.
   *
   * @example status: ['accepted', 'blocked', 'pending', 'ignored', 'sent' or 'cancelled']
   * @see https://staging-nginz-https.zinfra.io/swagger-ui/tab.html#!//updateConnection
   *
   * @param userId User ID of the other user
   * @param connectionStatus New relation status
   * @returns Promise that resolves when the status was updated
   */
  putConnections(userId: QualifiedId, status: ConnectionStatus): Promise<Connection> {
    return this.apiClient.api.connection.putConnection(userId, {
      status,
    });
  }
}
