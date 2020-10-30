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

import type {User as APIClientUser} from '@wireapp/api-client/src/user';
import type {Self as APIClientSelf} from '@wireapp/api-client/src/self';

import {joaatHash} from 'Util/Crypto';
import {Logger, getLogger} from 'Util/Logger';

import {mapProfileAssets, mapProfileAssetsV1, updateUserEntityAssets} from '../assets/AssetMapper';
import {User} from '../entity/User';
import type {ServerTimeHandler} from '../time/serverTimeHandler';
import '../view_model/bindings/CommonBindings';

export class UserMapper {
  private readonly logger: Logger;
  private readonly serverTimeHandler: ServerTimeHandler;

  /**
   * Construct a new User Mapper.
   * @param serverTimeHandler Handles time shift between server and client
   */
  constructor(serverTimeHandler: ServerTimeHandler) {
    this.logger = getLogger('UserMapper');
    this.serverTimeHandler = serverTimeHandler;
  }

  mapUserFromJson(userData: APIClientUser | APIClientSelf): User {
    return this.updateUserFromObject(new User(), userData);
  }

  mapSelfUserFromJson(userData: APIClientSelf | APIClientUser): User {
    const userEntity = this.updateUserFromObject(new User(), userData);
    userEntity.isMe = true;

    if ((userData as APIClientSelf).locale) {
      userEntity.locale = (userData as APIClientSelf).locale;
    }

    return userEntity;
  }

  /**
   * Convert multiple JSON users into user entities.
   * @note Return an empty array in any case to prevent crashes.
   * @returns Mapped user entities
   */
  mapUsersFromJson(usersData: (APIClientSelf | APIClientUser)[]): User[] {
    if (usersData?.length) {
      return usersData.filter(userData => userData).map(userData => this.mapUserFromJson(userData));
    }
    this.logger.warn('We got no user data from the backend');
    return [];
  }

  /**
   * Maps JSON user into a blank user entity or updates an existing one.
   * @note Mapping of single properties to an existing user happens when the user changes his name or accent color.
   * @param userEntity User entity that the info shall be mapped to
   * @param userData Updated user data from backend
   * @todo Pass in "serverTimeHandler", so that it can be removed from the "UserMapper" constructor
   */
  updateUserFromObject(userEntity: User, userData: Partial<APIClientUser | APIClientSelf>): User | undefined {
    if (!userData) {
      return undefined;
    }

    // We are trying to update non-matching users
    const isUnexpectedId = userEntity.id !== '' && userData.id !== userEntity.id;
    if (isUnexpectedId) {
      throw new Error(`Updating wrong user entity. User '${userEntity.id}' does not match data '${userData.id}'.`);
    }

    const isNewUser = userEntity.id === '' && userData.id !== '';
    if (isNewUser) {
      userEntity.id = userData.id;
      userEntity.joaatHash = joaatHash(userData.id);
    }

    const {
      accent_id: accentId,
      assets,
      deleted,
      email,
      expires_at: expirationDate,
      managed_by,
      handle,
      name,
      phone,
      picture,
      service,
      sso_id: ssoId,
      team: teamId,
    } = userData as APIClientSelf;

    if (accentId) {
      userEntity.accent_id(accentId);
    }

    const hasAsset = assets?.length;
    const hasPicture = picture?.length;
    let mappedAssets;
    if (hasAsset) {
      mappedAssets = mapProfileAssets(userEntity.id, userData.assets);
    } else if (hasPicture) {
      mappedAssets = mapProfileAssetsV1(userEntity.id, (userData as any).picture);
    }
    updateUserEntityAssets(userEntity, mappedAssets);

    if (email) {
      userEntity.email(email);
    }

    if (managed_by !== undefined) {
      userEntity.managedBy(managed_by);
    }

    if (expirationDate) {
      userEntity.isTemporaryGuest(true);
      const setAdjustedTimestamp = () => {
        const adjustedTimestamp = this.serverTimeHandler.toLocalTimestamp(new Date(expirationDate).getTime());
        userEntity.setGuestExpiration(adjustedTimestamp);
      };
      if (this.serverTimeHandler.timeOffset() !== undefined) {
        setAdjustedTimestamp();
      } else {
        // TODO: Find a way to type `subscribe_once` or export the function.
        (this.serverTimeHandler.timeOffset as any).subscribe_once(setAdjustedTimestamp);
      }
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
      userEntity.providerName('');
      userEntity.serviceId = service.id;
    }

    if (ssoId && Object.keys(ssoId).length) {
      userEntity.isSingleSignOn = true;
    }

    if (teamId) {
      userEntity.inTeam(true);
      userEntity.teamId = teamId;
    }

    if (deleted) {
      userEntity.isDeleted = true;
    }

    return userEntity;
  }
}
