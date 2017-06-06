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
window.z.properties = z.properties || {};

z.properties.PropertiesService = class PropertiesService {
  static get CONFIG() {
    return {
      URL_PROPERTIES: '/properties'
    };
  }

  /**
   * Construct a new Properties Service.
   * @param {z.service.BackendClient} client - Client for the API calls
   */
  constructor(client) {
    this.client = client;
    this.logger = new z.util.Logger('z.properties.PropertiesService', z.config.LOGGER.OPTIONS);
  }

  /**
   * Clear all properties store for the user.
   * @see https://staging-nginz-https.zinfra.io/swagger-ui/#!/users/clearProperties
   * @returns {Promise} Resolves when all properties for user have been cleared
   */
  delete_properties() {
    return this.client.send_request({
      type: 'DELETE',
      url: this.client.create_url(PropertiesService.CONFIG.URL_PROPERTIES)
    });
  }

  /**
   * Delete a property.
   * @see https://staging-nginz-https.zinfra.io/swagger-ui/#!/users/deleteProperty
   * @param {string} key - Key used to store user properties
   * @returns {Promise} Resolves when the requested property for user has been cleared
   */
  delete_properties_by_key(key) {
    return this.client.send_request({
      type: 'DELETE',
      url: this.client.create_url(`${PropertiesService.CONFIG.URL_PROPERTIES}/${key}`)
    });
  }

  /**
   * List all property keys stored for the user.
   * @see https://staging-nginz-https.zinfra.io/swagger-ui/#!/users/listPropertyKeys
   * @returns {Promise} Resolves with an array of the property keys stored for the user
   */
  get_properties() {
    return this.client.send_request({
      type: 'GET',
      url: this.client.create_url(PropertiesService.CONFIG.URL_PROPERTIES)
    });
  }

  /**
   * Get a property value stored for a key.
   * @see https://staging-nginz-https.zinfra.io/swagger-ui/#!/users/getProperty
   *
   * @param {string} key - Key used to store user properties
   * @returns {Promise} Resolves with the property set for the given key
   */
  get_properties_by_key(key) {
    return this.client.send_request({
      type: 'GET',
      url: this.client.create_url(`${PropertiesService.CONFIG.URL_PROPERTIES}/${key}`)
    });
  }

  /**
   * Set a property value for a key.
   * @see https://staging-nginz-https.zinfra.io/swagger-ui/#!/users/setProperty
   *
   * @param {string} key - Key used to store user properties
   * @param {Object} properties - Payload to be stored
   * @returns {Promise} Resolves when the property has been stored
   */
  put_properties_by_key(key, properties) {
    return this.client.send_json({
      data: properties,
      type: 'PUT',
      url: this.client.create_url(`${PropertiesService.CONFIG.URL_PROPERTIES}/${key}`)
    });
  }
};
