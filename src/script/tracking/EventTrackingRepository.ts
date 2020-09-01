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
import type {UserRepository} from '../user/UserRepository';
import {UserData} from './UserData';
import {Segmantation} from './Segmentation';

const Countly = require('countly-sdk-web');

export class EventTrackingRepository {
  private isProductReportingActivated: boolean;
  private privacyPreference?: boolean;
  private readonly logger: Logger;
  private readonly userRepository: UserRepository;
  isErrorReportingActivated: boolean;

  static get CONFIG() {
    return {
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
    if (this.isDomainAllowedForAnalytics()) {
      await this.startProductReporting();
    }
  }

  private disableServices(): void {
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

      const segmentation = {
        [Segmantation.COMMON.APP]: EventTrackingRepository.CONFIG.USER_ANALYTICS.CLIENT_TYPE,
        [Segmantation.COMMON.APP_VERSION]: Environment.version(false),
        ...segmentations,
      };

      Countly.add_event({
        key: eventName,
        segmentation,
      });

      this.logger.info(`Reporting product event ${eventName}@${JSON.stringify(segmentation)}`);
    }
  }

  private unsubscribeFromProductTrackingEvents(): void {
    amplify.unsubscribeAll(WebAppEvents.ANALYTICS.EVENT);
  }
}
