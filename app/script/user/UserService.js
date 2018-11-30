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
window.z.user = z.user || {};

z.user.UserService = class UserService {
  static get URL() {
    return {
      PASSWORD_RESET: '/password-reset',
      USERS: '/users',
    };
  }

  /**
   * Construct a new User Service.
   * @class z.user.UserService
   * @param {z.service.BackendClient} backendClient - Client for the API calls
   * @param {StorageService} storageService - Service for all storage interactions
   */
  constructor(backendClient, storageService) {
    this.backendClient = backendClient;
    this.logger = new z.util.Logger('z.user.UserService', z.config.LOGGER.OPTIONS);
    this.storageService = storageService;

    this.USER_STORE_NAME = z.storage.StorageSchemata.OBJECT_STORE.USERS;
  }

  //##############################################################################
  // Database interactions
  //##############################################################################

  /**
   * Loads user states from the local database.
   * @returns {Promise} Resolves with all the stored user states
   */
  loadUserFromDb() {
    return this.storageService.getAll(this.USER_STORE_NAME);
  }

  /**
   * Saves a user entity in the local database.
   * @param {User} userEntity - User entity
   * @returns {Promise} Resolves with the conversation entity
   */
  saveUserInDb(userEntity) {
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
   *
   * @param {string} username - Username
   * @returns {Promise} Resolves with backend response.
   */
  checkUserHandle(username) {
    return this.backendClient.sendRequest({
      type: 'HEAD',
      url: `${UserService.URL.USERS}/handles/${username}`,
    });
  }

  getUserByHandle(username) {
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
   *
   * @param {array} usernames - List of usernames
   * @param {number} amount - amount of usernames to return
   * @returns {Promise} Resolves with backend response.
   */
  checkUserHandles(usernames, amount = 1) {
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
   *
   * @param {Array<string>} userIds - ID of users to be fetched
   * @returns {Promise} Resolves with backend response.
   */
  getUsers(userIds) {
    return this.backendClient.sendRequest({
      data: {
        ids: userIds.join(','),
      },
      type: 'GET',
      url: UserService.URL.USERS,
    });
  }

  /**
   * Get a user by ID.
   *
   * @see https://staging-nginz-https.zinfra.io/swagger-ui/#!/users/user
   *
   * @param {string} userId - User ID
   * @returns {Promise} Resolves with backend response.
   */
  getUser(userId) {
    return this.backendClient.sendRequest({
      type: 'GET',
      url: `${UserService.URL.USERS}/${userId}`,
    });
  }
};
