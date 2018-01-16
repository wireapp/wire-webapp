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
   */
  constructor() {
    this.logger = new z.util.Logger('z.user.UserMapper', z.config.LOGGER.OPTIONS);
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
      return data.filter(user_et => user_et).map(user_et => this.map_user_from_object(user_et));
    }
    this.logger.warn('We got no user data from the backend');
    return [];
  }

  /**
   * Maps JSON user into a blank user entity or updates an existing one.
   * @note Mapping of single properties to an existing user happens when the user changes his name or accent color.
   * @param {z.entity.User} user_et - User entity that the info shall be mapped to
   * @param {Object} data - User data
   * @returns {z.entity.User} Mapped user entity
   */
  update_user_from_object(user_et, data) {
    if (!data) {
      return;
    }

    if (user_et.id === '' && data.id !== '') {
      // It's a new user
      user_et.id = data.id;
      user_et.joaat_hash = z.util.Crypto.Hashing.joaat_hash(data.id);
    } else if (user_et.id !== '' && data.id !== user_et.id) {
      // We are trying to update non-matching users
      throw new Error(`Updating wrong user entity. User ID '${user_et.id}' does not match data ID '${data.id}'.`);
    }

    if (data.accent_id && data.accent_id !== 0) {
      user_et.accent_id(data.accent_id);
    }

    if (data.assets && data.assets.length > 0) {
      z.assets.AssetMapper.mapProfileAssets(user_et, data.assets);
    } else if (data.picture && data.picture.length > 0) {
      z.assets.AssetMapper.mapProfileAssetsV1(user_et, data.picture);
    }

    if (data.email) {
      user_et.email(data.email);
    }

    if (data.handle) {
      user_et.username(data.handle);
    }

    if (data.name) {
      user_et.name(data.name.trim());
    }

    if (data.phone) {
      user_et.phone(data.phone);
    }

    if (data.service) {
      user_et.isBot = true;
      user_et.providerId = data.service.provider;
      user_et.serviceId = data.service.id;
    }

    return user_et;
  }
};
