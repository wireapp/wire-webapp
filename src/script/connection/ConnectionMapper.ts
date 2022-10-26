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

import type {Connection as ConnectionData} from '@wireapp/api-client/lib/connection/';

import {ConnectionEntity} from './ConnectionEntity';

/**
 * Connection mapper to convert all server side JSON connections into core connection entities.
 */
export class ConnectionMapper {
  static mapConnectionFromJson(connectionData: ConnectionData): ConnectionEntity {
    const connectionEntity = new ConnectionEntity();
    return ConnectionMapper.updateConnectionFromJson(connectionEntity, connectionData);
  }

  /**
   * Convert multiple JSON connections into connection entities.
   */
  static mapConnectionsFromJson(connectionsData: ConnectionData[]): ConnectionEntity[] {
    return connectionsData
      .filter(Boolean)
      .map(connectionData => ConnectionMapper.mapConnectionFromJson(connectionData));
  }

  /**
   * Updates a connection entity in-place.
   */
  static updateConnectionFromJson(
    connectionEntity: ConnectionEntity,
    connectionData: ConnectionData,
  ): ConnectionEntity {
    const {
      conversation,
      qualified_conversation,
      qualified_to,
      from,
      last_update,
      message,
      status,
      to: remoteUserId,
    } = connectionData;

    connectionEntity.status(status);
    connectionEntity.conversationId = qualified_conversation || {domain: '', id: conversation};
    connectionEntity.userId = qualified_to || {domain: '', id: remoteUserId};
    connectionEntity.from = from;
    connectionEntity.lastUpdate = last_update;
    connectionEntity.message = message;

    return connectionEntity;
  }
}
