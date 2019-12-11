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

import {Environment} from 'Util/Environment';
import {Logger, getLogger} from 'Util/Logger';
import {includesString} from 'Util/StringUtil';
import {TIME_IN_MILLIS} from 'Util/TimeUtil';
import {getParameter} from 'Util/UrlUtil';

import {URLParameter} from '../auth/URLParameter';
import {WebAppEvents} from '../event/WebApp';

import {TeamRepository} from '../team/TeamRepository';
import {UserRepository} from '../user/UserRepository';
import {EventName} from './EventName';
import * as trackingHelpers from './Helpers';
import {SuperProperty} from './SuperProperty';

export class EventTrackingRepository {
  private isUserAnalyticsActivated: boolean;
  private lastReportTimestamp?: number;
  private privacyPreference?: boolean;
  private providerAPI?: boolean;
  private readonly logger: Logger;
  private readonly teamRepository: TeamRepository;
  private readonly userRepository: UserRepository;
  isErrorReportingActivated: boolean;

  // tslint:disable-next-line:typedef
  static get CONFIG() {
    return {
      ERROR_REPORTING: {
        API_KEY: window.wire.env.RAYGUN_API_KEY,
        REPORTING_THRESHOLD: TIME_IN_MILLIS.MINUTE,
      },
      USER_ANALYTICS: {
        API_KEY: window.wire.env.ANALYTICS_API_KEY,
        CLIENT_TYPE: 'desktop',
        DISABLED_DOMAINS: ['localhost', 'zinfra.io'],
        DISABLED_EVENTS: [EventName.TELEMETRY.APP_INITIALIZATION],
      },
    };
  }

  constructor(teamRepository: TeamRepository, userRepository: UserRepository) {
    this.logger = getLogger('EventTrackingRepository');

    this.teamRepository = teamRepository;
    this.userRepository = userRepository;

    this.providerAPI = undefined;
    this.lastReportTimestamp = undefined;
    this.privacyPreference = undefined;

    this.isErrorReportingActivated = false;
    this.isUserAnalyticsActivated = false;
  }

  /**
   * @param privacyPreference Privacy preference
   * @returns Resolves after initialization
   */
  async init(privacyPreference: boolean): Promise<void> {
    this.privacyPreference = privacyPreference;
    this.logger.info(`Initialize analytics and error reporting: ${this.privacyPreference}`);

    if (this.privacyPreference) {
      this._enableServices(false);
    }

    amplify.subscribe(WebAppEvents.PROPERTIES.UPDATE.PRIVACY, this.updatePrivacyPreference);
  }

  private readonly updatePrivacyPreference = async (privacyPreference: boolean): Promise<void> => {
    const hasPreferenceChanged = privacyPreference !== this.privacyPreference;
    if (hasPreferenceChanged) {
      this.privacyPreference = privacyPreference;

      return this.privacyPreference ? this._enableServices(true) : this._disableServices();
    }
  };

  private async _enableServices(isOptIn = false): Promise<void> {
    this._enableErrorReporting();
    if (this._isDomainAllowedForAnalytics()) {
      await this._enableAnalytics();
      if (isOptIn) {
        this._trackEvent(EventName.SETTINGS.OPTED_IN_TRACKING);
      }
    }
  }

  private _disableServices(): void {
    this._disableErrorReporting();
    this._trackEvent(EventName.SETTINGS.OPTED_OUT_TRACKING);
    this._disableAnalytics();
  }

  //##############################################################################
  // Analytics
  //##############################################################################

  private _disableAnalytics(): void {
    this.logger.debug('Analytics was disabled due to user preferences');
    this.isUserAnalyticsActivated = false;

    this._unsubscribeFromAnalyticsEvents();

    if (this.providerAPI) {
      // Disable provider API
      this.providerAPI = undefined;
    }
  }

  private _enableAnalytics(): Promise<void> {
    this.isUserAnalyticsActivated = true;

    // Check if provider API is available and reuse if possible
    const providerPromise = this.providerAPI ? Promise.resolve(this.providerAPI) : this._initAnalytics();
    return providerPromise.then(providerInstance => {
      if (providerInstance) {
        this._setSuperProperties();
        this._subscribeToAnalyticsEvents();
      }
    });
  }

  private _initAnalytics(): Promise<boolean | undefined> {
    // Initialize provider API
    return Promise.resolve(this.providerAPI);
  }

