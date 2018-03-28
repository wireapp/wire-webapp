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
    return this.updateUserFromObject(new z.entity.User(), data);
  }

  /**
   * Converts JSON self user into user entity.
   * @param {Object} data - User data
   * @returns {z.entity.User} Mapped user entity
   */
  map_self_user_from_object(data) {
    const user_et = this.updateUserFromObject(new z.entity.User(), data);
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
   * @param {z.entity.User} userEntity - User entity that the info shall be mapped to
   * @param {Object} userData - User data
   * @returns {z.entity.User} Mapped user entity
   */
  updateUserFromObject(userEntity, userData) {
    if (!userData) {
      return;
    }

    // We are trying to update non-matching users
    const isUnexpectedId = userEntity.id !== '' && userData.id !== userEntity.id;
    if (isUnexpectedId) {
      throw new Error(`Updating wrong user entity. User '${userEntity.id}' does not match data '${userData.id}'.`);
    }

    const isNewUser = userEntity.id === '' && userData.id !== '';
    if (isNewUser) {
      userEntity.id = userData.id;
      userEntity.joaatHash = z.util.Crypto.Hashing.joaatHash(userData.id);
    }

    const {
      accent_id: accentId,
      assets,
      email,
      expires_at: expirationDate,
      handle,
      name,
      phone,
      picture,
      service,
      team,
    } = userData;

    if (accentId) {
      userEntity.accent_id(accentId);
    }

    const hasAsset = assets && assets.length;
    const hasPicture = picture && picture.length;
    if (hasAsset) {
      z.assets.AssetMapper.mapProfileAssets(userEntity, userData.assets);
    } else if (hasPicture) {
      z.assets.AssetMapper.mapProfileAssetsV1(userEntity, userData.picture);
    }

    if (email) {
      userEntity.email(email);
    }

    if (expirationDate) {
      userEntity.isTemporaryGuest(true);
      userEntity.setGuestExpiration(new Date(expirationDate).getTime());
    }

    if (handle) {
      userEntity.username(handle);
    }

    if (name) {
      userEntity.name(name.trim());
    }

    if (phone) {
      userEntity.phone(phone);
    }

    if (service) {
      userEntity.isBot = true;
      userEntity.providerId = service.provider;
      userEntity.serviceId = service.id;
    }

    if (team) {
      userEntity.inTeam(true);
      userEntity.teamId = team;
    }

    return userEntity;
  }
};
