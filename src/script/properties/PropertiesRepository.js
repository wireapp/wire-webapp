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

import {getLogger} from 'Util/Logger';
import {Environment} from 'Util/Environment';
import {t} from 'Util/LocalizerUtil';

import {Config} from '../auth/config';
import {ConsentType} from '../user/ConsentType';
import {ConsentValue} from '../user/ConsentValue';
import {ReceiptMode} from '../conversation/ReceiptMode';
import {WebappProperties} from './WebappProperties';
import {PROPERTIES_TYPE} from './PropertiesType';

import {ModalsViewModel} from '../view_model/ModalsViewModel';
import {WebAppEvents} from '../event/WebApp';

class PropertiesRepository {
  // Value names are specified by the protocol but key names can be changed.
  static get CONFIG() {
    return {
      WEBAPP_ACCOUNT_SETTINGS: 'webapp',
      WIRE_MARKETING_CONSENT: {
        defaultValue: ConsentValue.NOT_GIVEN,
        key: 'WIRE_MARKETING_CONSENT',
      },
      WIRE_RECEIPT_MODE: {
        defaultValue: ReceiptMode.DELIVERY,
        key: 'WIRE_RECEIPT_MODE',
      },
    };
  }

  constructor(propertiesService, selfService) {
    this.propertiesService = propertiesService;
    this.selfService = selfService;
    this.logger = getLogger('PropertiesRepository');

    this.properties = new WebappProperties();
    this.selfUser = ko.observable();
    this.receiptMode = ko.observable(PropertiesRepository.CONFIG.WIRE_RECEIPT_MODE.defaultValue);
    /** @type {ko.Observable<ConsentValue | boolean>} */
    this.marketingConsent = ko.observable(PropertiesRepository.CONFIG.WIRE_MARKETING_CONSENT.defaultValue);
  }

  checkPrivacyPermission() {
    const isCheckConsentDisabled = !z.config.FEATURE.CHECK_CONSENT;
    const isPrivacyPreferenceSet = this.getPreference(PROPERTIES_TYPE.PRIVACY) !== undefined;

    return isCheckConsentDisabled || isPrivacyPreferenceSet
      ? Promise.resolve()
      : new Promise(resolve => {
          amplify.publish(WebAppEvents.WARNING.MODAL, ModalsViewModel.TYPE.CONFIRM, {
            preventClose: true,
            primaryAction: {
              action: () => {
                this.savePreference(PROPERTIES_TYPE.PRIVACY, true);
                this._publishProperties();
                resolve();
              },
              text: t('modalImproveWireAction'),
            },
            secondaryAction: {
              action: () => {
                this.savePreference(PROPERTIES_TYPE.PRIVACY, false);
                resolve();
              },
              text: t('modalImproveWireSecondary'),
            },
            text: {
              message: t('modalImproveWireMessage', Config.BRAND_NAME),
              title: t('modalImproveWireHeadline', Config.BRAND_NAME),
            },
          });
        });
  }

