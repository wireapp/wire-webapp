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

import {Logger, getLogger} from 'Util/Logger';

import {chunk, flatten, uniquify} from 'Util/ArrayUtil';
import {User} from '../entity/User';
import {BackendClient} from '../service/BackendClient';
import {StorageSchemata} from '../storage/StorageSchemata';
import {StorageService} from '../storage/StorageService';

export class UserService {
  private readonly backendClient: BackendClient;
  private readonly logger: Logger;
  private readonly storageService: StorageService;
  private readonly USER_STORE_NAME: string;

  public static readonly URL = {
    PASSWORD_RESET: '/password-reset',
    USERS: '/users',
  };

  constructor(backendClient: BackendClient, storageService: StorageService) {
    this.backendClient = backendClient;
    this.logger = getLogger('UserService');
    this.storageService = storageService;

    this.USER_STORE_NAME = StorageSchemata.OBJECT_STORE.USERS;
  }

  //##############################################################################
  // Database interactions
  //##############################################################################

  /**
   * Loads user states from the local database.
   * @todo There might be more keys which are returned by this function
   * @returns Resolves with all the stored user states
   */
  loadUserFromDb(): Promise<{availability: number; id: string}[]> {
    return this.storageService.getAll(this.USER_STORE_NAME);
  }

  /**
   * Saves a user entity in the local database.
   * @returns Resolves with the conversation entity
   */
  saveUserInDb(userEntity: User): Promise<User> {
    const userData = userEntity.serialize();

    return this.storageService.save(this.USER_STORE_NAME, userEntity.id, userData).then(primaryKey => {
      this.logger.info(`State of user '${primaryKey}' was stored`, userData);
      return userEntity;
    });
  }

  //##############################################################################
  // Backend interactions
  //##############################################################################

  /**
   * Check if a username exists.
   *
   * @see https://staging-nginz-https.zinfra.io/swagger-ui/#!/users/checkUserHandle
   */
  checkUserHandle(username: string): Promise<void> {
    return this.backendClient.sendRequest({
      type: 'HEAD',
      url: `${UserService.URL.USERS}/handles/${username}`,
    });
  }

  getUserByHandle(username: string): Promise<{user: User}> {
    return this.backendClient.sendRequest({
      type: 'GET',
      url: `${UserService.URL.USERS}/handles/${username}`,
    });
  }

  /**
   * Get a set of users for the given usernames.
   *
   * @example ['0bb84213-8cc2-4bb1-9e0b-b8dd522396d5', '15ede065-72b3-433a-9917-252f076ed031']
   * @see https://staging-nginz-https.zinfra.io/swagger-ui/#!/users/checkUserHandles
   */
  checkUserHandles(usernames: string[], amount: number = 1): Promise<string[]> {
    return this.backendClient.sendJson({
      data: {
        handles: usernames,
        return: amount,
      },
      type: 'POST',
      url: `${UserService.URL.USERS}/handles`,
    });
  }

  /**
   * Get a set of users.
   *
   * @see https://staging-nginz-https.zinfra.io/swagger-ui/#!/users/users
   * @example ['0bb84213-8cc2-4bb1-9e0b-b8dd522396d5', '15ede065-72b3-433a-9917-252f076ed031']
   */
  getUsers(userIds: string[]): Promise<User[]> {
    const chunkSize = 50;
    const uniqueUserIds = uniquify(userIds);
    const idChunks = chunk(uniqueUserIds, chunkSize);
    const idLists = idChunks.map(idChunk => idChunk.join(','));
    return Promise.all(
      idLists.map(
        ids =>
          this.backendClient.sendRequest({
            data: {ids},
            type: 'GET',
            url: UserService.URL.USERS,
          }) as Promise<User[]>,
      ),
    ).then(flatten);
  }

  /**
   * Get a user by ID.
   *
   * @see https://staging-nginz-https.zinfra.io/swagger-ui/#!/users/user
   */
  getUser(userId: string): Promise<User> {
    return this.backendClient.sendRequest({
      type: 'GET',
      url: `${UserService.URL.USERS}/${userId}`,
    });
  }
}
