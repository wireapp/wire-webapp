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

import {amplify} from 'amplify';
import {container} from 'tsyringe';

import {WireTelementary, TelemetryConsentFeatures} from '@wireapp/telemetry';
import {WebAppEvents} from '@wireapp/webapp-events';

import {getLogger, Logger} from 'Util/Logger';
import {loadValue, storeValue, resetStoreValue} from 'Util/StorageUtil';
import {includesString} from 'Util/StringUtil';
import {getParameter} from 'Util/UrlUtil';
import {createUuid} from 'Util/uuid';

import {
  getForcedErrorReportingStatus,
  initForcedErrorReporting,
  isCountlyEnabledAtCurrentEnvironment,
} from './Countly.helpers';
import {EventName} from './EventName';
import {getPlatform} from './Helpers';
import {Segmentation} from './Segmentation';
import {UserData} from './UserData';

import {URLParameter} from '../auth/URLParameter';
import {Config} from '../Config';
import type {ContributedSegmentations, MessageRepository} from '../conversation/MessageRepository';
import {ClientEvent} from '../event/Client';
import {TeamState} from '../team/TeamState';

const telementaryConsentFeatures: Array<TelemetryConsentFeatures> = [
  'sessions',
  'events',
  'views',
  'scrolls',
  'clicks',
  'forms',
  'crashes',
  'attribution',
  'users',
  'star-rating',
  'feedback',
  'location',
  'remote-config',
  'apm',
];

export class EventTrackingRepository {
  private isProductReportingActivated: boolean = false;
  private sendAppOpenEvent: boolean = true;
  private countlyDeviceId: string;
  private readonly logger: Logger = getLogger('EventTrackingRepository');
  private readonly telemetryLogger: Logger = getLogger('Countly');
  private telemetryInitialized: boolean = false;
  private telementary = new WireTelementary();
  isErrorReportingActivated: boolean = false;

  static get CONFIG() {
    return {
      USER_ANALYTICS: {
        API_KEY: window.wire.env.ANALYTICS_API_KEY,
        CLIENT_TYPE: 'desktop',
        COUNTLY_DEVICE_ID_LOCAL_STORAGE_KEY: 'COUNTLY_DEVICE_ID',
        COUNTLY_FAILED_TO_MIGRATE_DEVICE_ID: 'COUNTLY_FAILED_TO_MIGRATE_DEVICE_ID',
        COUNTLY_SYNCED_AT_LEAST_ONCE_LOCAL_STORAGE_KEY: 'COUNTLY_SYNCED_AT_LEAST_ONCE_LOCAL_STORAGE_KEY',
        COUNTLY_UNSYNCED_DEVICE_ID_LOCAL_STORAGE_KEY: 'COUNTLY_OLD_DEVICE_ID',
        DISABLED_DOMAINS: ['localhost'],
      },
    };
  }

  constructor(
    private readonly messageRepository: MessageRepository,
    private readonly teamState = container.resolve(TeamState),
  ) {
    amplify.subscribe(WebAppEvents.USER.EVENT_FROM_BACKEND, this.onUserEvent);
    amplify.subscribe(WebAppEvents.PROPERTIES.UPDATE.PRIVACY.TELEMETRY_SHARING, this.toggleCountly);
    initForcedErrorReporting();
    this.logger.info('EventTrackingRepository initialized');
  }

  public readonly onUserEvent = (eventJson: any, source: EventSource) => {
    const type = eventJson.type;
    if (type === ClientEvent.USER.DATA_TRANSFER && this.teamState.isTeam()) {
      this.telemetryLogger.info('Received data transfer event with new countly tracking id', eventJson.data);
      if (!!eventJson.data.trackingIdentifier && eventJson.data.trackingIdentifier !== this.countlyDeviceId) {
        void this.migrateDeviceId(eventJson.data.trackingIdentifier);
      }
    }
  };

  public migrateDeviceId = async (newId: string) => {
    if (!this.telementary.isLoaded()) {
      this.telemetryLogger.warn('Countly is not available');
      return;
    }

    if (!newId || !newId.length) {
      this.telemetryLogger.warn('New countly tracking id is not defined');
      return;
    }

    try {
      let stopOnFinish = false;
      if (!this.isProductReportingActivated) {
        await this.startProductReporting(this.countlyDeviceId);
        stopOnFinish = true;
      }
      this.telementary.changeDeviceId(newId);
      storeValue(EventTrackingRepository.CONFIG.USER_ANALYTICS.COUNTLY_DEVICE_ID_LOCAL_STORAGE_KEY, newId);
      this.telemetryLogger.info(`Countly tracking id has been changed from ${this.countlyDeviceId} to ${newId}`);
      this.countlyDeviceId = newId;
      if (stopOnFinish) {
        this.stopProductReporting();
      }
    } catch (error) {
      this.telemetryLogger.warn(`Failed to send new countly tracking id to other devices ${error}`);
      storeValue(EventTrackingRepository.CONFIG.USER_ANALYTICS.COUNTLY_FAILED_TO_MIGRATE_DEVICE_ID, newId);
    }
  };

