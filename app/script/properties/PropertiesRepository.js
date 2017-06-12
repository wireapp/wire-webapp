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

z.properties.PropertiesRepository = class PropertiesRepository {
  static get CONFIG() {
    return {
      PROPERTIES_KEY: 'webapp',
    };
  }

  /**
   * Construct a new User properties repository.
   * @param {z.properties.PropertiesService} properties_service - Backend REST API properties service implementation
   */
  constructor(properties_service) {
    this.properties_service = properties_service;
    this.logger = new z.util.Logger('z.properties.PropertiesRepository', z.config.LOGGER.OPTIONS);

    this.properties = new z.properties.Properties();
    this.self = ko.observable();

    amplify.subscribe(z.event.WebApp.PROPERTIES.UPDATED, this.properties_updated.bind(this));
  }

  /**
   * Get the current preference for a property type.
   * @param {z.properties.PROPERTIES_TYPE} properties_type - Type of preference to get
   * @returns {*} Preference value
   */
  get_preference(properties_type) {
    const type_parts = properties_type.split('.');
    switch (type_parts.length) {
      case 1:
        return this.properties[type_parts[0]];
      case 2:
        return this.properties[type_parts[0]][type_parts[1]];
      case 3:
        return this.properties[type_parts[0]][type_parts[1]][type_parts[2]];
      default:
        throw new Error(`Failed to get preference of type ${properties_type}`);
    }
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
      if (keys.includes(PropertiesRepository.CONFIG.PROPERTIES_KEY)) {
        return this.properties_service.get_properties_by_key(PropertiesRepository.CONFIG.PROPERTIES_KEY)
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
   * @returns {boolean} Always returns true to ensure other subscribers handling the event
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
   * @param {z.properties.PROPERTIES_TYPE} properties_type - Type of preference to update
   * @param {*} updated_preference - New property setting
   * @returns {undefined} No return value
   */
  save_preference(properties_type, updated_preference) {
    if (updated_preference === undefined) {
      switch (properties_type) {
        case z.properties.PROPERTIES_TYPE.CONTACT_IMPORT.GOOGLE:
        case z.properties.PROPERTIES_TYPE.CONTACT_IMPORT.MACOS:
          updated_preference = Date.now();
          break;
        default:
          updated_preference = true;
      }
    }

    if (updated_preference !== this.get_preference(properties_type)) {
      this.set_preference(properties_type, updated_preference);

      this.properties_service.put_properties_by_key(PropertiesRepository.CONFIG.PROPERTIES_KEY, this.properties)
      .then(() => {
        this.logger.info(`Saved updated preference: '${properties_type}' - '${updated_preference}'`);

        switch (properties_type) {
          case z.properties.PROPERTIES_TYPE.CONTACT_IMPORT.GOOGLE:
          case z.properties.PROPERTIES_TYPE.CONTACT_IMPORT.MACOS:
            amplify.publish(z.event.WebApp.PROPERTIES.UPDATE.CONTACTS, updated_preference);
            break;
          case z.properties.PROPERTIES_TYPE.EMOJI.REPLACE_INLINE:
            amplify.publish(z.event.WebApp.PROPERTIES.UPDATE.EMOJI.REPLACE_INLINE, updated_preference);
            break;
          case z.properties.PROPERTIES_TYPE.ENABLE_DEBUGGING:
            amplify.publish(z.util.Logger.prototype.LOG_ON_DEBUG, updated_preference);
            break;
          case z.properties.PROPERTIES_TYPE.HAS_CREATED_CONVERSATION:
            amplify.publish(z.event.WebApp.PROPERTIES.UPDATE.HAS_CREATED_CONVERSATION, updated_preference);
            break;
          case z.properties.PROPERTIES_TYPE.NOTIFICATIONS:
            amplify.publish(z.event.WebApp.PROPERTIES.UPDATE.NOTIFICATIONS, updated_preference);
            break;
          case z.properties.PROPERTIES_TYPE.PREVIEWS.SEND:
            amplify.publish(z.event.WebApp.PROPERTIES.UPDATE.PREVIEWS.SEND);
            break;
          case z.properties.PROPERTIES_TYPE.PRIVACY:
            amplify.publish(z.event.WebApp.PROPERTIES.UPDATE.PRIVACY, updated_preference);
            break;
          case z.properties.PROPERTIES_TYPE.SOUND_ALERTS:
            amplify.publish(z.event.WebApp.PROPERTIES.UPDATE.SOUND_ALERTS, updated_preference);
            break;
          default:
            throw new Error(`Failed to update preference of unhandled type '${properties_type}'`);
        }
      });
    }
  }

  /**
   * Set the preference of specified type
   * @param {z.properties.PROPERTIES_TYPE} properties_type - Type of preference to set
   * @param {*} changed_preference - New preference to set
   * @returns {undefined} No return value
   */
  set_preference(properties_type, changed_preference) {
    const type_parts = properties_type.split('.');
    switch (type_parts.length) {
      case 1:
        this.properties[type_parts[0]] = changed_preference;
        break;
      case 2:
        this.properties[type_parts[0]][type_parts[1]] = changed_preference;
        break;
      case 3:
        this.properties[type_parts[0]][type_parts[1]][type_parts[2]] = changed_preference;
        break;
      default:
        throw new Error(`Failed to set preference of type ${properties_type}`);
    }
  }
};
