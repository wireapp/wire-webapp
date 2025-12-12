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

import {RECEIPT_MODE} from '@wireapp/api-client/lib/conversation/data';
import {ConsentType} from '@wireapp/api-client/lib/self/';
import {AudioPreference, NotificationPreference, WebappProperties} from '@wireapp/api-client/lib/user/data/';
import {amplify} from 'amplify';
import ko from 'knockout';

import {WebAppEvents} from '@wireapp/webapp-events';

import {PrimaryModal} from 'Components/Modals/PrimaryModal';
import {PrimaryModalType} from 'Components/Modals/PrimaryModal/PrimaryModalTypes';
import type {User} from 'Repositories/entity/User';
import type {SelfService} from 'Repositories/self/SelfService';
import {StorageKey} from 'Repositories/storage';
import {isTelemetryEnabledAtCurrentEnvironment} from 'Repositories/tracking/Telemetry.helpers';
import {ConsentValue} from 'Repositories/user/ConsentValue';
import {CONVERSATION_TYPING_INDICATOR_MODE} from 'Repositories/user/TypingIndicatorMode';
import {Config} from 'src/script/Config';
import {deepMerge} from 'Util/deepMerge';
import {Environment} from 'Util/Environment';
import {replaceLink, t} from 'Util/LocalizerUtil';
import {getLogger, Logger} from 'Util/Logger';
import {loadValue} from 'Util/StorageUtil';

import type {PropertiesService} from './PropertiesService';
import {PROPERTIES_TYPE, UserConsentStatus} from './PropertiesType';

export class PropertiesRepository {
  // Value names are specified by the protocol but key names can be changed.
  static get CONFIG() {
    return {
      WEBAPP_ACCOUNT_SETTINGS: 'webapp',
      WIRE_MARKETING_CONSENT: {
        defaultValue: false,
        key: 'WIRE_MARKETING_CONSENT',
      },
      WIRE_RECEIPT_MODE: {
        defaultValue: RECEIPT_MODE.OFF,
        key: 'WIRE_RECEIPT_MODE',
      },
      WIRE_TYPING_INDICATOR_MODE: {
        defaultValue: CONVERSATION_TYPING_INDICATOR_MODE.ON,
        key: 'WIRE_TYPING_INDICATOR_MODE',
      },
    };
  }

  private readonly logger: Logger;
  public readonly propertiesService: PropertiesService;
  public readonly receiptMode: ko.Observable<RECEIPT_MODE>;
  public readonly typingIndicatorMode: ko.Observable<CONVERSATION_TYPING_INDICATOR_MODE>;
  private readonly selfService: SelfService;
  private readonly selfUser: ko.Observable<User | undefined>;
  public properties: WebappProperties;

  constructor(propertiesService: PropertiesService, selfService: SelfService) {
    this.propertiesService = propertiesService;
    this.selfService = selfService;
    this.logger = getLogger('PropertiesRepository');

    this.properties = {
      enable_debugging: false,
      settings: {
        call: {
          enable_soundless_incoming_calls: false,
          enable_vbr_encoding: true,
          enable_press_space_to_unmute: false,
        },
        emoji: {
          replace_inline: true,
        },
        interface: {
          font_size: '',
          theme: 'default',
          view_folders: false,
          markdown_preview: true,
        },
        notifications: NotificationPreference.ON,
        previews: {
          send: true,
        },
        privacy: {
          telemetry_data_sharing: undefined,
          marketing_consent:
            loadValue(StorageKey.INITIAL_MAKRETING_CONSENT_ACCEPTED) ??
            PropertiesRepository.CONFIG.WIRE_MARKETING_CONSENT.defaultValue,
        },
        sound: {
          alerts: AudioPreference.ALL,
        },
      },
      version: 1,
    };

    this.selfUser = ko.observable();
    this.receiptMode = ko.observable(PropertiesRepository.CONFIG.WIRE_RECEIPT_MODE.defaultValue);
    this.typingIndicatorMode = ko.observable(PropertiesRepository.CONFIG.WIRE_TYPING_INDICATOR_MODE.defaultValue);
    /** @type {ko.Observable<ConsentValue | boolean>} */
  }

