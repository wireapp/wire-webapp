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

import {WebAppEvents} from '@wireapp/webapp-events';

import {getWebEnvironment} from 'Util/Environment';
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

const CountlyConsentFeatures = [
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

const isCountlyLoaded = () => {
  const loaded = !!window.Countly && !!window.Countly.q;
  if (!loaded) {
    console.warn('Countly is not available');
  }
  return loaded;
};

export class EventTrackingRepository {
  private isProductReportingActivated: boolean;
  private sendAppOpenEvent: boolean = true;
  private countlyDeviceId: string;
  private readonly logger: Logger;
  isErrorReportingActivated: boolean;

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
    this.logger = getLogger('EventTrackingRepository');

    this.isErrorReportingActivated = false;
    this.isProductReportingActivated = false;
    amplify.subscribe(WebAppEvents.USER.EVENT_FROM_BACKEND, this.onUserEvent);
    amplify.subscribe(WebAppEvents.PROPERTIES.UPDATE.PRIVACY.TELEMETRY_SHARING, this.toggleCountly);
    initForcedErrorReporting();
  }

  public readonly onUserEvent = (eventJson: any, source: EventSource) => {
    const type = eventJson.type;
    if (type === ClientEvent.USER.DATA_TRANSFER && this.teamState.isTeam()) {
      void this.migrateDeviceId(eventJson.data.trackingIdentifier);
    }
  };

  public migrateDeviceId = async (newId: string) => {
    if (!isCountlyLoaded()) {
      this.logger.warn('Countly is not available');
      return;
    }

    try {
      let stopOnFinish = false;
      if (!this.isProductReportingActivated) {
        await this.startProductReporting(this.countlyDeviceId);
        stopOnFinish = true;
      }
      window.Countly.q.push(['change_id', newId]);
      storeValue(EventTrackingRepository.CONFIG.USER_ANALYTICS.COUNTLY_DEVICE_ID_LOCAL_STORAGE_KEY, newId);
      this.logger.info(`Countly tracking id has been changed from ${this.countlyDeviceId} to ${newId}`);
      this.countlyDeviceId = newId;
      if (stopOnFinish) {
        this.stopProductReporting();
      }
    } catch (error) {
      this.logger.warn(`Failed to send new countly tracking id to other devices ${error}`);
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
        this.logger.warn(`Failed to send new countly tracking id to other devices ${error}`);
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
        this.logger.warn(`Failed to send new countly tracking id to other devices ${error}`);
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
      window.Countly.q.push(['add_consent', CountlyConsentFeatures]);
      await this.startProductReporting();
    } else {
      window.Countly.q.push(['remove_consent', CountlyConsentFeatures]);
      this.stopProductReporting();
    }
  };

  private stopProductReporting(): void {
    if (getForcedErrorReportingStatus()) {
      return;
    }

    this.logger.debug('Analytics was disabled due to user preferences');
    this.isProductReportingActivated = false;
    this.stopProductReportingSession();
    this.unsubscribeFromProductTrackingEvents();
  }

  private async startProductReporting(trackingId?: string): Promise<void> {
    // This is a global object provided by the countly.min.js script
    if (!isCountlyLoaded()) {
      return;
    }

    if (!isCountlyEnabledAtCurrentEnvironment() || this.isProductReportingActivated) {
      return;
    }
    this.isProductReportingActivated = true;

    const {isProduction} = getWebEnvironment();

    // Add Parameters to previous Countly object

    window.Countly.app_version = Config.getConfig().VERSION;
    window.Countly.debug = !isProduction;

    const device_id = trackingId || this.countlyDeviceId;
    window.Countly.q.push(['change_id', device_id]);
    window.Countly.q.push(['disable_offline_mode', device_id]);

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
          return false;
        });
  }

  private readonly stopProductReportingSession = (): void => {
    if (!isCountlyLoaded()) {
      return;
    }

    if (getForcedErrorReportingStatus()) {
      this.logger.warn('Countly can not be disabled on this environment');
      return;
    }

    if (this.isProductReportingActivated === true) {
      window.Countly.q.push(['end_session']);
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
    if (!isCountlyLoaded()) {
      return;
    }

    if (this.isProductReportingActivated === true || getForcedErrorReportingStatus()) {
      window.Countly.q.push(['begin_session']);
      if (this.sendAppOpenEvent) {
        this.sendAppOpenEvent = false;
        this.trackProductReportingEvent(EventName.APP_OPEN);
      }
    }
  }

  private trackProductReportingEvent(eventName: string, customSegmentations?: ContributedSegmentations): void {
    if (!isCountlyLoaded()) {
      return;
    }

    if (this.isProductReportingActivated === true || getForcedErrorReportingStatus()) {
      const userData = {
        [UserData.IS_TEAM]: this.teamState.isTeam(),
      };
      Object.entries(userData).forEach(entry => {
        const [key, value] = entry;
        window.Countly.q.push(['userData.set', key, value]);
      });

      window.Countly.q.push(['userData.save']);

      const segmentation = {
        [Segmentation.COMMON.APP_VERSION]: Config.getConfig().VERSION,
        [Segmentation.COMMON.DESKTOP_APP]: getPlatform(),
        ...customSegmentations,
      };

      window.Countly.q.push([
        'add_event',
        {
          key: eventName,
          segmentation,
        },
      ]);

      // NOTE: This log is required by QA
      this.logger.log(`Reporting custom data for product event ${eventName}@${JSON.stringify(userData)}`);
      this.logger.log(`Reporting product event ${eventName}@${JSON.stringify(segmentation)}`);
    }
  }

  private unsubscribeFromProductTrackingEvents(): void {
    amplify.unsubscribeAll(WebAppEvents.ANALYTICS.EVENT);
  }
}