  /**
   * Get the current preference for a property type.
   * @param {PROPERTIES_TYPE} propertiesType - Type of preference to get
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
   * @param {User} selfUserEntity - Self user
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
          `Property "${PropertiesRepository.CONFIG.WEBAPP_ACCOUNT_SETTINGS}" doesn't exist for this account. Continuing with the default value of "${this.properties.settings}".`,
        );
      });
  }

  _fetchReadReceiptsSetting() {
    const property = PropertiesRepository.CONFIG.WIRE_RECEIPT_MODE;

    return this.propertiesService
      .getPropertiesByKey(property.key)
      .then(value => {
        this.setProperty(property.key, value);
      })
      .catch(() => {
        const message = `Property "${property.key}" doesn't exist for this account. Continuing with the default value of "${property.defaultValue}".`;
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
    this.savePreference(PROPERTIES_TYPE.PRIVACY, false);
    return Promise.resolve(this._publishProperties());
  }

  _publishProperties() {
    amplify.publish(WebAppEvents.PROPERTIES.UPDATED, this.properties);
    return this.properties;
  }

  /**
   * Save property setting.
   *
   * @param {PROPERTIES_TYPE} propertiesType - Type of preference to update
   * @param {*} updatedPreference - New property setting
   * @returns {undefined} No return value
   */
  savePreference(propertiesType, updatedPreference) {
    if (updatedPreference === undefined) {
      switch (propertiesType) {
        case PROPERTIES_TYPE.CONTACT_IMPORT.MACOS:
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
      case PropertiesRepository.CONFIG.WIRE_RECEIPT_MODE.key:
        this.setProperty(key, ReceiptMode.DELIVERY);
        break;
      case PropertiesRepository.CONFIG.WIRE_MARKETING_CONSENT.key:
        this.setProperty(key, ConsentValue.NOT_GIVEN);
        break;
    }
  }

  // Map a property and set it into our state
  setProperty(key, value) {
    this.logger.info(`Setting key "${key}"...`, value);

    switch (key) {
      case PropertiesRepository.CONFIG.WEBAPP_ACCOUNT_SETTINGS:
        if (this.properties.version === value.version) {
          this.properties = Object.assign({}, this.properties, value);
          this._publishProperties();
        }
        break;
      case PropertiesRepository.CONFIG.WIRE_MARKETING_CONSENT.key:
        this.marketingConsent(value);
        break;
      case PropertiesRepository.CONFIG.WIRE_RECEIPT_MODE.key:
        this.receiptMode(value);
        break;
    }
  }

  updateProperty(key, value) {
    switch (key) {
      case PropertiesRepository.CONFIG.WIRE_RECEIPT_MODE.key:
        if (value === ReceiptMode.DELIVERY) {
          return this.propertiesService.deletePropertiesByKey(key);
        }
        return this.propertiesService.putPropertiesByKey(key, value);
        break;
      case PropertiesRepository.CONFIG.WIRE_MARKETING_CONSENT.key:
        return this.selfService
          .putSelfConsent(ConsentType.MARKETING, value, `Webapp ${Environment.version(false)}`)
          .then(() => {
            if (value === ConsentValue.NOT_GIVEN) {
              return this.propertiesService.deletePropertiesByKey(key);
            }
            return this.propertiesService.putPropertiesByKey(key, value);
          });
        break;
    }
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
      case PROPERTIES_TYPE.CONTACT_IMPORT.MACOS:
        amplify.publish(WebAppEvents.PROPERTIES.UPDATE.CONTACTS, updatedPreference);
        break;
      case PROPERTIES_TYPE.INTERFACE.THEME:
        amplify.publish(WebAppEvents.PROPERTIES.UPDATE.INTERFACE.THEME, updatedPreference);
        break;
      case PROPERTIES_TYPE.EMOJI.REPLACE_INLINE:
        amplify.publish(WebAppEvents.PROPERTIES.UPDATE.EMOJI.REPLACE_INLINE, updatedPreference);
        break;
      case PROPERTIES_TYPE.ENABLE_DEBUGGING:
        amplify.publish(getLogger.prototype.LOG_ON_DEBUG, updatedPreference);
        break;
      case PROPERTIES_TYPE.NOTIFICATIONS:
        amplify.publish(WebAppEvents.PROPERTIES.UPDATE.NOTIFICATIONS, updatedPreference);
        break;
      case PROPERTIES_TYPE.PREVIEWS.SEND:
        amplify.publish(WebAppEvents.PROPERTIES.UPDATE.PREVIEWS.SEND, updatedPreference);
        break;
      case PROPERTIES_TYPE.PRIVACY:
        amplify.publish(WebAppEvents.PROPERTIES.UPDATE.PRIVACY, updatedPreference);
        break;
      case PROPERTIES_TYPE.SOUND_ALERTS:
        amplify.publish(WebAppEvents.PROPERTIES.UPDATE.SOUND_ALERTS, updatedPreference);
        break;
      default:
        throw new Error(`Failed to update preference of unhandled type '${propertiesType}'`);
    }
  }

  /**
   * Set the preference of specified type
   *
   * @private
   * @param {PROPERTIES_TYPE} propertiesType - Type of preference to set
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

export {PropertiesRepository};
