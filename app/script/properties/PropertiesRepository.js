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

const PROPERTIES_KEY = 'webapp';

z.properties.PropertiesRepository = class PropertiesRepository {
  /**
   * Construct a new User properties repository.
   * @param {z.properties.PropertiesService} properties_service - Backend REST API properties service implementation
   * @returns {PropertiesRepository} Properties repository for all property interactions with the user property service
   */
  constructor(properties_service) {
    this.properties_service = properties_service;
    this.logger = new z.util.Logger('z.properties.PropertiesRepository', z.config.LOGGER.OPTIONS);

    this.properties = new z.properties.Properties();
    this.self = ko.observable();

    amplify.subscribe(z.event.WebApp.PROPERTIES.UPDATED, this.properties_updated.bind(this));
    return this;
  }

  /**
   * Initialize properties on app startup.
   * @param {z.entity.User} self_user_et - Self user
   * @returns {undefined} No return value
   */
  init(self_user_et) {
    this.properties_service.get_properties()
    .then((keys) => {
      this.self(self_user_et);
      if (keys.includes(PROPERTIES_KEY)) {
        return this.properties_service.get_properties_by_key(PROPERTIES_KEY)
        .then((properties) => {
          $.extend(true, this.properties, properties);
          this.logger.info('Loaded user properties', this.properties);
        });
      }

      this.logger.info('User has no saved properties, using defaults');
    })
    .then(() => {
      amplify.publish(z.event.WebApp.PROPERTIES.UPDATED, this.properties);
      amplify.publish(z.event.WebApp.ANALYTICS.INIT, this.properties);
    });
  }

  /**
   * Updated properties handler.
   * @param {z.properties.Properties} properties - New properties
   * @returns {Boolean} Always returns true to ensure other subscribers handling the event
   */
  properties_updated(properties) {
    if (properties[z.properties.PROPERTIES_TYPE.ENABLE_DEBUGGING]) {
      amplify.publish(z.util.Logger.prototype.LOG_ON_DEBUG, properties[z.properties.PROPERTIES_TYPE.ENABLE_DEBUGGING]);
    }
    return true;
  }

  /**
   * Save property setting.
   *
   * @param {z.properties.PROPERTIES_TYPE} properties_type - Property type to update
   * @param {*} updated_preference - New property setting
   * @returns {undefined} No return value
   */
  save_preference(properties_type, updated_preference) {
    if (!updated_preference) {
      switch (properties_type) {
        case z.properties.PROPERTIES_TYPE.CONTACT_IMPORT.GOOGLE:
        case z.properties.PROPERTIES_TYPE.CONTACT_IMPORT.MACOS:
          updated_preference = Date.now();
          break;
        default:
          updated_preference = true;
      }
    }

    let current_preference;
    const type_parts = properties_type.split('.');
    switch (type_parts.length) {
      case 1:
        current_preference = this.properties[type_parts[0]];
        break;
      case 2:
        current_preference = this.properties[type_parts[0]][type_parts[1]];
        break;
      case 3:
        current_preference = this.properties[type_parts[0]][type_parts[1]][type_parts[2]];
        break;
    }

    if (updated_preference !== current_preference) {
      current_preference = updated_preference;

      this.properties_service.put_properties_by_key(PROPERTIES_KEY, this.properties)
      .then(() => {
        this.logger.info(`Saved updated settings: '${properties_type}' - '${updated_preference}'`);

        switch (properties_type) {
          case z.properties.PROPERTIES_TYPE.CONTACT_IMPORT.GOOGLE:
          case z.properties.PROPERTIES_TYPE.CONTACT_IMPORT.MACOS:
            amplify.publish(z.event.WebApp.PROPERTIES.UPDATE.CONTACTS);
            break;
          case z.properties.PROPERTIES_TYPE.ENABLE_DEBUGGING:
            amplify.publish(z.util.Logger.prototype.LOG_ON_DEBUG, updated_preference);
            break;
          case z.properties.PROPERTIES_TYPE.HAS_CREATED_CONVERSATION:
            amplify.publish(z.event.WebApp.PROPERTIES.UPDATE.HAS_CREATED_CONVERSATION);
            break;
          case z.properties.PROPERTIES_TYPE.NOTIFICATIONS:
            amplify.publish(z.event.WebApp.PROPERTIES.UPDATE.NOTIFICATIONS);
            break;
          case z.properties.PROPERTIES_TYPE.PRIVACY:
            amplify.publish(z.event.WebApp.PROPERTIES.UPDATE.PRIVACY);
            break;
          case z.properties.PROPERTIES_TYPE.SOUND_ALERTS:
            amplify.publish(z.event.WebApp.PROPERTIES.UPDATE.SOUND_ALERTS);
        }
      });
    }
  }
};
