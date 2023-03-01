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

import {Connection, ConnectionStatus} from '@wireapp/api-client/lib/connection/';
import {QualifiedId} from '@wireapp/api-client/lib/user';

import {APIClient} from '@wireapp/api-client';

export class ConnectionService {
  constructor(private readonly apiClient: APIClient) {}

  public getConnections(): Promise<Connection[]> {
    return this.apiClient.api.connection.getConnectionList();
  }

  public acceptConnection(userId: QualifiedId): Promise<Connection> {
    return this.apiClient.api.connection.putConnection(userId, {
      status: ConnectionStatus.ACCEPTED,
    });
  }

  public ignoreConnection(userId: QualifiedId): Promise<Connection> {
    return this.apiClient.api.connection.putConnection(userId, {
      status: ConnectionStatus.IGNORED,
    });
  }

  public createConnection(userId: QualifiedId): Promise<Connection> {
    return this.apiClient.api.connection.postConnection(userId);
  }
}
