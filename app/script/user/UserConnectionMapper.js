/*
 * Wire
 * Copyright (C) 2017 Wire Swiss GmbH
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
window.z.user = z.user || {};

/**
 * Connection mapper to convert all server side JSON connections into core connection entities.
 * @class z.user.UserConnectionMapper
 */
z.user.UserConnectionMapper = class UserConnectionMapper {
  // Construct a new user mapper.
  constructor() {
    this.logger = new z.util.Logger('z.user.UserConnectionMapper', z.config.LOGGER.OPTIONS);

    /**
     * Converts JSON connection into connection entity.
     * @param {JSON} data - Connection data
     * @returns {z.entity.Connection} Mapped connection entity
     */
    this.map_user_connection_from_json = function(data) {
      const connection_et = new z.entity.Connection();
      return this.update_user_connection_from_json(connection_et, data);
    };

    /**
     * Convert multiple JSON connections into connection entities.
     * @param {Object} data - Connection data
     * @returns {Array<z.entity.Connection>} Mapped connection entities
     */
    this.map_user_connections_from_json = function(data) {
      return data
        .filter(connection => connection !== undefined)
        .map(connection => this.map_user_connection_from_json(connection));
    };

    /**
     * Maps JSON connection into a blank connection entity or updates an existing one.
     * @param {z.entity.Connection} connection_et - Connection entity that the info shall be mapped to
     * @param {JSON} data - Connection data
     * @returns {z.entity.Connection} Mapped connection entity
     */
    this.update_user_connection_from_json = function(connection_et, data) {
      connection_et.status(data.status);
      connection_et.conversation_id = data.conversation;
      connection_et.to = data.to;
      connection_et.from = data.from;
      connection_et.last_update = data.last_update;
      connection_et.message = data.message;
      return connection_et;
    };
  }
};
