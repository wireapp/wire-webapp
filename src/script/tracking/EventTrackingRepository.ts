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

import {WebAppEvents} from '@wireapp/webapp-events';
import {amplify} from 'amplify';
import {Environment} from 'Util/Environment';
import {getLogger, Logger} from 'Util/Logger';
import {includesString} from 'Util/StringUtil';
import {getParameter} from 'Util/UrlUtil';
import {createRandomUuid} from 'Util/util';
import {URLParameter} from '../auth/URLParameter';
import {ROLE as TEAM_ROLE} from '../user/UserPermission';
import {UserData} from './UserData';
import {Segmentation} from './Segmentation';
import type {UserRepository} from '../user/UserRepository';
import {loadValue, storeValue} from 'Util/StorageUtil';
import {getPlatform} from './Helpers';
import {Config} from '../Config';
import {roundLogarithmic} from 'Util/NumberUtil';
import {EventName} from './EventName';

const Countly = require('countly-sdk-web');

export class EventTrackingRepository {
  private isProductReportingActivated: boolean;
  private sendAppOpenEvent: boolean = true;
  private readonly countlyDeviceId: string;
  private readonly logger: Logger;
  private readonly userRepository: UserRepository;
  isErrorReportingActivated: boolean;

  static get CONFIG() {
    return {
      USER_ANALYTICS: {
        API_KEY: window.wire.env.ANALYTICS_API_KEY,
        CLIENT_TYPE: 'desktop',
        COUNTLY_DEVICE_ID_LOCAL_STORAGE_KEY: 'COUNTLY_DEVICE_ID',
        DISABLED_DOMAINS: ['localhost'],
      },
    };
  }

  constructor(userRepository: UserRepository) {
    this.logger = getLogger('EventTrackingRepository');

    this.userRepository = userRepository;

    this.isErrorReportingActivated = false;
    this.isProductReportingActivated = false;

    const previousCountlyDeviceId = loadValue<string>(
      EventTrackingRepository.CONFIG.USER_ANALYTICS.COUNTLY_DEVICE_ID_LOCAL_STORAGE_KEY,
    );

    if (previousCountlyDeviceId) {
      this.countlyDeviceId = previousCountlyDeviceId;
    } else {
      this.countlyDeviceId = createRandomUuid();
      storeValue(
        EventTrackingRepository.CONFIG.USER_ANALYTICS.COUNTLY_DEVICE_ID_LOCAL_STORAGE_KEY,
        this.countlyDeviceId,
      );
    }
  }

  async init(telemetrySharing: boolean | undefined): Promise<void> {
    const isTeam = this.userRepository.isTeam();
    if (!isTeam) {
      return; // Countly should not be enabled for non-team users
    }
    let enableTelemetrySharing = true;
    if (typeof telemetrySharing === 'boolean') {
      enableTelemetrySharing = telemetrySharing;
    }
    this.logger.info(`Initialize analytics and error reporting: ${enableTelemetrySharing}`);

    amplify.subscribe(WebAppEvents.PROPERTIES.UPDATE.TELEMETRY_SHARING, this.toggleCountly);
    this.toggleCountly(telemetrySharing);
  }

  private readonly toggleCountly = (isEnabled: boolean) => {
    if (isEnabled && this.isDomainAllowedForAnalytics()) {
      this.startProductReporting();
    } else {
      this.stopProductReporting();
    }
  };

  private stopProductReporting(): void {
    this.logger.debug('Analytics was disabled due to user preferences');
    this.isProductReportingActivated = false;
    this.stopProductReportingSession();
    this.unsubscribeFromProductTrackingEvents();
  }

  private async startProductReporting(): Promise<void> {
    if (!window.wire.env.COUNTLY_API_KEY || this.isProductReportingActivated) {
      return;
    }
    this.isProductReportingActivated = true;

    Countly.init({
      app_key: window.wire.env.COUNTLY_API_KEY,
      debug: !Environment.frontend.isProduction(),
      device_id: this.countlyDeviceId,
      url: 'https://countly.wire.com/',
      use_session_cookie: false,
    });

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

  private stopProductReportingSession(): void {
    if (this.isProductReportingActivated === true) {
      Countly.end_session();
    }
  }

  private subscribeToProductEvents(): void {
    amplify.subscribe(WebAppEvents.ANALYTICS.EVENT, this, (eventName: string, segmentations?: any) => {
      this.trackProductReportingEvent(eventName, segmentations);
    });

    amplify.subscribe(WebAppEvents.LIFECYCLE.SIGNED_OUT, this.stopProductReportingSession.bind(this));
  }

  private startProductReportingSession(): void {
    if (this.isProductReportingActivated === true) {
      Countly.begin_session();
      if (this.sendAppOpenEvent) {
        this.sendAppOpenEvent = false;
        this.trackProductReportingEvent(EventName.APP_OPEN);
      }
    }
  }

  private getUserType(): 'member' | 'external' | 'wireless' {
    if (this.userRepository.self().teamRole() === TEAM_ROLE.PARTNER) {
      return 'external';
    }

    if (this.userRepository.self().isGuest()) {
      return 'wireless';
    }

    return 'member';
  }

  private trackProductReportingEvent(eventName: string, customSegmentations?: any): void {
    if (this.isProductReportingActivated === true) {
      const userData = {
        [UserData.IS_TEAM]: this.userRepository.isTeam(),
        [UserData.CONTACTS]: roundLogarithmic(this.userRepository.numberOfContacts(), 6),
        [UserData.TEAM_SIZE]: roundLogarithmic(this.userRepository.teamMembers().length, 6),
        [UserData.TEAM_ID]: this.userRepository.self().teamId,
        [UserData.USER_TYPE]: this.getUserType(),
      };
      Object.entries(userData).forEach(entry => {
        const [key, value] = entry;
        Countly.userData.set(key, value);
      });
      Countly.userData.save();

      const segmentation = {
        [Segmentation.COMMON.APP]: EventTrackingRepository.CONFIG.USER_ANALYTICS.CLIENT_TYPE,
        [Segmentation.COMMON.APP_VERSION]: Config.getConfig().VERSION,
        [Segmentation.COMMON.DESKTOP_APP]: getPlatform(),
        ...customSegmentations,
      };

      Countly.add_event({
        key: eventName,
        segmentation,
      });

      this.logger.info(`Reporting custom data for product event ${eventName}@${JSON.stringify(userData)}`);
      this.logger.info(`Reporting product event ${eventName}@${JSON.stringify(segmentation)}`);
    }
  }

  private unsubscribeFromProductTrackingEvents(): void {
    amplify.unsubscribeAll(WebAppEvents.ANALYTICS.EVENT);
  }
}
