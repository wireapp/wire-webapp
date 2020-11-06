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

import ko from 'knockout';
import {amplify} from 'amplify';
import {Confirmation} from '@wireapp/protocol-messaging';
import {WebAppEvents} from '@wireapp/webapp-events';
import {AudioPreference, NotificationPreference, WebappProperties} from '@wireapp/api-client/src/user/data';
import {ConsentType} from '@wireapp/api-client/src/self';

import {Environment} from 'Util/Environment';
import {t} from 'Util/LocalizerUtil';
import {Logger, getLogger} from 'Util/Logger';

import {Config} from '../Config';
import type {User} from '../entity/User';
import type {SelfService} from '../self/SelfService';
import {ConsentValue} from '../user/ConsentValue';
import {ModalsViewModel} from '../view_model/ModalsViewModel';
import type {PropertiesService} from './PropertiesService';
import {PROPERTIES_TYPE} from './PropertiesType';

export class PropertiesRepository {
  // Value names are specified by the protocol but key names can be changed.
  static get CONFIG() {
    return {
      WEBAPP_ACCOUNT_SETTINGS: 'webapp',
      WIRE_MARKETING_CONSENT: {
        defaultValue: ConsentValue.NOT_GIVEN,
        key: 'WIRE_MARKETING_CONSENT',
      },
      WIRE_RECEIPT_MODE: {
        defaultValue: Confirmation.Type.DELIVERED,
        key: 'WIRE_RECEIPT_MODE',
      },
    };
  }

  private readonly logger: Logger;
  public readonly propertiesService: PropertiesService;
  public readonly receiptMode: ko.Observable<Confirmation.Type>;
  private readonly selfService: SelfService;
  private readonly selfUser: ko.Observable<User>;
  public properties: WebappProperties;
  public readonly marketingConsent: ko.Observable<ConsentValue | boolean>;

  constructor(propertiesService: PropertiesService, selfService: SelfService) {
    this.propertiesService = propertiesService;
    this.selfService = selfService;
    this.logger = getLogger('PropertiesRepository');

    this.properties = {
      contact_import: {},
      enable_debugging: false,
      settings: {
        call: {
          enable_vbr_encoding: true,
        },
        emoji: {
          replace_inline: true,
        },
        interface: {
          theme: 'default',
          view_folders: false,
        },
        notifications: NotificationPreference.ON,
        previews: {
          send: true,
        },
        privacy: {
          improve_wire: undefined,
          report_errors: undefined,
          telemetry_sharing: undefined,
        },
        sound: {
          alerts: AudioPreference.ALL,
        },
      },
      version: 1,
    };
    this.selfUser = ko.observable();
    this.receiptMode = ko.observable(PropertiesRepository.CONFIG.WIRE_RECEIPT_MODE.defaultValue);
    /** @type {ko.Observable<ConsentValue | boolean>} */
    this.marketingConsent = ko.observable(PropertiesRepository.CONFIG.WIRE_MARKETING_CONSENT.defaultValue);
  }

