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

import {AxiosRequestConfig, AxiosResponse} from 'axios';

import {Connection, ConnectionRequest, ConnectionUpdate, UserConnectionList} from '../connection';
import {HttpClient} from '../http';

class ConnectionAPI {
  constructor(private readonly client: HttpClient) {}

  static get URL() {
    return {
      CONNECTIONS: '/connections',
    };
  }

  /**
   * Get an existing connection to another user.
   * @param userId The ID of the other user
   * @see https://staging-nginz-https.zinfra.io/swagger-ui/#!/users/connection
   */
  public getConnection(userId: string): Promise<Connection> {
    const config: AxiosRequestConfig = {
      method: 'get',
      url: `${ConnectionAPI.URL.CONNECTIONS}/${userId}`,
    };

    return this.client.sendJSON(config).then((response: AxiosResponse) => response.data);
  }

  /**
   * List the connections to other users.
   * @param limit Number of results to return (default 100, max 500)
   * @param connectionId The connection ID to start from
   * @see https://staging-nginz-https.zinfra.io/swagger-ui/#!/users/connections
   */
  public getConnections(limit: number = 100, connectionId?: string): Promise<UserConnectionList> {
    const config: AxiosRequestConfig = {
      method: 'get',
      params: {
        size: limit,
      },
      url: ConnectionAPI.URL.CONNECTIONS,
    };

    if (connectionId) {
      config.params.start = connectionId;
    }

    return this.client.sendJSON(config).then((response: AxiosResponse) => response.data);
  }

  /**
   * Create a connection to another user.
   * Note: You can have no more than 1000 connections in accepted or sent state.
   * @param connectionRequestData: The connection request
   * @see https://staging-nginz-https.zinfra.io/swagger-ui/#!/users/createConnection
   */
  public postConnection(connectionRequestData: ConnectionRequest): Promise<Connection> {
    const config: AxiosRequestConfig = {
      data: connectionRequestData,
      method: 'post',
      url: ConnectionAPI.URL.CONNECTIONS,
    };

    return this.client.sendJSON(config).then((response: AxiosResponse) => response.data);
  }

  /**
   * Update a connection.
   * Note: You can have no more than 1000 connections in accepted or sent state.
   * @param updatedConnection: The updated connection
   * @see https://staging-nginz-https.zinfra.io/swagger-ui/#!/users/updateConnection
   */
  public putConnection(updatedConnection: ConnectionUpdate): Promise<Connection> {
    const config: AxiosRequestConfig = {
      data: updatedConnection,
      method: 'put',
      url: ConnectionAPI.URL.CONNECTIONS,
    };

    return this.client.sendJSON(config).then((response: AxiosResponse) => response.data);
  }
}

export {ConnectionAPI};