  async init(isTelemtryConsentGiven: boolean): Promise<void> {
    const previousCountlyDeviceId = loadValue<string>(
      EventTrackingRepository.CONFIG.USER_ANALYTICS.COUNTLY_DEVICE_ID_LOCAL_STORAGE_KEY,
    );
    const unsyncedCountlyDeviceId = loadValue<string>(
      EventTrackingRepository.CONFIG.USER_ANALYTICS.COUNTLY_UNSYNCED_DEVICE_ID_LOCAL_STORAGE_KEY,
    );
    const hasAtLeastSyncedOnce = loadValue<string>(
      EventTrackingRepository.CONFIG.USER_ANALYTICS.COUNTLY_SYNCED_AT_LEAST_ONCE_LOCAL_STORAGE_KEY,
    );

    if (unsyncedCountlyDeviceId) {
      try {
        await this.messageRepository.sendCountlySync(this.countlyDeviceId);
        resetStoreValue(EventTrackingRepository.CONFIG.USER_ANALYTICS.COUNTLY_UNSYNCED_DEVICE_ID_LOCAL_STORAGE_KEY);
      } catch (error) {
        this.telemetryLogger.warn(`Failed to send new countly tracking id to other devices ${error}`);
      }
    }

    if (previousCountlyDeviceId) {
      this.countlyDeviceId = previousCountlyDeviceId;
      const notMigratedCountlyTrackingId = loadValue<string>(
        EventTrackingRepository.CONFIG.USER_ANALYTICS.COUNTLY_FAILED_TO_MIGRATE_DEVICE_ID,
      );

      // Migrate the device id if it has not been migrated yet and it is different from the previous one
      if (!!notMigratedCountlyTrackingId && notMigratedCountlyTrackingId !== previousCountlyDeviceId) {
        await this.migrateDeviceId(notMigratedCountlyTrackingId);
      }
      if (!hasAtLeastSyncedOnce) {
        try {
          await this.messageRepository.sendCountlySync(this.countlyDeviceId);
          storeValue(
            EventTrackingRepository.CONFIG.USER_ANALYTICS.COUNTLY_SYNCED_AT_LEAST_ONCE_LOCAL_STORAGE_KEY,
            true,
          );
        } catch (error) {
          storeValue(
            EventTrackingRepository.CONFIG.USER_ANALYTICS.COUNTLY_SYNCED_AT_LEAST_ONCE_LOCAL_STORAGE_KEY,
            false,
          );
        }
      }
    } else {
      this.countlyDeviceId = createUuid();
      storeValue(
        EventTrackingRepository.CONFIG.USER_ANALYTICS.COUNTLY_DEVICE_ID_LOCAL_STORAGE_KEY,
        this.countlyDeviceId,
      );
      try {
        await this.messageRepository.sendCountlySync(this.countlyDeviceId);
      } catch (error) {
        this.telemetryLogger.warn(`Failed to send new countly tracking id to other devices ${error}`);
        storeValue(EventTrackingRepository.CONFIG.USER_ANALYTICS.COUNTLY_UNSYNCED_DEVICE_ID_LOCAL_STORAGE_KEY, true);
      }
    }

    const isConsentGiven = isTelemtryConsentGiven || getForcedErrorReportingStatus();

    this.logger.info(`Initialize analytics and error reporting: ${isConsentGiven}`);

    amplify.subscribe(WebAppEvents.PROPERTIES.UPDATE.PRIVACY.TELEMETRY_SHARING, this.toggleCountly);
    await this.toggleCountly(isConsentGiven);
  }

  private readonly toggleCountly = async (isEnabled: boolean) => {
    if (isEnabled && this.isDomainAllowedForAnalytics()) {
      this.telementary.addConsentFeatures(telementaryConsentFeatures);
      this.telemetryLogger.info('Consent was given due to user preferences');
      await this.startProductReporting();
    } else {
      this.telementary.removeConsentFeatures(telementaryConsentFeatures);
      this.telemetryLogger.info('Consent was removed due to user preferences');
      this.stopProductReporting();
    }
  };

  private stopProductReporting(): void {
    if (getForcedErrorReportingStatus()) {
      this.logger.warn('Countly can not be disabled on this environment');
      return;
    }

    this.logger.debug('Analytics was disabled due to user preferences');
    this.isProductReportingActivated = false;
    this.stopProductReportingSession();
    this.unsubscribeFromProductTrackingEvents();
  }

