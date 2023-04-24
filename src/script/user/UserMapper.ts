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

import {container} from 'tsyringe';

import {joaatHash} from 'Util/Crypto';
import {getLogger, Logger} from 'Util/Logger';

import {isSelfAPIUser} from './UserGuards';
import {UserState} from './UserState';

import {mapProfileAssets, mapProfileAssetsV1, updateUserEntityAssets} from '../assets/AssetMapper';
import {User} from '../entity/User';
import {UserRecord} from '../storage';
import type {ServerTimeHandler} from '../time/serverTimeHandler';
import '../view_model/bindings/CommonBindings';

export class UserMapper {
  private readonly logger: Logger;

  /**
   * Construct a new User Mapper.
   * @param serverTimeHandler Handles time shift between server and client
   */
  constructor(
    private readonly serverTimeHandler: ServerTimeHandler,
    private readonly userState: UserState = container.resolve(UserState),
  ) {
    this.logger = getLogger('UserMapper');
  }

  mapUserFromJson(userData: UserRecord): User {
    return this.updateUserFromObject(new User('', ''), userData);
  }

  mapSelfUserFromJson(userData: UserRecord): User {
    const userEntity = this.updateUserFromObject(new User('', ''), userData);
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
  mapUsersFromJson(usersData: UserRecord[]): User[] {
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
  updateUserFromObject(userEntity: User, userData: Partial<UserRecord>): User {
    // We are trying to update non-matching users
    const isUnexpectedId = userEntity.id && userData.id && userData.id !== userEntity.id;
    if (isUnexpectedId) {
      throw new Error(`Updating wrong user entity. User '${userEntity.id}' does not match data '${userData.id}'.`);
    }

    const isNewUser = userEntity.id === '' && userData.id !== '';
    if (isNewUser && userData.id) {
      userEntity.id = userData.id;
      userEntity.joaatHash = joaatHash(userData.id ?? '');
    }

    if (userData.qualified_id) {
      userEntity.domain = userData.qualified_id.domain;
      userEntity.id = userData.qualified_id.id;
      userEntity.isFederated =
        this.userState.self() && this.userState.self().domain
          ? userData.qualified_id.domain !== this.userState.self().domain
          : false;
    }

    const isSelf = isSelfAPIUser(userData);
    const ssoId = isSelf && userData.sso_id;
    const managedBy = isSelf && userData.managed_by;
    const phone = isSelf && userData.phone;

    const {
      accent_id: accentId,
      availability,
      assets,
      deleted,
      email,
      expires_at: expirationDate,
      handle,
      name,
      picture,
      service,
      team: teamId,
    } = userData;

    if (accentId) {
      userEntity.accent_id(accentId);
    }

    if (availability) {
      userEntity.availability(availability);
    }

    let mappedAssets;
    if (assets?.length) {
      mappedAssets = mapProfileAssets(userEntity.qualifiedId, assets);
    } else if (picture?.length) {
      mappedAssets = mapProfileAssetsV1(userEntity.id, picture);
    }
    updateUserEntityAssets(userEntity, mappedAssets);

    if (email) {
      userEntity.email(email);
    }

    if (managedBy) {
      userEntity.managedBy(managedBy);
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
      if (ssoId.subject) {
        userEntity.isNoPasswordSSO = true;
      }
    }

    if (teamId && !userEntity.isFederated) {
      // To be in the same team, the user needs to have the same teamId and to be on the same domain (not federated)
      userEntity.inTeam(true);
      userEntity.teamId = teamId;
    }

    if (deleted) {
      userEntity.isDeleted = true;
    }

    return userEntity;
  }
}
