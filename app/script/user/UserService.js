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

z.user.UserService = class UserService {
  static get URL() {
    return {
      PASSWORD_RESET: '/password-reset',
      SELF: '/self',
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
   * Initiate a password reset.
   * @see https://staging-nginz-https.zinfra.io/swagger-ui/#!/users/beginPasswordReset
   * @param {string} email - Email address
   * @param {string} phone_number - E.164 formatted phone number
   * @returns {Promise} Promise that resolves when password reset process has been triggered
   */
  post_password_reset(email, phone_number) {
    return this.backendClient.sendJson({
      data: {
        email: email,
        phone: phone_number,
      },
      type: 'POST',
      url: UserService.URL.PASSWORD_RESET,
    });
  }

  /**
   * Complete a password reset.
   * @see https://staging-nginz-https.zinfra.io/swagger-ui/#!/users/completePasswordReset
   * @param {string} code - Password reset code
   * @param {string} new_password - New password to be set
   * @param {string} email - Email address
   * @param {string} phone_number - E.164 formatted phone number
   * @returns {Promise} Promise that resolves when password reset process has been triggered
   */
  post_password_reset_complete(code, new_password, email, phone_number) {
    return this.backendClient.sendJson({
      data: {
        code: code,
        email: email,
        password: new_password,
        phone: phone_number,
      },
      type: 'POST',
      url: `${UserService.URL.PASSWORD_RESET}/complete`,
    });
  }

  /**
   * Get your own user profile.
   * @see https://staging-nginz-https.zinfra.io/swagger-ui/#!/users/self
   * @returns {Promise} Promise that will resolve with the self user
   */
  get_own_user() {
    return this.backendClient.sendRequest({
      type: 'GET',
      url: UserService.URL.SELF,
    });
  }

  /**
   * Get your consents.
   * @returns {Promise} Promise that will resolve with the consents user has given
   */
  getConsent() {
    return this.backendClient
      .sendRequest({
        type: 'GET',
        url: `${UserService.URL.SELF}/consent`,
      })
      .then(data => data.results);
  }

  /**
   * Put a consent.
   *
   * @param {number} consentType - Type of consent given
   * @param {number} value - Value of consent
   * @param {string} source - Identifier of app from consent
   * @returns {Promise} Promise that will resolve with the self user
   */
  putConsent(consentType, value, source) {
    return this.backendClient.sendJson({
      data: {
        source: source,
        type: consentType,
        value: value,
      },
      type: 'PUT',
      url: `${UserService.URL.SELF}/consent`,
    });
  }

  /**
   * Update your own user profile.
   * @option data {Array<z.assets.Asset>} picture
   * @option data {number} accent_id
   * @option data {String} name
   * @see https://staging-nginz-https.zinfra.io/swagger-ui/#!/users/updateSelf
   * @param {Object} data - Updated user profile information
   * @returns {Promise} Resolves with backend response.
   */
  update_own_user_profile(data) {
    return this.backendClient.sendJson({
      data: data,
      type: 'PUT',
      url: UserService.URL.SELF,
    });
  }

  /**
   * Change your own user email.
   * @see https://staging-nginz-https.zinfra.io/swagger-ui/#!/users/changeEmail
   * @param {string} email - New email address for the user
   * @returns {Promise} Promise that resolves when email changing process has been started on backend
   */
  change_own_email(email) {
    return this.backendClient.sendJson({
      data: {
        email: email,
      },
      type: 'PUT',
      url: `${UserService.URL.SELF}/email`,
    });
  }

  /**
   * Change username.
   * @param {string} username - New username for the user
   * @returns {Promise} Promise that resolves when username changing process has been started on backend
   */
  change_own_username(username) {
    return this.backendClient.sendJson({
      data: {
        handle: username,
      },
      type: 'PUT',
      url: `${UserService.URL.SELF}/handle`,
    });
  }

  /**
   * Change own user password.
   * @see https://staging-nginz-https.zinfra.io/swagger-ui/#!/users/changePassword
   * @param {string} new_password - New user password
   * @param {string} [old_password] - Old password of the user
   * @returns {Promise} Promise that resolves when password has been changed on backend
   */
  change_own_password(new_password, old_password) {
    return this.backendClient.sendJson({
      data: {
        new_password: new_password,
        old_password: old_password,
      },
      type: 'PUT',
      url: `${UserService.URL.SELF}/password`,
    });
  }

  /**
   * Change your phone number.
   * @see https://staging-nginz-https.zinfra.io/swagger-ui/#!/users/changePhone
   * @param {string} phone_number - Phone number in E.164 format
   * @returns {Promise} Promise that resolves when phone number change process has been started on backend
   */
  change_own_phone_number(phone_number) {
    return this.backendClient.sendJson({
      data: {
        phone: phone_number,
      },
      type: 'PUT',
      url: `${UserService.URL.SELF}/phone`,
    });
  }

  /**
   * Delete self user.
   * @returns {Promise} Promise that resolves when account deletion has been initiated
   */
  delete_self() {
    return this.backendClient.sendJson({
      data: {
        todo: 'Change this to normal request!',
      },
      type: 'DELETE',
      url: UserService.URL.SELF,
    });
  }

  /**
   * Check if a username exists.
   * @see https://staging-nginz-https.zinfra.io/swagger-ui/#!/users/checkUserHandle
   * @param {string} username - Username
   * @returns {Promise} Resolves with backend response.
   */
  check_username(username) {
    return this.backendClient.sendRequest({
      type: 'HEAD',
      url: `${UserService.URL.USERS}/handles/${username}`,
    });
  }

  get_username(username) {
    return this.backendClient.sendRequest({
      type: 'GET',
      url: `${UserService.URL.USERS}/handles/${username}`,
    });
  }

  /**
   * Get a set of users for the given usernames
   * @example ['0bb84213-8cc2-4bb1-9e0b-b8dd522396d5', '15ede065-72b3-433a-9917-252f076ed031']
   * @see https://staging-nginz-https.zinfra.io/swagger-ui/#!/users/checkUserHandles
   * @param {array} usernames - List of usernames
   * @param {number} amount - amount of usernames to return
   * @returns {Promise} Resolves with backend response.
   */
  check_usernames(usernames, amount = 1) {
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
   * @example ['0bb84213-8cc2-4bb1-9e0b-b8dd522396d5', '15ede065-72b3-433a-9917-252f076ed031']
   * @see https://staging-nginz-https.zinfra.io/swagger-ui/#!/users/users
   * @param {Array<string>} users - ID of users to be fetched
   * @returns {Promise} Resolves with backend response.
   */
  get_users(users) {
    return this.backendClient.sendRequest({
      data: {
        ids: users.join(','),
      },
      type: 'GET',
      url: UserService.URL.USERS,
    });
  }

  /**
   * Get a user by ID.
   * @see https://staging-nginz-https.zinfra.io/swagger-ui/#!/users/user
   * @param {string} user_id - User ID
   * @returns {Promise} Resolves with backend response.
   */
  get_user_by_id(user_id) {
    return this.backendClient.sendRequest({
      type: 'GET',
      url: `${UserService.URL.USERS}/${user_id}`,
    });
  }
};
