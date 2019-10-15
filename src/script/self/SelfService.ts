/*
 * Wire
 * Copyright (C) 2019 Wire Swiss GmbH
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

import {BackendClient} from '../service/BackendClient';
import {ConsentValue} from '../user/ConsentValue';

export class SelfService {
  private readonly backendClient: BackendClient;

  static get URL(): {SELF: string} {
    return {
      SELF: '/self',
    };
  }

  /**
   * @param {BackendClient} backendClient - Client for the API calls
   */
  constructor(backendClient: BackendClient) {
    this.backendClient = backendClient;
  }

  /**
   * Delete self user.
   *
   * @see https://staging-nginz-https.zinfra.io/swagger-ui/tab.html#!//deleteUser
   *
   * @param {string} [password] - Self user password to authorize immediate account deletion
   * @returns {Promise} Promise that resolves when account deletion has been initiated
   */
  deleteSelf(password: string): Promise<void> {
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
  getSelf(): Promise<any> {
    return this.backendClient.sendRequest({
      type: 'GET',
      url: SelfService.URL.SELF,
    });
  }

  getSelfConsent(): Promise<ConsentValue> {
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
  putSelf(selfData: {}): Promise<void> {
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
  putSelfConsent(consentType: number, value: number, source: string): Promise<void> {
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
  putSelfEmail(email: string): Promise<void> {
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
  putSelfHandle(username: string): Promise<void> {
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
  putSelfLocale(newLocale: string): Promise<void> {
    return this.backendClient.sendJson({
      data: {
        locale: newLocale,
      },
      type: 'PUT',
      url: `${SelfService.URL.SELF}/locale`,
    });
  }

  putSelfPassword(newPassword: string, oldPassword?: string): Promise<void> {
    return this.backendClient.sendJson({
      data: {
        new_password: newPassword,
        old_password: oldPassword,
      },
      type: 'PUT',
      url: `${SelfService.URL.SELF}/password`,
    });
  }

  putSelfPhone(phoneNumber: string): Promise<void> {
    return this.backendClient.sendJson({
      data: {
        phone: phoneNumber,
      },
      type: 'PUT',
      url: `${SelfService.URL.SELF}/phone`,
    });
  }
}
