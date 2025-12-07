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
import type {ContributedSegmentations, MessageRepository} from 'Repositories/conversation/MessageRepository';
import {ClientEvent} from 'Repositories/event/Client';
import {TeamState} from 'Repositories/team/TeamState';
import {UserState} from 'Repositories/user/UserState';
import {container} from 'tsyringe';
import {getLogger, Logger} from 'Util/Logger';
import {loadValue, storeValue, resetStoreValue} from 'Util/StorageUtil';
import {includesString} from 'Util/StringUtil';
import {getParameter} from 'Util/UrlUtil';
import {createUuid} from 'Util/uuid';

import * as telemetry from '@wireapp/telemetry';
import {WebAppEvents} from '@wireapp/webapp-events';

import {EventName} from './EventName';
import {getPlatform} from './Helpers';
import {Segmentation} from './Segmentation';
import {
  getForcedErrorReportingStatus,
  initForcedErrorReporting,
  isTelemetryEnabledAtCurrentEnvironment,
} from './Telemetry.helpers';
import {UserData} from './UserData';

import {URLParameter} from '../../auth/URLParameter';
import {Config} from '../../Config';

const TEAM_SIZE_THRESHOLD_VALUE = 6;
export class EventTrackingRepository {
  private isProductReportingActivated: boolean = false;
  private sendAppOpenEvent: boolean = true;
  private telemetryDeviceId: string | undefined;
  private readonly logger: Logger = getLogger('EventTrackingRepository');
  private readonly telemetryLogger: Logger = getLogger('Telemetry');
  private telemetryInitialized: boolean = false;
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
    private readonly userState = container.resolve(UserState),
  ) {
    amplify.subscribe(WebAppEvents.USER.EVENT_FROM_BACKEND, this.onUserEvent);
    amplify.subscribe(WebAppEvents.PROPERTIES.UPDATE.PRIVACY.TELEMETRY_SHARING, this.toggleTelemetry);
    initForcedErrorReporting();
    this.logger.info('EventTrackingRepository initialized');
  }

  public readonly onUserEvent = (eventJson: any, source: EventSource) => {
    const type = eventJson.type;
    if (type === ClientEvent.USER.DATA_TRANSFER && this.teamState.isTeam()) {
      this.telemetryLogger.info('Received data transfer event with new telemetry tracking id', eventJson.data);
      if (!!eventJson.data.trackingIdentifier && eventJson.data.trackingIdentifier !== this.telemetryDeviceId) {
        void this.migrateDeviceId(eventJson.data.trackingIdentifier);
      }
    }
  };

  public migrateDeviceId = async (newId: string) => {
    if (!telemetry.isLoaded()) {
      this.telemetryLogger.warn('Telemetry is not available');
      return;
    }

    if (!newId || !newId.length) {
      this.telemetryLogger.warn('New telemetry tracking id is not defined');
      return;
    }

    try {
      let stopOnFinish = false;
      if (!this.isProductReportingActivated) {
        await this.startProductReporting(this.telemetryDeviceId);
        stopOnFinish = true;
      }
      telemetry.changeDeviceId(newId);
      storeValue(EventTrackingRepository.CONFIG.USER_ANALYTICS.COUNTLY_DEVICE_ID_LOCAL_STORAGE_KEY, newId);
      this.telemetryLogger.info(`Telemetry tracking id has been changed from ${this.telemetryDeviceId} to ${newId}`);
      this.telemetryDeviceId = newId;
      if (stopOnFinish) {
        this.stopProductReporting();
      }
    } catch (error) {
      this.telemetryLogger.warn(`Failed to send new telemetry tracking id to other devices ${error}`);
      storeValue(EventTrackingRepository.CONFIG.USER_ANALYTICS.COUNTLY_FAILED_TO_MIGRATE_DEVICE_ID, newId);
    }
  };

  async init(isTelemtryConsentGiven: boolean): Promise<void> {
    const previousTelemetryDeviceId = loadValue<string>(
      EventTrackingRepository.CONFIG.USER_ANALYTICS.COUNTLY_DEVICE_ID_LOCAL_STORAGE_KEY,
    );
    const unsyncedTelemetryDeviceId = loadValue<string>(
      EventTrackingRepository.CONFIG.USER_ANALYTICS.COUNTLY_UNSYNCED_DEVICE_ID_LOCAL_STORAGE_KEY,
    );
    const hasAtLeastSyncedOnce = loadValue<string>(
      EventTrackingRepository.CONFIG.USER_ANALYTICS.COUNTLY_SYNCED_AT_LEAST_ONCE_LOCAL_STORAGE_KEY,
    );

    if (unsyncedTelemetryDeviceId) {
      try {
        await this.messageRepository.sendCountlySync(this.telemetryDeviceId);
        resetStoreValue(EventTrackingRepository.CONFIG.USER_ANALYTICS.COUNTLY_UNSYNCED_DEVICE_ID_LOCAL_STORAGE_KEY);
      } catch (error) {
        this.telemetryLogger.warn(`Failed to send new telemetry tracking id to other devices ${error}`);
      }
    }

    if (previousTelemetryDeviceId) {
      this.telemetryDeviceId = previousTelemetryDeviceId;
      const notMigratedTelemetryTrackingId = loadValue<string>(
        EventTrackingRepository.CONFIG.USER_ANALYTICS.COUNTLY_FAILED_TO_MIGRATE_DEVICE_ID,
      );

      // Migrate the device id if it has not been migrated yet and it is different from the previous one
      if (!!notMigratedTelemetryTrackingId && notMigratedTelemetryTrackingId !== previousTelemetryDeviceId) {
        await this.migrateDeviceId(notMigratedTelemetryTrackingId);
      }
      if (!hasAtLeastSyncedOnce) {
        try {
          await this.messageRepository.sendCountlySync(this.telemetryDeviceId);
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
      this.telemetryDeviceId = createUuid();
      storeValue(
        EventTrackingRepository.CONFIG.USER_ANALYTICS.COUNTLY_DEVICE_ID_LOCAL_STORAGE_KEY,
        this.telemetryDeviceId,
      );
      try {
        await this.messageRepository.sendCountlySync(this.telemetryDeviceId);
      } catch (error) {
        this.telemetryLogger.warn(`Failed to send new telemetry tracking id to other devices ${error}`);
        storeValue(EventTrackingRepository.CONFIG.USER_ANALYTICS.COUNTLY_UNSYNCED_DEVICE_ID_LOCAL_STORAGE_KEY, true);
      }
    }

    const isConsentGiven = isTelemtryConsentGiven || getForcedErrorReportingStatus();

    this.logger.info(`Initialize analytics and error reporting: ${isConsentGiven}`);

    amplify.subscribe(WebAppEvents.PROPERTIES.UPDATE.PRIVACY.TELEMETRY_SHARING, this.toggleTelemetry);
    await this.toggleTelemetry(isConsentGiven);
  }

  private readonly toggleTelemetry = async (isEnabled: boolean) => {
    if (isEnabled && this.isDomainAllowedForAnalytics()) {
      telemetry.addAllConsentFeatures();
      this.telemetryLogger.info('Consent was given due to user preferences');
      await this.startProductReporting();
    } else {
      telemetry.removeAllConsentFeatures();
      this.telemetryLogger.info('Consent was removed due to user preferences');
      this.stopProductReporting();
    }
  };

  private stopProductReporting(): void {
    if (getForcedErrorReportingStatus()) {
      this.logger.warn('Telemetry can not be disabled on this environment');
      return;
    }

    this.logger.debug('Analytics was disabled due to user preferences');
    this.isProductReportingActivated = false;
    this.stopProductReportingSession();
    this.unsubscribeFromProductTrackingEvents();
  }

  private async startProductReporting(trackingId: string = ''): Promise<void> {
    if (!telemetry.isLoaded()) {
      return;
    }

    if (!isTelemetryEnabledAtCurrentEnvironment() || this.isProductReportingActivated) {
      this.telemetryLogger.warn('Telemetry is not enabled at this environment');
      return;
    }

    this.isProductReportingActivated = true;

    const {COUNTLY_ENABLE_LOGGING, VERSION, COUNTLY_API_KEY} = Config.getConfig();

    // Initialize telemetry if it is not initialized yet
    if (!this.telemetryInitialized) {
      if (!COUNTLY_API_KEY.length) {
        this.telemetryLogger.error('Countly API key is not defined in the environment');
        return;
      }

      telemetry.initialize({
        appVersion: VERSION,
        provider: {
          apiKey: COUNTLY_API_KEY,
          enableLogging: COUNTLY_ENABLE_LOGGING,
          serverUrl: 'https://countly.wire.com/',
          autoErrorTracking: false,
        },
      });

      this.telemetryLogger.info(
        'Telemetry has been initialized with version',
        VERSION,
        ', logging',
        COUNTLY_ENABLE_LOGGING,
        'and app_key',
        COUNTLY_API_KEY,
      );

      this.telemetryInitialized = true;
    }

    const device_id = Boolean(trackingId.length) ? trackingId : this.telemetryDeviceId;

    telemetry.changeDeviceId(device_id);
    telemetry.disableOfflineMode(device_id);

    this.telemetryLogger.info(`Telemetry tracking id is now ${device_id}`);

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
    if (!telemetry.isLoaded()) {
      this.telemetryLogger.warn('Telemetry is not available');
      return;
    }

    if (getForcedErrorReportingStatus()) {
      this.telemetryLogger.warn('Telemetry can not be disabled on this environment');
      return;
    }

    if (this.isProductReportingActivated === true) {
      telemetry.endSession();
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
    if (!telemetry.isLoaded()) {
      this.telemetryLogger.warn('Telemetry is not available');
      return;
    }

    if (this.isProductReportingActivated === true || getForcedErrorReportingStatus()) {
      telemetry.beginSession();
      if (this.sendAppOpenEvent) {
        this.sendAppOpenEvent = false;
        this.trackProductReportingEvent(EventName.APP_OPEN);
      }
      this.telemetryLogger.info('Telemetry session has been started');
    }
  }

  private getUserData(): ContributedSegmentations {
    const segmentation: ContributedSegmentations = {
      [UserData.IS_TEAM]: this.teamState.isTeam(),
    };

    if (this.teamState.isTeam()) {
      segmentation[Segmentation.COMMON.TEAM_IS_ENTERPRISE] = this.teamState.isConferenceCallingEnabled();
      if (this.teamState.teamSize() >= TEAM_SIZE_THRESHOLD_VALUE) {
        const selfRole = this.teamState.selfRole();
        segmentation[Segmentation.COMMON.TEAM_USER_TYPE] = selfRole ? selfRole.toString() : '';
        segmentation[Segmentation.COMMON.TEAM_TEAM_ID] = this.teamState.team().id!;
        segmentation[Segmentation.COMMON.TEAM_TEAM_SIZE] = this.teamState.teamSize();
      }
    } else {
      segmentation[Segmentation.COMMON.USER_CONTACTS] = this.userState.connectedUsers().length;
    }

    return segmentation;
  }

  private trackProductReportingEvent(eventName: string, customSegmentations?: ContributedSegmentations): void {
    if (!telemetry.isLoaded()) {
      this.telemetryLogger.warn('Telemetry is not available');
      return;
    }

    if (this.isProductReportingActivated === true || getForcedErrorReportingStatus()) {
      const userData = this.getUserData();

      telemetry.setUserData(userData);

      this.telemetryLogger.info(`Reporting user data for product event ${eventName}@${JSON.stringify(userData)}`);

      const segmentation = {
        [Segmentation.APP_OPEN.DESKTOP_APP]: getPlatform(),
        [Segmentation.APP_OPEN.APP_VERSION]: Config.getConfig().VERSION,
        [Segmentation.APP_OPEN.OS_VERSION]: navigator.userAgent,
        [Segmentation.APP_OPEN.IS_TEAM_MEMBER]: this.teamState.isTeam(),
        ...customSegmentations,
      };

      telemetry.trackEvent({
        name: eventName,
        segmentation,
      });

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
