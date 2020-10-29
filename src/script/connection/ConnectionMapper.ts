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

import type {Connection as ConnectionData} from '@wireapp/api-client/src/connection/';

import {Logger, getLogger} from 'Util/Logger';
import {ConnectionEntity} from './ConnectionEntity';

/**
 * Connection mapper to convert all server side JSON connections into core connection entities.
 */
export class ConnectionMapper {
  readonly logger: Logger;

  constructor() {
    this.logger = getLogger('ConnectionMapper');
  }

  mapConnectionFromJson(connectionData: ConnectionData): ConnectionEntity {
    const connectionEntity = new ConnectionEntity();
    return this.updateConnectionFromJson(connectionEntity, connectionData);
  }

  /**
   * Convert multiple JSON connections into connection entities.
   * @param connectionsData Connection data
   */
  mapConnectionsFromJson(connectionsData: ConnectionData[]): ConnectionEntity[] {
    return connectionsData.filter(Boolean).map(connectionData => this.mapConnectionFromJson(connectionData));
  }

  /**
   * Maps JSON connection into a blank connection entity or updates an existing one.
   * @param connectionEntity Connection entity that the info shall be mapped to
   */
  updateConnectionFromJson(connectionEntity: ConnectionEntity, connectionData: ConnectionData): ConnectionEntity {
    const {conversation, from, last_update, message, status, to: remoteUserId} = connectionData;

    connectionEntity.status(status);
    connectionEntity.conversationId = conversation;
    connectionEntity.userId = remoteUserId;
    connectionEntity.from = from;
    connectionEntity.lastUpdate = last_update;
    connectionEntity.message = message;

    return connectionEntity;
  }
}
