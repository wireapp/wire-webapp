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
window.z.properties = z.properties || {};

z.properties.PropertiesRepository = class PropertiesRepository {
  static get CONFIG() {
    return {
      PROPERTIES_KEY: 'webapp',
    };
  }

  /**
   * Construct a new User properties repository.
   * @param {z.properties.PropertiesService} propertiesService - Backend REST API properties service implementation
   */
  constructor(propertiesService) {
    this.propertiesService = propertiesService;
    this.logger = new z.util.Logger('z.properties.PropertiesRepository', z.config.LOGGER.OPTIONS);

    this.properties = new z.properties.PropertiesEntity();
    this.selfUser = ko.observable();

    amplify.subscribe(z.event.WebApp.PROPERTIES.UPDATED, this.propertiesUpdated.bind(this));
  }

  checkPrivacyPermission() {
    if (this.selfUser().isTemporaryGuest()) {
      this.savePreference(z.properties.PROPERTIES_TYPE.PRIVACY, true);
      return Promise.resolve();
    }

    const isPrivacyPreferenceSet = this.getPreference(z.properties.PROPERTIES_TYPE.PRIVACY) !== undefined;

    return isPrivacyPreferenceSet
      ? Promise.resolve()
      : new Promise(resolve => {
          amplify.publish(z.event.WebApp.WARNING.MODAL, z.viewModel.ModalsViewModel.TYPE.CONFIRM, {
            action: () => {
              this.savePreference(z.properties.PROPERTIES_TYPE.PRIVACY, true);
              amplify.publish(z.event.WebApp.PROPERTIES.UPDATED, this.properties);
              resolve();
            },
            preventClose: true,
            secondary: () => {
              this.savePreference(z.properties.PROPERTIES_TYPE.PRIVACY, false);
              resolve();
            },
            text: {
              action: z.l10n.text(z.string.modalImproveWireAction),
              message: z.l10n.text(z.string.modalImproveWireMessage),
              secondary: z.l10n.text(z.string.modalImproveWireSecondary),
              title: z.l10n.text(z.string.modalImproveWireHeadline),
            },
            warning: false,
          });
        });
  }

  /**
   * Get the current preference for a property type.
   * @param {z.properties.PROPERTIES_TYPE} propertiesType - Type of preference to get
   * @returns {*} Preference value
   */
  getPreference(propertiesType) {
    const typeParts = propertiesType.split('.');
    const [partOne, partTwo, partThree] = typeParts;

    switch (typeParts.length) {
      case 1:
        return this.properties[partOne];
      case 2:
        return this.properties[partOne][partTwo];
      case 3:
        return this.properties[partOne][partTwo][partThree];
      default:
        throw new Error(`Failed to get preference of type ${propertiesType}`);
    }
  }

  /**
   * Initialize properties on app startup.
   * @param {z.entity.User} selfUserEntity - Self user
   * @returns {undefined} No return value
   */
  init(selfUserEntity) {
    this.propertiesService
      .getProperties()
      .then(keys => {
        this.selfUser(selfUserEntity);
        if (keys.includes(PropertiesRepository.CONFIG.PROPERTIES_KEY)) {
          return this.propertiesService
            .getPropertiesByKey(PropertiesRepository.CONFIG.PROPERTIES_KEY)
            .then(properties => {
              $.extend(true, this.properties, properties);
              this.logger.info('Loaded user properties', this.properties);
            });
        }

        this.logger.info('User has no saved properties, using defaults');
      })
      .then(() => {
        amplify.publish(z.event.WebApp.PROPERTIES.UPDATED, this.properties);
      });
  }

  /**
   * Updated properties handler.
   * @param {z.properties.Properties} properties - New properties
   * @returns {boolean} Always returns true to ensure other subscribers handling the event
   */
  propertiesUpdated(properties) {
    if (properties[z.properties.PROPERTIES_TYPE.ENABLE_DEBUGGING]) {
      amplify.publish(z.util.Logger.prototype.LOG_ON_DEBUG, properties[z.properties.PROPERTIES_TYPE.ENABLE_DEBUGGING]);
    }
    return true;
  }

  /**
   * Save property setting.
   *
   * @param {z.properties.PROPERTIES_TYPE} propertiesType - Type of preference to update
   * @param {*} updatedPreference - New property setting
   * @returns {undefined} No return value
   */
  savePreference(propertiesType, updatedPreference) {
    if (updatedPreference === undefined) {
      switch (propertiesType) {
        case z.properties.PROPERTIES_TYPE.CONTACT_IMPORT.GOOGLE:
        case z.properties.PROPERTIES_TYPE.CONTACT_IMPORT.MACOS:
          updatedPreference = Date.now();
          break;
        default:
          updatedPreference = true;
      }
    }

    if (updatedPreference !== this.getPreference(propertiesType)) {
      this._setPreference(propertiesType, updatedPreference);

      this.propertiesService
        .putPropertiesByKey(PropertiesRepository.CONFIG.PROPERTIES_KEY, this.properties)
        .then(() => {
          this.logger.info(`Saved updated preference: '${propertiesType}' - '${updatedPreference}'`);

          switch (propertiesType) {
            case z.properties.PROPERTIES_TYPE.CONTACT_IMPORT.GOOGLE:
            case z.properties.PROPERTIES_TYPE.CONTACT_IMPORT.MACOS:
              amplify.publish(z.event.WebApp.PROPERTIES.UPDATE.CONTACTS, updatedPreference);
              break;
            case z.properties.PROPERTIES_TYPE.EMOJI.REPLACE_INLINE:
              amplify.publish(z.event.WebApp.PROPERTIES.UPDATE.EMOJI.REPLACE_INLINE, updatedPreference);
              break;
            case z.properties.PROPERTIES_TYPE.ENABLE_DEBUGGING:
              amplify.publish(z.util.Logger.prototype.LOG_ON_DEBUG, updatedPreference);
              break;
            case z.properties.PROPERTIES_TYPE.NOTIFICATIONS:
              amplify.publish(z.event.WebApp.PROPERTIES.UPDATE.NOTIFICATIONS, updatedPreference);
              break;
            case z.properties.PROPERTIES_TYPE.PREVIEWS.SEND:
              amplify.publish(z.event.WebApp.PROPERTIES.UPDATE.PREVIEWS.SEND, updatedPreference);
              break;
            case z.properties.PROPERTIES_TYPE.PRIVACY:
              amplify.publish(z.event.WebApp.PROPERTIES.UPDATE.PRIVACY, updatedPreference);
              break;
            case z.properties.PROPERTIES_TYPE.SOUND_ALERTS:
              amplify.publish(z.event.WebApp.PROPERTIES.UPDATE.SOUND_ALERTS, updatedPreference);
              break;
            default:
              throw new Error(`Failed to update preference of unhandled type '${propertiesType}'`);
          }
        });
    }
  }

  /**
   * Set the preference of specified type
   *
   * @private
   * @param {z.properties.PROPERTIES_TYPE} propertiesType - Type of preference to set
   * @param {*} changedPreference - New preference to set
   * @returns {undefined} No return value
   */
  _setPreference(propertiesType, changedPreference) {
    const typeParts = propertiesType.split('.');
    const [partOne, partTwo, partThree] = typeParts;

    switch (typeParts.length) {
      case 1:
        this.properties[partOne] = changedPreference;
        break;
      case 2:
        this.properties[partOne][partTwo] = changedPreference;
        break;
      case 3:
        this.properties[partOne][partTwo][partThree] = changedPreference;
        break;
      default:
        throw new Error(`Failed to set preference of type ${propertiesType}`);
    }
  }
};
