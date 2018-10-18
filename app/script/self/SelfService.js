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
window.z.self = z.self || {};

z.self.SelfService = class SelfService {
  static get URL() {
    return {
      SELF: '/self',
    };
  }

  /**
   * Construct a new Self Service.
   * @class z.self.SelfService
   * @param {z.service.BackendClient} backendClient - Client for the API calls
   */
  constructor(backendClient) {
    this.backendClient = backendClient;
    this.logger = new z.util.Logger('z.self.SelfService', z.config.LOGGER.OPTIONS);
  }

  /**
   * Delete self user.
   *
   * @see https://staging-nginz-https.zinfra.io/swagger-ui/tab.html#!//deleteUser
   *
   * @param {string} [password] - Self user password to authorize immediate account deletion
   * @returns {Promise} Promise that resolves when account deletion has been initiated
   */
  deleteSelf(password) {
    return this.backendClient.sendJson({
      data: {
        password: password,
      },
      type: 'DELETE',
      url: SelfService.URL.SELF,
    });
  }

  /**
   * Get your own user profile.
   * @see https://staging-nginz-https.zinfra.io/swagger-ui/tab.html#!//self
   * @returns {Promise} Promise that will resolve with the self user
   */
  getSelf() {
    return this.backendClient.sendRequest({
      type: 'GET',
      url: SelfService.URL.SELF,
    });
  }

  /**
   * Get your consents.
   * @returns {Promise} Promise that will resolve with the consents user has given
   */
  getSelfConsent() {
    return this.backendClient
      .sendRequest({
        type: 'GET',
        url: `${SelfService.URL.SELF}/consent`,
      })
      .then(data => data.results);
  }

  /**
   * Update your own user profile.
   *
   * @see https://staging-nginz-https.zinfra.io/swagger-ui/tab.html#!//updateSelf
   *
   * @param {Object} selfData - Updated user profile information
   * @returns {Promise} Resolves with backend response.
   */
  putSelf(selfData) {
    return this.backendClient.sendJson({
      data: selfData,
      type: 'PUT',
      url: SelfService.URL.SELF,
    });
  }

  /**
   * Set a consent value .
   *
   * @param {number} consentType - Type of consent given
   * @param {number} value - Value of consent
   * @param {string} source - Identifier of app from consent
   * @returns {Promise} Promise that will resolve with the self user
   */
  putSelfConsent(consentType, value, source) {
    return this.backendClient.sendJson({
      data: {
        source: source,
        type: consentType,
        value: value,
      },
      type: 'PUT',
      url: `${SelfService.URL.SELF}/consent`,
    });
  }

  /**
   * Change your own user email.
   *
   * @see https://staging-nginz-https.zinfra.io/swagger-ui/tab.html#!//changeEmail
   *
   * @param {string} email - New email address for the user
   * @returns {Promise} Promise that resolves when email changing process has been started on backend
   */
  putSelfEmail(email) {
    return this.backendClient.sendJson({
      data: {
        email: email,
      },
      type: 'PUT',
      url: `${SelfService.URL.SELF}/email`,
    });
  }

  /**
   * Change username.
   *
   * @see https://staging-nginz-https.zinfra.io/swagger-ui/tab.html#!//changeHandle
   *
   * @param {string} username - New username for the user
   * @returns {Promise} Promise that resolves when username changing process has been started on backend
   */
  putSelfHandle(username) {
    return this.backendClient.sendJson({
      data: {
        handle: username,
      },
      type: 'PUT',
      url: `${SelfService.URL.SELF}/handle`,
    });
  }

  /**
   * Change your locale.
   *
   * @see https://staging-nginz-https.zinfra.io/swagger-ui/tab.html#!//changeLocale
   *
   * @param {string} newLocale - Locale to be set
   * @returns {Promise} Promise that resolves when locale has been changed on backend
   */
  putSelfLocale(newLocale) {
    return this.backendClient.sendJson({
      data: {
        locale: newLocale,
      },
      type: 'PUT',
      url: `${SelfService.URL.SELF}/locale`,
    });
  }

  /**
   * Change own user password.
   *
   * @see https://staging-nginz-https.zinfra.io/swagger-ui/tab.html#!//changePassword
   *
   * @param {string} newPassword - New user password
   * @param {string} [oldPassword] - Old password of the user
   * @returns {Promise} Promise that resolves when password has been changed on backend
   */
  putSelfPassword(newPassword, oldPassword) {
    return this.backendClient.sendJson({
      data: {
        new_password: newPassword,
        old_password: oldPassword,
      },
      type: 'PUT',
      url: `${SelfService.URL.SELF}/password`,
    });
  }

  /**
   * Change your phone number.
   *
   * @see https://staging-nginz-https.zinfra.io/swagger-ui/tab.html#!//changePhone
   *
   * @param {string} phoneNumber - Phone number in E.164 format
   * @returns {Promise} Promise that resolves when phone number change process has been started on backend
   */
  putSelfPhone(phoneNumber) {
    return this.backendClient.sendJson({
      data: {
        phone: phoneNumber,
      },
      type: 'PUT',
      url: `${SelfService.URL.SELF}/phone`,
    });
  }
};
