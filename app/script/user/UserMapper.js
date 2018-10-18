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
   * @param {z.time.ServerTimeRepository} serverTimeRepository - Handles time shift between server and client
   */
  constructor(serverTimeRepository) {
    this.logger = new z.util.Logger('z.user.UserMapper', z.config.LOGGER.OPTIONS);
    this.serverTimeRepository = serverTimeRepository;
  }

  /**
   * Converts JSON self user into user entity.
   * @param {Object} userData - User data
   * @returns {z.entity.User} Mapped user entity
   */
  mapSelfUserFromJson(userData) {
    const userEntity = this.updateUserFromObject(new z.entity.User(), userData);
    userEntity.is_me = true;

    if (userData.locale) {
      userEntity.locale = userData.locale;
    }

    return userEntity;
  }

  /**
   * Converts JSON user into user entity.
   * @param {Object} userData - User data
   * @returns {z.entity.User} Mapped user entity
   */
  mapUserFromJson(userData) {
    return this.updateUserFromObject(new z.entity.User(), userData);
  }

  /**
   * Convert multiple JSON users into user entities.
   * @note Return an empty array in any case to prevent crashes.
   *
   * @param {Array<Object>} usersData - Users data
   * @returns {Array<z.entity.User>} Mapped user entities
   */
  mapUsersFromJson(usersData) {
    if (usersData && usersData.length) {
      return usersData.filter(userData => userData).map(userData => this.mapUserFromJson(userData));
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
      sso_id: ssoId,
      team,
    } = userData;

    if (accentId) {
      userEntity.accent_id(accentId);
    }

    const hasAsset = assets && assets.length;
    const hasPicture = picture && picture.length;
    let mappedAssets;
    if (hasAsset) {
      mappedAssets = z.assets.AssetMapper.mapProfileAssets(userEntity.id, userData.assets);
    } else if (hasPicture) {
      mappedAssets = z.assets.AssetMapper.mapProfileAssetsV1(userEntity.id, userData.picture);
    }
    z.assets.AssetMapper.updateUserEntityAssets(userEntity, mappedAssets);

    if (email) {
      userEntity.email(email);
    }

    if (expirationDate) {
      userEntity.isTemporaryGuest(true);
      const adjustedTimestamp = this.serverTimeRepository.toLocalTimestamp(new Date(expirationDate).getTime());
      userEntity.setGuestExpiration(adjustedTimestamp);
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
      userEntity.isService = true;
      userEntity.providerId = service.provider;
      userEntity.providerName = ko.observable('');
      userEntity.serviceId = service.id;
    }

    if (ssoId && Object.keys(ssoId).length) {
      userEntity.isSingleSignOn = true;
    }

    if (team) {
      userEntity.inTeam(true);
      userEntity.teamId = team;
    }

    return userEntity;
  }
};