  public getUserConsentStatus() {
    const {
      privacy: {marketing_consent: marketingConsent, telemetry_data_sharing: telemetryConsent},
    } = this.properties.settings;

    let userConsentStatus = UserConsentStatus.ALL_DENIED;

    if (marketingConsent && telemetryConsent) {
      userConsentStatus = UserConsentStatus.ALL_GRANTED;
    } else if (marketingConsent) {
      userConsentStatus = UserConsentStatus.MARKETING_GRANTED;
    } else if (telemetryConsent) {
      userConsentStatus = UserConsentStatus.TRACKING_GRANTED;
    }

    return {
      userConsentStatus,
      isMarketingConsentGiven:
        userConsentStatus === UserConsentStatus.MARKETING_GRANTED ||
        userConsentStatus === UserConsentStatus.ALL_GRANTED,
      isTelemetryConsentGiven:
        userConsentStatus === UserConsentStatus.TRACKING_GRANTED || userConsentStatus === UserConsentStatus.ALL_GRANTED,
      isTelemetryEnabledAtCurrentEnvironment: isTelemetryEnabledAtCurrentEnvironment(),
    };
  }

  checkTelemetrySharingPermission(): void {
    const isTelemetryPreferenceSet = this.getPreference(PROPERTIES_TYPE.PRIVACY.TELEMETRY_SHARING) !== undefined;

    if (!isTelemetryEnabledAtCurrentEnvironment() || isTelemetryPreferenceSet) {
      return;
    }

    const toggleTelemetrySharing = (value: boolean) => {
      this.savePreference(PROPERTIES_TYPE.PRIVACY.TELEMETRY_SHARING, value);
      this.publishProperties();
    };

    PrimaryModal.show(PrimaryModalType.CONFIRM, {
      text: {
        title: t('dataSharingModalTitle'),
        htmlMessage: t('dataSharingModalDescription', undefined, replaceLink(Config.getConfig().URL.PRIVACY_POLICY)),
      },
      primaryAction: {
        text: t('dataSharingModalAgree'),
        action: () => toggleTelemetrySharing(true),
        runActionOnEnterClick: true,
      },
      secondaryAction: {
        text: t('dataSharingModalDecline'),
        action: () => toggleTelemetrySharing(false),
      },
      closeOnSecondaryAction: true,
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

    return this.selfUser()?.isTemporaryGuest() ? this.initTemporaryGuestAccount() : this.initActivatedAccount();
  }

  private fetchWebAppAccountSettings(): Promise<void> {
    return this.propertiesService
      .getPropertiesByKey(PropertiesRepository.CONFIG.WEBAPP_ACCOUNT_SETTINGS)
      .then(properties => {
        deepMerge(this.properties, properties);
      })
      .catch(() => {
        this.logger.warn(
          `Property "${PropertiesRepository.CONFIG.WEBAPP_ACCOUNT_SETTINGS}" doesn't exist for this account. Continuing with default values.`,
        );
      });
  }

  private fetchPropertySetting({key, defaultValue}: {key: string; defaultValue: any}): Promise<void> {
    return this.propertiesService
      .getPropertiesByKey(key)
      .then(value => this.setProperty(key, value))
      .catch(() => {
        const message = `Property "${key}" doesn't exist for this account. Continuing with the default value of "${defaultValue}".`;
        this.logger.warn(message);
      });
  }

  private initActivatedAccount(): Promise<void> {
    return Promise.all([
      this.fetchWebAppAccountSettings(),
      this.fetchPropertySetting(PropertiesRepository.CONFIG.WIRE_RECEIPT_MODE),
      this.fetchPropertySetting(PropertiesRepository.CONFIG.WIRE_TYPING_INDICATOR_MODE),
    ]).then(() => {
      this.publishProperties();
    });
  }

  private initTemporaryGuestAccount(): Promise<WebappProperties> {
    this.logger.info('Temporary guest user: Using default properties');
    return Promise.resolve(this.publishProperties());
  }

  private publishProperties(): WebappProperties {
    amplify.publish(WebAppEvents.PROPERTIES.UPDATED, this.properties);
    return this.properties;
  }

  savePreference(propertiesType: string, updatedPreference: any = true): void {
    if (updatedPreference !== this.getPreference(propertiesType)) {
      this.setPreference(propertiesType, updatedPreference);

      const savePromise = this.selfUser()?.isTemporaryGuest()
        ? this.savePreferenceTemporaryGuestAccount(propertiesType, updatedPreference)
        : this.savePreferenceActivatedAccount(propertiesType, updatedPreference);

      void savePromise.then(() => this.publishPropertyUpdate(propertiesType, updatedPreference));
    }
  }

  deleteProperty(key: string): void {
    switch (key) {
      case PropertiesRepository.CONFIG.WIRE_RECEIPT_MODE.key:
        this.setProperty(key, RECEIPT_MODE.OFF);
        break;
      case PropertiesRepository.CONFIG.WIRE_TYPING_INDICATOR_MODE.key:
        this.setProperty(key, CONVERSATION_TYPING_INDICATOR_MODE.ON);
        break;
      case PropertiesRepository.CONFIG.WIRE_MARKETING_CONSENT.key:
        this.setProperty(key, ConsentValue.NOT_GIVEN);
        break;
    }
  }

  setProperty(key: string, value: any): void {
    this.logger.log(`Setting key "${key}"...`, value);

    switch (key) {
      case PropertiesRepository.CONFIG.WEBAPP_ACCOUNT_SETTINGS:
        if (this.properties.version === value.version) {
          this.properties = {...this.properties, ...value};
          this.publishProperties();
        }
        break;
      case PropertiesRepository.CONFIG.WIRE_MARKETING_CONSENT.key:
        this.properties.settings.privacy.marketing_consent = value;
        this.publishPropertyUpdate(PROPERTIES_TYPE.PRIVACY.MARKETING_CONSENT, value);
        break;
      case PropertiesRepository.CONFIG.WIRE_RECEIPT_MODE.key:
        this.receiptMode(value);
        break;
      case PropertiesRepository.CONFIG.WIRE_TYPING_INDICATOR_MODE.key:
        this.typingIndicatorMode(value);
        break;
    }
  }

  async updateProperty(key: string, value: any): Promise<void> {
    this.setProperty(key, value);
    switch (key) {
      case PropertiesRepository.CONFIG.WIRE_RECEIPT_MODE.key:
        if (value === RECEIPT_MODE.OFF) {
          return this.propertiesService.deletePropertiesByKey(key);
        }
        return this.propertiesService.putPropertiesByKey(key, value);
      case PropertiesRepository.CONFIG.WIRE_TYPING_INDICATOR_MODE.key:
        if (value === CONVERSATION_TYPING_INDICATOR_MODE.ON) {
          return this.propertiesService.deletePropertiesByKey(key);
        }
        return this.propertiesService.putPropertiesByKey(key, value);
      case PropertiesRepository.CONFIG.WIRE_MARKETING_CONSENT.key:
        await this.selfService.putSelfConsent(ConsentType.MARKETING, value, `Webapp ${Environment.version(false)}`);
        if (value === ConsentValue.NOT_GIVEN) {
          return this.propertiesService.deletePropertiesByKey(key);
        }
        return this.propertiesService.putPropertiesByKey(key, value);
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
      case PROPERTIES_TYPE.EMOJI.REPLACE_INLINE:
        amplify.publish(WebAppEvents.PROPERTIES.UPDATE.EMOJI.REPLACE_INLINE, updatedPreference);
        break;
      case PROPERTIES_TYPE.INTERFACE.MARKDOWN_PREVIEW:
        amplify.publish(WebAppEvents.PROPERTIES.UPDATE.INTERFACE.MARKDOWN_PREVIEW, updatedPreference);
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
      case PROPERTIES_TYPE.PRIVACY.TELEMETRY_SHARING:
        amplify.publish(WebAppEvents.PROPERTIES.UPDATE.PRIVACY.TELEMETRY_SHARING, updatedPreference);
        break;
      case PROPERTIES_TYPE.PRIVACY.MARKETING_CONSENT:
        amplify.publish(WebAppEvents.PROPERTIES.UPDATE.PRIVACY.MARKETING_CONSENT, updatedPreference);
        break;
      case PROPERTIES_TYPE.SOUND_ALERTS:
        amplify.publish(WebAppEvents.PROPERTIES.UPDATE.SOUND_ALERTS, updatedPreference);
        break;
      case PROPERTIES_TYPE.CALL.ENABLE_VBR_ENCODING:
        amplify.publish(WebAppEvents.PROPERTIES.UPDATE.CALL.ENABLE_VBR_ENCODING, updatedPreference);
        break;
      case PROPERTIES_TYPE.CALL.ENABLE_SOUNDLESS_INCOMING_CALLS:
        amplify.publish(WebAppEvents.PROPERTIES.UPDATE.CALL.ENABLE_SOUNDLESS_INCOMING_CALLS, updatedPreference);
        break;
      case PROPERTIES_TYPE.CALL.ENABLE_PRESS_SPACE_TO_UNMUTE:
        amplify.publish(WebAppEvents.PROPERTIES.UPDATE.CALL.ENABLE_PRESS_SPACE_TO_UNMUTE, updatedPreference);
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
