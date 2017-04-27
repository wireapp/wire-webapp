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

z.user.UserMapper = class UserMapper {
  /**
   * Construct a new User Mapper.
   * @class z.user.UserMapper
   * @param {z.assets.AssetService} asset_service - Backend REST API asset service implementation
   */
  constructor(asset_service) {
    this.asset_service = asset_service;
    this.logger = new z.util.Logger('z.search.SearchService', z.config.LOGGER.OPTIONS);
  }

  /**
   * Converts JSON user into user entity.
   * @param {Object} data - User data
   * @returns {z.entity.User} Mapped user entity
   */
  map_user_from_object(data) {
    return this.update_user_from_object(new z.entity.User(), data);
  }

  /**
   * Converts JSON self user into user entity.
   * @param {Object} data - User data
   * @returns {z.entity.User} Mapped user entity
   */
  map_self_user_from_object(data) {
    const user_et = this.update_user_from_object(new z.entity.User(), data);
    user_et.is_me = true;

    if (data.locale) {
      user_et.locale = data.locale;
    }

    return user_et;
  }

  /**
   * Convert multiple JSON users into user entities.
   * @note Return an empty array in any case to prevent crashes.
   * @param {Object} data - User data
   * @returns {Array<z.entity.User>} Mapped user entities
   */
  map_users_from_object(data) {
    if (data) {
      return data
        .filter((user_et) => user_et)
        .map((user_et) => this.map_user_from_object(user_et));
    }
    this.logger.warn('We got no user data from the backend');
    return [];
  }
}