  private _isDomainAllowedForAnalytics(): boolean {
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

  private _resetSuperProperties(): void {
    if (this.providerAPI) {
      // Reset super properties on provider API and forget distinct ids
    }
  }

  private _subscribeToAnalyticsEvents(): void {
    amplify.subscribe(WebAppEvents.ANALYTICS.SUPER_PROPERTY, this, (superPropertyName: string, value: any) => {
      if (this.isUserAnalyticsActivated) {
        this._setSuperProperty(superPropertyName, value);
      }
    });

    amplify.subscribe(WebAppEvents.ANALYTICS.EVENT, this, (eventName: string, attributes?: any) => {
      if (this.isUserAnalyticsActivated) {
        this._trackEvent(eventName, attributes);
      }
    });

    amplify.subscribe(WebAppEvents.LIFECYCLE.SIGNED_OUT, this._resetSuperProperties.bind(this));
  }

  private _setSuperProperties(): void {
    this._setSuperProperty(SuperProperty.APP, EventTrackingRepository.CONFIG.USER_ANALYTICS.CLIENT_TYPE);
    this._setSuperProperty(SuperProperty.APP_VERSION, Environment.version(false));
    this._setSuperProperty(SuperProperty.DESKTOP_APP, trackingHelpers.getPlatform());
    if (Environment.desktop) {
      this._setSuperProperty(SuperProperty.WRAPPER_VERSION, Environment.version(true));
    }

    if (this.userRepository) {
      this._setSuperProperty(SuperProperty.CONTACTS, this.userRepository.number_of_contacts());
      this._setSuperProperty(SuperProperty.TEAM.IN_TEAM, this.teamRepository.isTeam());
      this._setSuperProperty(SuperProperty.TEAM.SIZE, this.teamRepository.teamSize());
    }
  }

  private _setSuperProperty(superPropertyName: string, value: any): void {
    // Set property on provider API
    this.logger.info(`Set super property '${superPropertyName}' to value '${value}'`);
  }

  private _trackEvent(eventName: string, attributes?: any): void {
    const isDisabledEvent = EventTrackingRepository.CONFIG.USER_ANALYTICS.DISABLED_EVENTS.includes(eventName);
    if (isDisabledEvent) {
      this.logger.info(`Skipped sending disabled event of type '${eventName}'`);
    } else {
      const logAttributes = attributes ? `with attributes: ${JSON.stringify(attributes)}` : 'without attributes';
      this.logger.info(`Tracking event '${eventName}' ${logAttributes}`);

      // Send event if provider API available
    }
  }

  private _unsubscribeFromAnalyticsEvents(): void {
    amplify.unsubscribeAll(WebAppEvents.ANALYTICS.SUPER_PROPERTY);
    amplify.unsubscribeAll(WebAppEvents.ANALYTICS.EVENT);
  }

  //##############################################################################
  // Error reporting
  //##############################################################################

  /**
   * Checks if a Raygun payload should be reported.
   *
   * @see https://github.com/MindscapeHQ/raygun4js#onbeforesend
   * @param raygunPayload Error payload about to be send
   * @returns Payload if error will be reported, otherwise `false`
   */
  private _checkErrorPayload<T extends object>(raygunPayload: T): T | false {
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

  private _disableErrorReporting(): void {
    this.logger.debug('Disabling Raygun error reporting');
    this.isErrorReportingActivated = false;
    window.Raygun.detach();
    window.Raygun.init(EventTrackingRepository.CONFIG.ERROR_REPORTING.API_KEY, {disableErrorTracking: true});
  }

  private _enableErrorReporting(): void {
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

    window.Raygun.init(EventTrackingRepository.CONFIG.ERROR_REPORTING.API_KEY, options).attach();
    window.Raygun.disableAutoBreadcrumbs();

    /*
     * Adding a version to the Raygun reports to identify which version of the WebApp ran into the issue.
     * @note We cannot use our own version string as it has to be in a certain format
     * @see https://github.com/MindscapeHQ/raygun4js#version-filtering
     */
    if (!Environment.frontend.isLocalhost()) {
      window.Raygun.setVersion(Environment.version(false));
    }
    if (Environment.desktop) {
      window.Raygun.withCustomData({electron_version: Environment.version(true)});
    }
    window.Raygun.onBeforeSend(this._checkErrorPayload.bind(this));
  }
}