  private async startProductReporting(trackingId: string = ''): Promise<void> {
    if (!this.telementary.isLoaded()) {
      return;
    }

    if (!isCountlyEnabledAtCurrentEnvironment() || this.isProductReportingActivated) {
      this.telemetryLogger.warn('Countly is not enabled at this environment');
      return;
    }

    this.isProductReportingActivated = true;

    // Add Parameters to previous Countly object

    const {COUNTLY_ENABLE_LOGGING, VERSION, COUNTLY_API_KEY} = Config.getConfig();

    // Initialize Countly if it is not initialized yet
    if (!this.telemetryInitialized) {
      this.telementary.init({
        appVersion: VERSION,
        countly: {
          appKey: COUNTLY_API_KEY,
          enableLogging: COUNTLY_ENABLE_LOGGING,
          backendURL: 'https://countly.wire.com/',
        },
      });

      if (!COUNTLY_API_KEY.length) {
        this.telemetryLogger.error('Countly API key is not defined in the environment');
        return;
      }

      this.telemetryLogger.info(
        'Countly has been initialized with version',
        VERSION,
        ', logging',
        COUNTLY_ENABLE_LOGGING,
        'and app_key',
        COUNTLY_API_KEY,
      );

      this.telemetryInitialized = true;
    }

    const device_id = Boolean(trackingId.length) ? trackingId : this.countlyDeviceId;

    this.telementary.changeDeviceId(device_id);
    this.telementary.disableOfflineModeForDevice(device_id);

    this.telemetryLogger.info(`Countly tracking id is now ${device_id}`);

    this.startProductReportingSession();
    this.subscribeToProductEvents();
  }

  private isDomainAllowedForAnalytics(): boolean {
    const trackingParameter = getParameter(URLParameter.TRACKING);
    return typeof trackingParameter === 'boolean'
      ? trackingParameter
      : !EventTrackingRepository.CONFIG.USER_ANALYTICS.DISABLED_DOMAINS.some(domain => {
          if (includesString(window.location.hostname, domain)) {
            this.logger.debug(`Analytics is disabled for domain '${window.location.hostname}'`);
            return true;
          }
          this.logger.debug(`Analytics is enabled for domain '${window.location.hostname}'`);
          return false;
        });
  }

  private readonly stopProductReportingSession = (): void => {
    if (!this.telementary.isLoaded()) {
      this.telemetryLogger.warn('Countly is not available');
      return;
    }

    if (getForcedErrorReportingStatus()) {
      this.telemetryLogger.warn('Countly can not be disabled on this environment');
      return;
    }

    if (this.isProductReportingActivated === true) {
      this.telementary.endSession();
    }
  };

  private subscribeToProductEvents(): void {
    amplify.subscribe(
      WebAppEvents.ANALYTICS.EVENT,
      this,
      (eventName: string, segmentations?: ContributedSegmentations) => {
        this.trackProductReportingEvent(eventName, segmentations);
      },
    );

    amplify.subscribe(WebAppEvents.LIFECYCLE.SIGNED_OUT, this.stopProductReportingSession);
  }

  private startProductReportingSession(): void {
    if (!this.telementary.isLoaded()) {
      this.telemetryLogger.warn('Countly is not available');
      return;
    }

    if (this.isProductReportingActivated === true || getForcedErrorReportingStatus()) {
      this.telementary.beginSession();
      if (this.sendAppOpenEvent) {
        this.sendAppOpenEvent = false;
        this.trackProductReportingEvent(EventName.APP_OPEN);
      }
      this.telemetryLogger.info('Countly session has been started');
    }
  }

  private trackProductReportingEvent(eventName: string, customSegmentations?: ContributedSegmentations): void {
    if (!this.telementary.isLoaded()) {
      this.telemetryLogger.warn('Countly is not available');
      return;
    }

    if (this.isProductReportingActivated === true || getForcedErrorReportingStatus()) {
      const userData = {
        [UserData.IS_TEAM]: this.teamState.isTeam(),
      };

      this.telementary.setUserData(userData);

      this.telemetryLogger.info(`Reporting user data for product event ${eventName}@${JSON.stringify(userData)}`);

      const segmentation = {
        [Segmentation.COMMON.APP_VERSION]: Config.getConfig().VERSION,
        [Segmentation.COMMON.DESKTOP_APP]: getPlatform(),
        ...customSegmentations,
      };

      this.telementary.trackEvent(eventName, segmentation);

      this.telemetryLogger.info(`Reporting product event ${eventName}@${JSON.stringify(segmentation)}`);

      // NOTE: This log is required by QA
      this.logger.log(`Reporting custom data for product event ${eventName}@${JSON.stringify(userData)}`);
      this.logger.log(`Reporting product event ${eventName}@${JSON.stringify(segmentation)}`);
    }
  }

  private unsubscribeFromProductTrackingEvents(): void {
    this.logger.debug('Unsubscribing from product tracking events');
    amplify.unsubscribeAll(WebAppEvents.ANALYTICS.EVENT);
  }
}
