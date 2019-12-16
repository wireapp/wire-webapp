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

import {AxiosRequestConfig} from 'axios';

import {Connection, ConnectionRequest, ConnectionUpdate, UserConnectionList} from '../connection/';
import {HttpClient} from '../http/';

export class ConnectionAPI {
  constructor(private readonly client: HttpClient) {}

  public static readonly URL = {
    CONNECTIONS: '/connections',
  };

  /**
   * Get an existing connection to another user.
   * @param userId The ID of the other user
   * @see https://staging-nginz-https.zinfra.io/swagger-ui/#!/users/connection
   */
  public async getConnection(userId: string): Promise<Connection> {
    const config: AxiosRequestConfig = {
      method: 'get',
      url: `${ConnectionAPI.URL.CONNECTIONS}/${userId}`,
    };

    const response = await this.client.sendJSON<Connection>(config);
    return response.data;
  }

  /**
   * List the connections to other users.
   * @param limit Number of results to return (default 100, max 500)
   * @param connectionId The connection ID to start from
   * @see https://staging-nginz-https.zinfra.io/swagger-ui/#!/users/connections
   */
  public async getConnections(connectionId?: string, limit = 100): Promise<UserConnectionList> {
    const config: AxiosRequestConfig = {
      method: 'get',
      params: {
        size: limit,
        start: connectionId,
      },
      url: ConnectionAPI.URL.CONNECTIONS,
    };

    const response = await this.client.sendJSON<UserConnectionList>(config);
    return response.data;
  }

  /**
   * Get all connections to other users.
   */
  public getAllConnections(): Promise<Connection[]> {
    let allConnections: Connection[] = [];

    const getConnectionChunks = async (connectionId?: string): Promise<Connection[]> => {
      const connectionsPerRequest = 500;
      const {connections, has_more} = await this.getConnections(connectionId, connectionsPerRequest);

      if (connections.length) {
        allConnections = allConnections.concat(connections);
      }

      if (has_more) {
        const lastConnection = connections.pop();
        if (lastConnection) {
          return getConnectionChunks(lastConnection.to);
        }
      }

      return allConnections;
    };

    return getConnectionChunks();
  }

  /**
   * Create a connection to another user.
   * Note: You can have no more than 1000 connections in accepted or sent state.
   * @param connectionRequestData: The connection request
   * @see https://staging-nginz-https.zinfra.io/swagger-ui/#!/users/createConnection
   */
  public async postConnection(connectionRequestData: ConnectionRequest): Promise<Connection> {
    const config: AxiosRequestConfig = {
      data: connectionRequestData,
      method: 'post',
      url: ConnectionAPI.URL.CONNECTIONS,
    };

    const response = await this.client.sendJSON<Connection>(config);
    return response.data;
  }

  /**
   * Update a connection.
   * Note: You can have no more than 1000 connections in accepted or sent state.
   * @param userId The ID of the other user
   * @param updatedConnection: The updated connection
   * @see https://staging-nginz-https.zinfra.io/swagger-ui/#!/users/updateConnection
   */
  public async putConnection(userId: string, updatedConnection: ConnectionUpdate): Promise<Connection> {
    const config: AxiosRequestConfig = {
      data: updatedConnection,
      method: 'put',
      url: `${ConnectionAPI.URL.CONNECTIONS}/${userId}`,
    };

    const response = await this.client.sendJSON<Connection>(config);
    return response.data;
  }
}
