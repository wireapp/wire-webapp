/*
 * Wire
 * Copyright (C) 2017 Wire Swiss GmbH
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
window.z.auth = z.auth || {};

z.auth.AuthRepository = class AuthRepository {
  static get ACCESS_TOKEN_TRIGGER() {
    return {
      IMMEDIATE: 'AuthRepository.ACCESS_TOKEN_TRIGGER.IMMEDIATE',
      SCHEDULED: 'AuthRepository.ACCESS_TOKEN_TRIGGER.SCHEDULED',
      UNAUTHORIZED_REQUEST: 'AuthRepository.ACCESS_TOKEN_TRIGGER.UNAUTHORIZED_REQUEST',
      WEB_SOCKET: 'AuthRepository.ACCESS_TOKEN_TRIGGER.WEB_SOCKET',
    };
  }

  /**
   * Construct a new AuthService
   * @param {z.auth.AuthService} auth_service - Service for authentication interactions with the backend
   */
  constructor(auth_service) {
    this.access_token_refresh = undefined;
    this.auth_service = auth_service;
    this.logger = new z.util.Logger('z.auth.AuthRepository', z.config.LOGGER.OPTIONS);
    amplify.subscribe(z.event.WebApp.CONNECTION.ACCESS_TOKEN.RENEW, this.renew_access_token.bind(this));
  }

  /**
   * Print all cookies for a user in the console.
   * @returns {undefined} No return value
   */
  list_cookies() {
    this.auth_service.get_cookies()
      .then((cookies) => {
        this.logger.force_log('Backend cookies:');
        cookies.forEach((cookie, index) => {
          const expiration = z.util.format_timestamp(cookie.time, false);
          const log = `Label: ${cookie.label} | Type: ${cookie.type} |  Expiration: ${expiration}`;
          this.logger.force_log(`Cookie No. ${index + 1} | ${log}`);
        });
      })
      .catch((error) => {
        this.logger.force_log('Could not list user cookies', error);
      });
  }

  /**
   * Login (with email or phone) in order to obtain an access-token and cookie.
   *
   * @param {Object} login - Containing sign in information
   * @param {string} login.email - Email address for a password login
   * @param {string} login.phone - Phone number for a password or SMS login
   * @param {string} login.password - Password for a password login
   * @param {string} login.code - Login code for an SMS login
   * @param {boolean} persist - Request a persistent cookie instead of a session cookie
   * @returns {Promise} Promise that resolves with the received access token
   */
  login(login, persist) {
    return this.auth_service.post_login(login, persist)
      .then((response) => {
        this.save_access_token(response);
        z.util.StorageUtil.set_value(z.storage.StorageKey.AUTH.PERSIST, persist);
        z.util.StorageUtil.set_value(z.storage.StorageKey.AUTH.SHOW_LOGIN, true);
        return response;
      });
  }

  /**
   * Logout the user on the backend.
   * @returns {Promise} Will always resolve
   */
  logout() {
    return this.auth_service.post_logout()
      .then(() => {
        this.logger.info('Log out on backend successful');
      })
      .catch((error) => {
        this.logger.warn(`Log out on backend failed: ${error.message}`, error);
      });
  }

  /**
   * Register a new user (with email).
   *
   * @param {Object} new_user - Containing the email, username and password needed for account creation
   * @param {string} new_user.name - Username
   * @param {string} new_user.email - Email address
   * @param {string} new_user.password - Password for user
   * @param {string} new_user.label - Cookie label
   * @returns {Promise} Resolves on success
   */
  register(new_user) {
    return this.auth_service.post_register(new_user)
      .then((response) => {
        z.util.StorageUtil.set_value(z.storage.StorageKey.AUTH.PERSIST, true);
        z.util.StorageUtil.set_value(z.storage.StorageKey.AUTH.SHOW_LOGIN, true);
        z.util.StorageUtil.set_value(new_user.label_key, new_user.label);
        this.logger.info(`COOKIE::'${new_user.label}' Saved cookie label with key '${new_user.label_key}' in Local Storage`, {
          key: new_user.label_key,
          value: new_user.label,
        });
        return response;
      });
  }

  /**
   * Resend an email or phone activation code.
   *
   * @param {Object} send_activation_code - Containing the email or phone number needed to resend activation email
   * @param {string} send_activation_code.email - Email address
   * @param {string} send_activation_code.phone - Phone number
   * @returns {Promise} Resolves on success
   */
  resend_activation(send_activation_code) {
    return this.auth_service.post_activate_send(send_activation_code);
  }

  /**
   * Retrieve personal invite information.
   * @param {string} invite - Invite code
   * @returns {Promise} Resolves with the invite data
   */
  retrieve_invite(invite) {
    return this.auth_service.get_invitations_info(invite);
  }

  /**
   * Request SMS validation code.
   * @param {Object} request_code - Containing the phone number in E.164 format and whether a code should be forced
   * @returns {Promise} Resolves on success
   */
  request_login_code(request_code) {
    return this.auth_service.post_login_send(request_code);
  }

  /**
   * Renew access-token provided a valid cookie.
   * @param {AuthRepository.ACCESS_TOKEN_TRIGGER} trigger - Trigger for access token renewal
   * @returns {undefined} No return value
   */
  renew_access_token(trigger) {
    this.logger.info(`Access token renewal started. Source: ${trigger}`);
    this.get_access_token()
      .then(() => {
        this.auth_service.client.execute_request_queue();
        amplify.publish(z.event.WebApp.CONNECTION.ACCESS_TOKEN.RENEWED);
      })
      .catch((error) => {
        if ((error.type === z.auth.AccessTokenError.TYPE.REQUEST_FORBIDDEN) || z.util.Environment.frontend.is_localhost()) {
          this.logger.warn(`Session expired on access token refresh: ${error.message}`, error);
          Raygun.send(error);
          return amplify.publish(z.event.WebApp.LIFECYCLE.SIGN_OUT, z.auth.SignOutReason.SESSION_EXPIRED, false);
        }

        if (error.type !== z.auth.AccessTokenError.TYPE.REFRESH_IN_PROGRESS) {
          this.logger.error(`Refreshing access token failed: '${error.type}'`, error);
          amplify.publish(z.event.WebApp.WARNING.SHOW, z.ViewModel.WarningType.CONNECTIVITY_RECONNECT);
        }
      });
  }

  /**
   * Deletes all access token data stored on the client.
   * @returns {undefined} No return value
   */
  delete_access_token() {
    z.util.StorageUtil.reset_value(z.storage.StorageKey.AUTH.ACCESS_TOKEN.VALUE);
    z.util.StorageUtil.reset_value(z.storage.StorageKey.AUTH.ACCESS_TOKEN.EXPIRATION);
    z.util.StorageUtil.reset_value(z.storage.StorageKey.AUTH.ACCESS_TOKEN.TTL);
    z.util.StorageUtil.reset_value(z.storage.StorageKey.AUTH.ACCESS_TOKEN.TYPE);
  }

  /**
   * Get the cached access token from the Amplify store.
   * @returns {Promise} Resolves when the access token was retrieved
   */
  get_cached_access_token() {
    return new Promise(((resolve, reject) => {
      const access_token = z.util.StorageUtil.get_value(z.storage.StorageKey.AUTH.ACCESS_TOKEN.VALUE);
      const access_token_type = z.util.StorageUtil.get_value(z.storage.StorageKey.AUTH.ACCESS_TOKEN.TYPE);

      if (access_token) {
        this.logger.info('Cached access token found in Local Storage', {access_token});
        this.auth_service.save_access_token_in_client(access_token_type, access_token);
        this._schedule_token_refresh(z.util.StorageUtil.get_value(z.storage.StorageKey.AUTH.ACCESS_TOKEN.EXPIRATION));
        return resolve();
      }

      return reject(new z.auth.AccessTokenError(z.auth.AccessTokenError.TYPE.NOT_FOUND_IN_CACHE));
    }));
  }

  /**
   * Initially get access-token provided a valid cookie.
   * @returns {Promise} Resolves with the access token data
   */
  get_access_token() {
    if (this.auth_service.client.request_queue_blocked_state() === z.service.RequestQueueBlockedState.ACCESS_TOKEN_REFRESH) {
      return Promise.reject(new z.auth.AccessTokenError(z.auth.AccessTokenError.TYPE.REFRESH_IN_PROGRESS));
    }

    return this.auth_service.post_access()
      .then((access_token) => {
        this.save_access_token(access_token);
        return access_token;
      });
  }

  /**
   * Store the access token using Amplify.
   *
   * @example Access Token data we expect:
   *  access_token: Lt-IRHxkY9JLA5UuBR3Exxj5lCUf...
   *  access_token_expiration: 1424951321067 => Thu, 26 Feb 2015 11:48:41 GMT
   *  access_token_type: Bearer
   *  access_token_ttl: 900000 => 900s/15min
   *
   * @param {Object|string} access_token_data - Access Token
   * @option {string} access_token_data - access_token
   * @option {string} access_token_data - expires_in
   * @option {string} access_token_data - type
   * @returns {undefined} No return value
   */
  save_access_token(access_token_data) {
    const expires_in_millis = 1000 * access_token_data.expires_in;
    const expiration_timestamp = Date.now() + expires_in_millis;

    z.util.StorageUtil.set_value(z.storage.StorageKey.AUTH.ACCESS_TOKEN.VALUE, access_token_data.access_token, access_token_data.expires_in);
    z.util.StorageUtil.set_value(z.storage.StorageKey.AUTH.ACCESS_TOKEN.EXPIRATION, expiration_timestamp, access_token_data.expires_in);
    z.util.StorageUtil.set_value(z.storage.StorageKey.AUTH.ACCESS_TOKEN.TTL, expires_in_millis, access_token_data.expires_in);
    z.util.StorageUtil.set_value(z.storage.StorageKey.AUTH.ACCESS_TOKEN.TYPE, access_token_data.token_type, access_token_data.expires_in);

    this.auth_service.save_access_token_in_client(access_token_data.token_type, access_token_data.access_token);

    this._log_access_token_update(access_token_data, expiration_timestamp);
    this._schedule_token_refresh(expiration_timestamp);
  }

  /**
   * Logs the update of the access token.
   *
   * @private
   * @param {Object|string} access_token_data - Access Token
   * @option {string} access_token_data - access_token
   * @option {string} access_token_data - expires_in
   * @option {string} access_token_data - type
   * @param {number} expiration_timestamp - Timestamp when access token expires
   * @returns {undefined}
   */
  _log_access_token_update(access_token_data, expiration_timestamp) {
    const expiration_log = z.util.format_timestamp(expiration_timestamp, false);
    this.logger.info(`Saved updated access token. It will expire on: ${expiration_log}`, access_token_data);
  }

  /**
   * Refreshes the access token in time before it expires.
   *
   * @private
   * @note Access token will be refreshed 1 minute (60000ms) before it expires
   * @param {number} expiration_timestamp - The expiration date (and time) as timestamp
   * @returns {undefined} No undefined value
   */
  _schedule_token_refresh(expiration_timestamp) {
    if (this.access_token_refresh) {
      window.clearTimeout(this.access_token_refresh);
    }
    const callback_timestamp = expiration_timestamp - 60000;

    if (callback_timestamp < Date.now()) {
      return this.renew_access_token(AuthRepository.ACCESS_TOKEN_TRIGGER.IMMEDIATE);
    }
    const time = z.util.format_timestamp(callback_timestamp, false);
    this.logger.info(`Scheduling next access token refresh for '${time}'`);

    this.access_token_refresh = window.setTimeout(() => {
      if (callback_timestamp > (Date.now() + 15000)) {
        this.logger.info(`Access token refresh scheduled for '${time}' skipped because it was executed late`);
      }

      if (navigator.onLine) {
        return this.renew_access_token(`Schedule for '${time}'`);
      }

      this.logger.info(`Access token refresh scheduled for '${time}' skipped because we are offline`);

    }, callback_timestamp - Date.now());

  }
};
