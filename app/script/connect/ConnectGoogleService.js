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
window.z.connect = z.connect = {};

/*
Connect Google Service for calls to the Google's REST API.

@see https://github.com/google/google-api-javascript-client
  https://developers.google.com/api-client-library/javascript/
  https://developers.google.com/google-apps/contacts/v3
  Use updated-min for newer updates
  max-results
*/
z.connect.ConnectGoogleService = class ConnectGoogleService {
  constructor(client) {
    this.client = client;
    this.logger = new z.util.Logger('z.connect.ConnectGoogleService', z.config.LOGGER.OPTIONS);
    this.client_id = '481053726221-71f8tbhghg4ug5put5v3j5pluv0di2fc.apps.googleusercontent.com';
    this.scopes = 'https://www.googleapis.com/auth/contacts.readonly';
  }

  /*
  Retrieves the user's Google Contacts.
  @return {Promise} - Resolves with the Google contacts
  */
  get_contacts() {
    return this._init_library()
    .then(() => {
      return this._get_access_token();
    }).then((access_token) => {
      return this._get_contacts(access_token);
    }).catch((error) => {
      return this.logger.error(`Failed to import contacts from Google: ${error.message}`, error);
    });
  }

  /*
  Authenticate before getting the contacts.
  @private
  @return {Promise} - Resolves when the user has been successfully authenticated
  */
  _authenticate() {
    return new Promise((resolve, reject) => {
      this.logger.info('Authenticating with Google for contacts access');

      let on_response = (response) => {
        if (!(response != null ? response.error : undefined)) {
          this.logger.info('Received access token from Google', response);
          return resolve(response.access_token);
        }

        this.logger.error('Failed to authenticate with Google', response);
        return reject(response != null ? response.error : undefined);
      };

      return window.gapi.auth.authorize({client_id: this.client_id, scope: this.scopes, immediate: false}, on_response);
    });
  }

  /*
  Check for cached access token or authenticate with Google.
  @return {Promise} - Resolves with the access token
  */
  _get_access_token() {
    return new Promise((resolve, reject) => {
      if (window.gapi.auth) {
        let auth_token = window.gapi.auth.getToken();
        if (auth_token) {
          this.logger.info('Using cached access token to access Google contacts', auth_token);
          return resolve(auth_token.access_token);
        }
        return this._authenticate().then(resolve).catch(reject);
      }

      this.logger.warn('Google Auth Client for JavaScript not loaded');
      let error = new z.connect.ConnectError(z.connect.ConnectError.prototype.TYPE.GOOGLE_CLIENT);
      Raygun.send(error);
      return reject(error);
    });
  }

  /*
  Retrieve the user's Google Contacts using a call to their backend.
  @private
  @return {Promise} - Resolves with the user's contacts
  */
  _get_contacts(access_token) {
    return new Promise((resolve, reject) => {
      this.logger.info('Fetching address book from Google');
      let api_endpoint = 'https://www.google.com/m8/feeds/contacts/default/full';
      return $.get(`${api_endpoint}?access_token=${access_token}&alt=json&max-results=15000&v=3.0`)
      .always((data_or_jqXHR, textStatus) => {
        if (textStatus !== 'error') {
          this.logger.info('Received address book from Google', data_or_jqXHR);
          return resolve(data_or_jqXHR);
        }
        this.logger.error('Failed to fetch address book from Google', data_or_jqXHR);
        return reject(data_or_jqXHR.responseJSON || new z.service.BackendClientError(data_or_jqXHR.status));
      });
    });
  }

  /*
  Initialize Google Auth Client for JavaScript is loaded.
  @return {Promise} - Resolves when the authentication library is initialized
  */
  _init_library() {
    if (window.gapi) {
      return Promise.resolve();
    }
    return this._load_library();
  }

  /*
  Lazy loading of the Google Auth Client for JavaScript.
  @return {Promise} - Resolves when the authentication library is loaded
  */
  _load_library() {
    return new Promise((resolve) => {
      window.gapi_loaded = resolve;

      this.logger.info('Lazy loading Google Auth API');
      let script_node = document.createElement('script');
      script_node.src = 'https://apis.google.com/js/auth.js?onload=gapi_loaded';
      let script_element = document.getElementsByTagName('script')[0];
      return script_element.parentNode.insertBefore(script_node, script_element);
    });
  }
};
