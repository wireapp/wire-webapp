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

import type {AxiosRequestConfig} from 'axios';

import type {Connection, ConnectionUpdate} from '../connection/';
import {BackendError, BackendErrorLabel, HttpClient} from '../http/';
import {QualifiedId} from '../user';
import {ConnectionLegalholdMissingConsentError} from './ConnectionError';

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
  public async getConnection({domain, id}: QualifiedId): Promise<Connection> {
    const url = `${ConnectionAPI.URL.CONNECTIONS}/${domain}/${id}`;

    const config: AxiosRequestConfig = {
      method: 'get',
      url,
    };

    const response = await this.client.sendJSON<Connection>(config);
    return response.data;
  }

  /**
   * Get the list of all the connections to other users (including users that are on federated servers)
   *
   * @see https://nginz-https.anta.wire.link/api/swagger-ui/#/default/post_list_connections
   */
  public getConnectionList(): Promise<Connection[]> {
    let allConnections: Connection[] = [];

    const getConnectionChunks = async (pagingState?: string): Promise<Connection[]> => {
      const connectionsPerRequest = 500;
      const config: AxiosRequestConfig = {
        method: 'POST',
        data: {
          size: connectionsPerRequest,
          paging_state: pagingState,
        },
        url: '/list-connections',
      };

      const {data} = await this.client.sendJSON<{
        connections: Connection[];
        has_more?: boolean;
        paging_state?: string;
      }>(config);

      const {connections, has_more, paging_state} = data;

      if (connections.length) {
        allConnections = allConnections.concat(connections);
      }

      if (has_more) {
        return getConnectionChunks(paging_state);
      }

      return allConnections;
    };

    return getConnectionChunks();
  }

  /**
   * Create a connection to another user.
   * Note: You can have no more than 1000 connections in accepted or sent state.
   * @param qualifiedUserId: The qualified id of the user we want to connect to
   * @see https://nginz-https.anta.wire.link/api/swagger-ui/#/default/post_connections__uid_domain___uid
   */
  public async postConnection({domain, id}: QualifiedId): Promise<Connection> {
    const config: AxiosRequestConfig = {
      method: 'post',
      url: `${ConnectionAPI.URL.CONNECTIONS}/${domain}/${id}`,
    };

    try {
      const response = await this.client.sendJSON<Connection>(config);
      return response.data;
    } catch (error) {
      switch ((error as BackendError).label) {
        case BackendErrorLabel.LEGAL_HOLD_MISSING_CONSENT: {
          throw new ConnectionLegalholdMissingConsentError((error as BackendError).message);
        }
      }
      throw error;
    }
  }

  /**
   * Update a connection.
   * Note: You can have no more than 1000 connections in accepted or sent state.
   * @param userId The ID of the other user (qualified or not)
   * @param updatedConnection: The updated connection
   * @see https://staging-nginz-https.zinfra.io/swagger-ui/#!/users/updateConnection
   */
  public async putConnection({domain, id}: QualifiedId, updatedConnection: ConnectionUpdate): Promise<Connection> {
    const url = `${ConnectionAPI.URL.CONNECTIONS}/${domain}/${id}`;

    const config: AxiosRequestConfig = {
      data: updatedConnection,
      method: 'put',
      url,
    };

    const response = await this.client.sendJSON<Connection>(config);
    return response.data;
  }
}
