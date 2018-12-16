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

import ReceiptMode from '../conversation/ReceiptMode';
import WebappProperties from './WebappProperties';

class PropertiesRepository {
  static get CONFIG() {
    return {
      // Value names are specified by the protocol but key names can be changed.
      ENABLE_READ_RECEIPTS: {
        defaultValue: 0,
        key: 'WIRE_RECEIPT_MODE',
      },
      WEBAPP_ACCOUNT_SETTINGS: 'webapp',
    };
  }

  /**
   * Construct a new User properties repository.
   * @param {z.properties.PropertiesService} propertiesService - Backend REST API properties service implementation
   */
  constructor(propertiesService) {
    this.propertiesService = propertiesService;
    this.logger = new z.util.Logger('PropertiesRepository', z.config.LOGGER.OPTIONS);

    this.properties = new WebappProperties();
    this.selfUser = ko.observable();
    this.receiptMode = ko.observable(PropertiesRepository.CONFIG.ENABLE_READ_RECEIPTS.defaultValue);

    amplify.subscribe(z.event.WebApp.PROPERTIES.UPDATED, this.propertiesUpdated.bind(this));
  }

  checkPrivacyPermission() {
    const isPrivacyPreferenceSet = this.getPreference(z.properties.PROPERTIES_TYPE.PRIVACY) !== undefined;

    return isPrivacyPreferenceSet
      ? Promise.resolve()
      : new Promise(resolve => {
          amplify.publish(z.event.WebApp.WARNING.MODAL, z.viewModel.ModalsViewModel.TYPE.CONFIRM, {
            action: () => {
              this.savePreference(z.properties.PROPERTIES_TYPE.PRIVACY, true);
              this._publishProperties();
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
   * @returns {Promise} Resolves when repository has been initialized
   */
  init(selfUserEntity) {
    this.selfUser(selfUserEntity);

    return this.selfUser().isTemporaryGuest() ? this._initTemporaryGuestAccount() : this._initActivatedAccount();
  }

  _fetchWebAppAccountSettings() {
    return this.propertiesService
      .getPropertiesByKey(PropertiesRepository.CONFIG.WEBAPP_ACCOUNT_SETTINGS)
      .then(properties => {
        $.extend(true, this.properties, properties);
      })
      .catch(() => {
        this.logger.warn(
          `Property "${
            PropertiesRepository.CONFIG.WEBAPP_ACCOUNT_SETTINGS
          }" doesn't exist for this account. Continuing with the default value of "${this.properties.settings}".`
        );
      });
  }

  _fetchReadReceiptsSetting() {
    const property = PropertiesRepository.CONFIG.ENABLE_READ_RECEIPTS;

    return this.propertiesService
      .getPropertiesByKey(property.key)
      .then(value => {
        this.setProperty(property.key, value);
      })
      .catch(() => {
        const message = `Property "${
          property.key
        }" doesn't exist for this account. Continuing with the default value of "${property.defaultValue}".`;
        this.logger.warn(message);
      });
  }

  _initActivatedAccount() {
    return Promise.all([this._fetchWebAppAccountSettings(), this._fetchReadReceiptsSetting()]).then(() => {
      this.logger.info('Loaded user properties', this.properties);
      this._publishProperties();
    });
  }

  _initTemporaryGuestAccount() {
    this.logger.info('Temporary guest user: Using default properties');
    this.savePreference(z.properties.PROPERTIES_TYPE.PRIVACY, false);
    return Promise.resolve(this._publishProperties());
  }

  _publishProperties() {
    amplify.publish(z.event.WebApp.PROPERTIES.UPDATED, this.properties);
    return this.properties;
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
        case z.properties.PROPERTIES_TYPE.CONTACT_IMPORT.MACOS:
          updatedPreference = Date.now();
          break;
        default:
          updatedPreference = true;
      }
    }

    if (updatedPreference !== this.getPreference(propertiesType)) {
      this._setPreference(propertiesType, updatedPreference);

      const savePromise = this.selfUser().isTemporaryGuest()
        ? this._savePreferenceTemporaryGuestAccount(propertiesType, updatedPreference)
        : this._savePreferenceActivatedAccount(propertiesType, updatedPreference);

      savePromise.then(() => this._publishPropertyUpdate(propertiesType, updatedPreference));
    }
  }

  // Reset a property to it's default state. This method is only called from external event sources (when other clients sync the settings).
  deleteProperty(key) {
    switch (key) {
      case PropertiesRepository.CONFIG.ENABLE_READ_RECEIPTS.key:
        this.setProperty(key, PropertiesRepository.CONFIG.ENABLE_READ_RECEIPTS.defaultValue);
        break;
    }
  }

  // Map a property and set it into our state
  setProperty(key, value) {
    this.logger.info(`Setting key "${key}" to value "${value}"...`);
    switch (key) {
      case PropertiesRepository.CONFIG.ENABLE_READ_RECEIPTS.key:
        value = JSON.parse(value);
        this.receiptMode(value);
        break;
    }
  }

  saveReceiptMode(receiptMode) {
    const property = PropertiesRepository.CONFIG.ENABLE_READ_RECEIPTS;
    if (receiptMode === ReceiptMode.DELIVERY) {
      return this.propertiesService.deletePropertiesByKey(property.key);
    }
    return this.propertiesService.putPropertiesByKey(property.key, receiptMode);
  }

  _savePreferenceActivatedAccount(propertiesType, updatedPreference) {
    return this.propertiesService
      .putPropertiesByKey(PropertiesRepository.CONFIG.WEBAPP_ACCOUNT_SETTINGS, this.properties)
      .then(() => this.logger.info(`Saved updated preference: '${propertiesType}' - '${updatedPreference}'`));
  }

  _savePreferenceTemporaryGuestAccount(propertiesType, updatedPreference) {
    this.logger.info(`Updated preference: '${propertiesType}' - '${updatedPreference}'`);
    return Promise.resolve();
  }

  _publishPropertyUpdate(propertiesType, updatedPreference) {
    switch (propertiesType) {
      case z.properties.PROPERTIES_TYPE.CONTACT_IMPORT.MACOS:
        amplify.publish(z.event.WebApp.PROPERTIES.UPDATE.CONTACTS, updatedPreference);
        break;
      case z.properties.PROPERTIES_TYPE.INTERFACE.THEME:
        amplify.publish(z.event.WebApp.PROPERTIES.UPDATE.INTERFACE.THEME, updatedPreference);
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
}

export default PropertiesRepository;
