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

/**
 * Connection mapper to convert all server side JSON connections into core connection entities.
 * @class z.connection.ConnectionMapper
 */
z.connection.ConnectionMapper = class ConnectionMapper {
  // Construct a new connection mapper.
  constructor() {
    this.logger = new z.util.Logger('z.connection.ConnectionMapper', z.config.LOGGER.OPTIONS);

    /**
     * Converts JSON connection into connection entity.
     * @param {Object} connectionData - Connection data
     * @returns {z.connection.ConnectionEntity} Mapped connection entity
     */
    this.mapConnectionFromJson = connectionData => {
      const connectionEntitiy = new z.connection.ConnectionEntity();
      return this.updateConnectionFromJson(connectionEntitiy, connectionData);
    };

    /**
     * Convert multiple JSON connections into connection entities.
     * @param {Array<Object>} connectionsData - Connection data
     * @returns {Array<z.connection.ConnectionEntity>} Mapped connection entities
     */
    this.mapConnectionsFromJson = connectionsData => {
      return connectionsData
        .filter(connectionData => connectionData)
        .map(connectionData => this.mapConnectionFromJson(connectionData));
    };

    /**
     * Maps JSON connection into a blank connection entity or updates an existing one.
     * @param {z.connection.ConnectionEntity} connectionEntity - Connection entity that the info shall be mapped to
     * @param {JSON} connectionData - Connection data
     * @returns {z.connection.ConnectionEntity} Mapped connection entity
     */
    this.updateConnectionFromJson = (connectionEntity, connectionData) => {
      const {conversation, from, last_update, message, status, to: remoteUserId} = connectionData;

      connectionEntity.status(status);
      connectionEntity.conversationId = conversation;
      connectionEntity.userId = remoteUserId;
      connectionEntity.from = from;
      connectionEntity.lastUpdate = last_update;
      connectionEntity.message = message;
      return connectionEntity;
    };
  }
};
