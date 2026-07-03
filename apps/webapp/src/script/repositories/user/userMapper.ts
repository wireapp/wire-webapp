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

import {UserType} from '@wireapp/api-client/lib/user';

import {MappedAsset, mapProfileAssets, updateUserEntityAssets} from 'Repositories/assets/assetMapper';
import {User} from 'Repositories/entity/User';
import {UserRecord} from 'Repositories/storage';
import {type Translate} from 'Util/localizerUtil';
import {getLogger, Logger} from 'Util/logger';

import {isSelfAPIUser} from './userGuards';

import type {ServerTimeHandler} from '../../time/serverTimeHandler';
import '../../view_model/bindings/CommonBindings';

export class UserMapper {
  private readonly logger: Logger;

  /**
   * Construct a new User Mapper.
   * @param serverTimeHandler Handles time shift between server and client
   */
  constructor(
    private readonly serverTimeHandler: ServerTimeHandler,
    private readonly translate: Translate,
  ) {
    this.logger = getLogger('UserMapper');
  }

  mapUserFromJson(userData: UserRecord, localDomain: string): User {
    return this.updateUserFromObject(new User('', '', this.translate), userData, localDomain);
  }

  mapSelfUserFromJson(userData: UserRecord): User {
    const userEntity = this.updateUserFromObject(new User('', '', this.translate), userData, '');
    userEntity.isMe = true;

    if (isSelfAPIUser(userData)) {
      userEntity.locale = userData.locale;
    }

    return userEntity;
  }

  /**
   * Convert multiple JSON users into user entities.
   * @note Return an empty array in any case to prevent crashes.
   * @returns Mapped user entities
   */
  mapUsersFromJson(usersData: UserRecord[] | undefined, localDomain: string): User[] {
    if (usersData !== undefined && usersData.length !== 0 && !Number.isNaN(usersData.length)) {
      return usersData
        .filter(userData => userData !== null && userData !== undefined)
        .map(userData => this.mapUserFromJson(userData, localDomain));
    }
    this.logger.warn('We got no user data from the backend');
    return [];
  }

  /**
   * Maps JSON user into a blank user entity or updates an existing one.
   * @note Mapping of single properties to an existing user happens when the user changes his name or accent color.
   * @param userEntity User entity that the info shall be mapped to
   * @param userData Updated user data from backend
   * @param localDomain Domain of the current backend (used to determine if the user is federated)
   * @todo Pass in "serverTimeHandler", so that it can be removed from the "UserMapper" constructor
   */
  updateUserFromObject(userEntity: User, userData: Partial<UserRecord>, localDomain: string): User {
    // We are trying to update non-matching users
    const isUnexpectedId =
      userEntity.id.length > 0 &&
      userData.id !== null &&
      userData.id !== undefined &&
      userData.id.length > 0 &&
      userData.id !== userEntity.id;
    if (isUnexpectedId) {
      throw new Error(`Updating wrong user entity. User '${userEntity.id}' does not match data '${userData.id}'.`);
    }

    const isNewUser = userEntity.id === '' && userData.id !== '';
    if (isNewUser && userData.id !== null && userData.id !== undefined && userData.id.length > 0) {
      userEntity.id = userData.id;
    }

    if (userData.qualified_id !== null && userData.qualified_id !== undefined) {
      userEntity.domain = userData.qualified_id.domain;
      userEntity.id = userData.qualified_id.id;
      userEntity.isFederated = localDomain.length !== 0 && userData.qualified_id.domain !== localDomain;
    }

    const isSelf = isSelfAPIUser(userData);
    const ssoId = isSelf && userData.sso_id;
    const managedBy = isSelf && userData.managed_by;

    const {
      accent_id: accentId,
      availability,
      app,
      assets,
      deleted,
      email,
      expires_at: expirationDate,
      handle,
      name,
      service,
      team: teamId,
      supported_protocols: supportedProtocols,
      type,
    } = userData;

    const accentColorId = accentId as typeof accentId | 0;
    if (accentColorId !== null && accentColorId !== undefined && accentColorId !== 0) {
      userEntity.accent_id(accentColorId);
    }

    if (availability !== undefined) {
      // Availability should only change when it's a valid value (undefined should not reset the availability)
      userEntity.availability(availability);
    }

    let mappedAssets: MappedAsset = {};
    if (
      assets?.length !== null &&
      assets?.length !== undefined &&
      assets?.length !== 0 &&
      !Number.isNaN(assets?.length)
    ) {
      mappedAssets = mapProfileAssets(userEntity.qualifiedId, assets);
    }
    updateUserEntityAssets(userEntity, mappedAssets);

    if (email !== null && email !== undefined && email.length > 0) {
      userEntity.email(email);
    }

    if (managedBy !== null && managedBy !== undefined && managedBy !== false) {
      userEntity.managedBy(managedBy);
    }

    if (supportedProtocols !== null && supportedProtocols !== undefined) {
      userEntity.supportedProtocols(supportedProtocols);
    }

    if (expirationDate !== null && expirationDate !== undefined && expirationDate.length > 0) {
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

    if (handle !== null && handle !== undefined && handle.length > 0) {
      userEntity.username(handle);
    }

    if (name !== null && name !== undefined && name.length > 0) {
      userEntity.name(name.trim());
    }

    if (service !== null && service !== undefined) {
      userEntity.isService = true;
      userEntity.providerId = service.provider;
      userEntity.providerName('');
      userEntity.serviceId = service.id;
    }

    if (
      ssoId !== null &&
      ssoId !== undefined &&
      ssoId !== false &&
      Object.keys(ssoId).length !== 0 &&
      !Number.isNaN(Object.keys(ssoId).length)
    ) {
      userEntity.isSingleSignOn = true;
      if (ssoId.subject.length > 0) {
        userEntity.isNoPasswordSSO = true;
      }
    }

    if (teamId !== null && teamId !== undefined && teamId.length > 0) {
      userEntity.teamId = teamId;
    }

    if (deleted === true) {
      userEntity.isDeleted = true;
    }

    userEntity.type = type ?? UserType.REGULAR;

    if (app !== null && app !== undefined) {
      userEntity.description = app.description;
      userEntity.category = app.category;
    } else {
      userEntity.description = undefined;
      userEntity.category = undefined;
    }

    return userEntity;
  }
}
