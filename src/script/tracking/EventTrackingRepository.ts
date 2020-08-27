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
import {RaygunStatic} from 'raygun4js';
import {Environment} from 'Util/Environment';
import {getLogger, Logger} from 'Util/Logger';
import {includesString} from 'Util/StringUtil';
import {TIME_IN_MILLIS} from 'Util/TimeUtil';
import {getParameter} from 'Util/UrlUtil';
import {createRandomUuid} from 'Util/util';
import {URLParameter} from '../auth/URLParameter';
import type {UserRepository} from '../user/UserRepository';
import {EventName} from './EventName';
import {UserData} from './UserData';
import {Segmantation} from './Segmentation';

declare const Raygun: RaygunStatic;

const Countly = require('countly-sdk-web');

export class EventTrackingRepository {
  private isProductReportingActivated: boolean;
  private lastReportTimestamp?: number;
  private privacyPreference?: boolean;
  private readonly logger: Logger;
  private readonly userRepository: UserRepository;
  isErrorReportingActivated: boolean;

  static get CONFIG() {
    return {
      ERROR_REPORTING: {
        API_KEY: window.wire.env.RAYGUN_API_KEY,
        REPORTING_THRESHOLD: TIME_IN_MILLIS.MINUTE,
      },
      USER_ANALYTICS: {
        API_KEY: window.wire.env.ANALYTICS_API_KEY,
        CLIENT_TYPE: 'desktop',
        DISABLED_DOMAINS: ['localhost'],
      },
    };
  }

  constructor(userRepository: UserRepository) {
    this.logger = getLogger('EventTrackingRepository');

    this.userRepository = userRepository;

    this.lastReportTimestamp = undefined;
    this.privacyPreference = undefined;

    this.isErrorReportingActivated = false;
    this.isProductReportingActivated = false;
  }

  async init(privacyPreference: boolean): Promise<void> {
    this.privacyPreference = privacyPreference || this.userRepository.isTeam();
    this.logger.info(`Initialize analytics and error reporting: ${this.privacyPreference}`);

    if (this.privacyPreference) {
      this.enableServices(false);
    }

    amplify.subscribe(WebAppEvents.PROPERTIES.UPDATE.PRIVACY, this.updatePrivacyPreference);
  }

  private readonly updatePrivacyPreference = async (privacyPreference: boolean): Promise<void> => {
    const hasPreferenceChanged = privacyPreference !== this.privacyPreference;
    if (hasPreferenceChanged) {
      this.privacyPreference = privacyPreference;
      return this.privacyPreference ? this.enableServices(true) : this.disableServices();
    }
  };

  private async enableServices(isOptIn = false): Promise<void> {
    this.startErrorReporting();
    if (this.isDomainAllowedForAnalytics()) {
      await this.startProductReporting();
      if (isOptIn) {
        this.trackProductReportingEvent(EventName.SETTINGS.OPTED_IN_TRACKING);
      }
    }
  }

  private disableServices(): void {
    this.stopErrorReporting();
    this.trackProductReportingEvent(EventName.SETTINGS.OPTED_OUT_TRACKING);
    this.stopProductReporting();
  }

  private stopProductReporting(): void {
    this.logger.debug('Analytics was disabled due to user preferences');
    this.isProductReportingActivated = false;
    this.stopProductReportingSession();
    this.unsubscribeFromProductTrackingEvents();
  }

  private async startProductReporting(): Promise<void> {
    if (!window.wire.env.COUNTLY_API_KEY) {
      return;
    }
    this.isProductReportingActivated = true;

    Countly.init({
      app_key: window.wire.env.COUNTLY_API_KEY,
      debug: !Environment.frontend.isProduction(),
      device_id: createRandomUuid(),
      url: 'https://wire.count.ly/',
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
    }
  }

  private trackProductReportingEvent(eventName: string, segmentations?: any): void {
    if (this.isProductReportingActivated === true) {
      Countly.userData.set(UserData.IS_TEAM, this.userRepository.isTeam());
      Countly.userData.set(UserData.CONTACTS, this.userRepository.number_of_contacts());
      Countly.userData.set(UserData.TEAM_SIZE, this.userRepository.teamMembers().length);
      Countly.userData.save();

      Countly.add_event({
        key: eventName,
        segmentation: {
          [Segmantation.COMMON.APP]: EventTrackingRepository.CONFIG.USER_ANALYTICS.CLIENT_TYPE,
          [Segmantation.COMMON.APP_VERSION]: Environment.version(false),
          ...segmentations,
        },
      });
    }
  }

  private unsubscribeFromProductTrackingEvents(): void {
    amplify.unsubscribeAll(WebAppEvents.ANALYTICS.EVENT);
  }

  /**
   * Checks if a Raygun payload should be reported.
   *
   * @see https://github.com/MindscapeHQ/raygun4js#onbeforesend
   * @param raygunPayload Error payload about to be send
   * @returns Payload if error will be reported, otherwise `false`
   */
  private checkErrorPayload<T extends object>(raygunPayload: T): T | false {
    if (!this.lastReportTimestamp) {
      this.lastReportTimestamp = Date.now();
      return raygunPayload;
    }

    const timeSinceLastReport = Date.now() - this.lastReportTimestamp;
    if (timeSinceLastReport > EventTrackingRepository.CONFIG.ERROR_REPORTING.REPORTING_THRESHOLD) {
      this.lastReportTimestamp = Date.now();
      return raygunPayload;
    }

    return false;
  }

  private stopErrorReporting(): void {
    this.logger.debug('Disabling Raygun error reporting');
    this.isErrorReportingActivated = false;
    Raygun.detach();
    Raygun.init(EventTrackingRepository.CONFIG.ERROR_REPORTING.API_KEY, {disableErrorTracking: true});
  }

  private startErrorReporting(): void {
    this.logger.debug('Enabling Raygun error reporting');
    this.isErrorReportingActivated = true;

    const options = {
      debugMode: !Environment.frontend.isProduction(),
      disableErrorTracking: false,
      excludedHostnames: ['localhost', 'wire.ms'],
      ignore3rdPartyErrors: true,
      ignoreAjaxAbort: true,
      ignoreAjaxError: true,
    };

    Raygun.init(EventTrackingRepository.CONFIG.ERROR_REPORTING.API_KEY, options).attach();
    Raygun.disableAutoBreadcrumbs();

    /*
     * Adding a version to the Raygun reports to identify which version of the WebApp ran into the issue.
     * @note We cannot use our own version string as it has to be in a certain format
     * @see https://github.com/MindscapeHQ/raygun4js#version-filtering
     */
    if (!Environment.frontend.isLocalhost()) {
      Raygun.setVersion(Environment.version(false));
    }
    if (Environment.desktop) {
      Raygun.withCustomData({electron_version: Environment.version(true)});
    }
    Raygun.onBeforeSend(this.checkErrorPayload.bind(this));
  }
}