  checkPrivacyPermission(): Promise<void> {
    const isCheckConsentDisabled = !Config.getConfig().FEATURE.CHECK_CONSENT;
    const isPrivacyPreferenceSet = this.getPreference(PROPERTIES_TYPE.PRIVACY) !== undefined;
    const isTelemetryPreferenceSet = this.getPreference(PROPERTIES_TYPE.TELEMETRY_SHARING) !== undefined;
    const isTeamAccount = this.selfUser().inTeam();
    const enablePrivacy = () => {
      this.savePreference(PROPERTIES_TYPE.PRIVACY, true);
      this.publishProperties();
    };

    if (!isTelemetryPreferenceSet && isTeamAccount) {
      this.savePreference(PROPERTIES_TYPE.TELEMETRY_SHARING, true);
      this.publishProperties();
    }

    if (isCheckConsentDisabled || isPrivacyPreferenceSet) {
      return Promise.resolve();
    }

    if (isTeamAccount) {
      return Promise.resolve();
    }

    return new Promise(resolve => {
      amplify.publish(WebAppEvents.WARNING.MODAL, ModalsViewModel.TYPE.CONFIRM, {
        preventClose: true,
        primaryAction: {
          action: () => {
            enablePrivacy();
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
          message: t('modalImproveWireMessage', Config.getConfig().BRAND_NAME),
          title: t('modalImproveWireHeadline', Config.getConfig().BRAND_NAME),
        },
      });
    });
  }

  getPreference(propertiesType: string): any {
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

  init(selfUserEntity: User): Promise<void> | Promise<WebappProperties> {
    this.selfUser(selfUserEntity);

    return this.selfUser().isTemporaryGuest() ? this.initTemporaryGuestAccount() : this.initActivatedAccount();
  }

  private fetchWebAppAccountSettings(): Promise<void> {
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

  private fetchReadReceiptsSetting(): Promise<void> {
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

  private initActivatedAccount(): Promise<void> {
    return Promise.all([this.fetchWebAppAccountSettings(), this.fetchReadReceiptsSetting()]).then(() => {
      this.logger.info('Loaded user properties', this.properties);
      this.publishProperties();
    });
  }

  private initTemporaryGuestAccount(): Promise<WebappProperties> {
    this.logger.info('Temporary guest user: Using default properties');
    this.savePreference(PROPERTIES_TYPE.PRIVACY, false);
    return Promise.resolve(this.publishProperties());
  }

  private publishProperties(): WebappProperties {
    amplify.publish(WebAppEvents.PROPERTIES.UPDATED, this.properties);
    return this.properties;
  }

  savePreference(propertiesType: string, updatedPreference: any = true): void {
    if (updatedPreference !== this.getPreference(propertiesType)) {
      this.setPreference(propertiesType, updatedPreference);

      const savePromise = this.selfUser().isTemporaryGuest()
        ? this.savePreferenceTemporaryGuestAccount(propertiesType, updatedPreference)
        : this.savePreferenceActivatedAccount(propertiesType, updatedPreference);

      savePromise.then(() => this.publishPropertyUpdate(propertiesType, updatedPreference));
    }
  }

  deleteProperty(key: string): void {
    switch (key) {
      case PropertiesRepository.CONFIG.WIRE_RECEIPT_MODE.key:
        this.setProperty(key, Confirmation.Type.DELIVERED);
        break;
      case PropertiesRepository.CONFIG.WIRE_MARKETING_CONSENT.key:
        this.setProperty(key, ConsentValue.NOT_GIVEN);
        break;
    }
  }

  setProperty(key: string, value: any): void {
    this.logger.info(`Setting key "${key}"...`, value);

    switch (key) {
      case PropertiesRepository.CONFIG.WEBAPP_ACCOUNT_SETTINGS:
        if (this.properties.version === value.version) {
          this.properties = {...this.properties, ...value};
          this.publishProperties();
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

  updateProperty(key: string, value: any): Promise<void> | void {
    switch (key) {
      case PropertiesRepository.CONFIG.WIRE_RECEIPT_MODE.key:
        if (value === Confirmation.Type.DELIVERED) {
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

  private savePreferenceActivatedAccount(propertiesType: string, updatedPreference: any): Promise<void> {
    return this.propertiesService
      .putPropertiesByKey(PropertiesRepository.CONFIG.WEBAPP_ACCOUNT_SETTINGS, this.properties)
      .then(() => this.logger.info(`Saved updated preference "${propertiesType}": ${updatedPreference}`));
  }

  private savePreferenceTemporaryGuestAccount(propertiesType: string, updatedPreference: any): Promise<void> {
    this.logger.info(`Updated preference: '${propertiesType}' - '${updatedPreference}'`);
    return Promise.resolve();
  }

  private publishPropertyUpdate(propertiesType: string, updatedPreference: any): void {
    switch (propertiesType) {
      case PROPERTIES_TYPE.INTERFACE.THEME:
        amplify.publish(WebAppEvents.PROPERTIES.UPDATE.INTERFACE.THEME, updatedPreference);
        break;
      case PROPERTIES_TYPE.INTERFACE.VIEW_FOLDERS:
        amplify.publish(WebAppEvents.PROPERTIES.UPDATE.INTERFACE.VIEW_FOLDERS, updatedPreference);
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
      case PROPERTIES_TYPE.TELEMETRY_SHARING:
        amplify.publish(WebAppEvents.PROPERTIES.UPDATE.TELEMETRY_SHARING, updatedPreference);
        break;
      case PROPERTIES_TYPE.SOUND_ALERTS:
        amplify.publish(WebAppEvents.PROPERTIES.UPDATE.SOUND_ALERTS, updatedPreference);
        break;
      case PROPERTIES_TYPE.CALL.ENABLE_VBR_ENCODING:
        amplify.publish(WebAppEvents.PROPERTIES.UPDATE.CALL.ENABLE_VBR_ENCODING, updatedPreference);
        break;
      default:
        throw new Error(`Failed to update preference of unhandled type '${propertiesType}'`);
    }
  }

  private setPreference(propertiesType: string, changedPreference: {}): void {
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
