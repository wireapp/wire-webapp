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
import {TIME_IN_MILLIS} from 'Util/TimeUtil';
import {Environment} from 'Util/Environment';
import {includesString} from 'Util/StringUtil';
import {getParameter} from 'Util/UrlUtil';

import {WebAppEvents} from '../event/WebApp';
import {URLParameter} from '../auth/URLParameter';

import * as trackingHelpers from './Helpers';
import {EventName} from './EventName';
import {SuperProperty} from './SuperProperty';

export class EventTrackingRepository {
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

  /**
   * Construct a new repository for user actions and errors reporting.
   *
   * @param {TeamRepository} teamRepository - Repository that handles teams
   * @param {UserRepository} userRepository - Repository that handles users
   * @returns {EventTrackingRepository} The new repository for user actions
   */
  constructor(teamRepository, userRepository) {
    this.updatePrivacyPreference = this.updatePrivacyPreference.bind(this);

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
   * Init the repository.
   * @param {boolean} privacyPreference - Privacy preference
   * @returns {Promise} Resolves after initialization
   */
  init(privacyPreference) {
    this.privacyPreference = privacyPreference;
    this.logger.info(`Initialize analytics and error reporting: ${this.privacyPreference}`);

    const privacyPromise = this.privacyPreference ? this._enableServices(false) : Promise.resolve();
    return privacyPromise.then(() => {
      amplify.subscribe(WebAppEvents.PROPERTIES.UPDATE.PRIVACY, this.updatePrivacyPreference);
    });
  }

  updatePrivacyPreference(privacyPreference) {
    const hasPreferenceChanged = privacyPreference !== this.privacyPreference;
    if (hasPreferenceChanged) {
      this.privacyPreference = privacyPreference;

      return this.privacyPreference ? this._enableServices(true) : this._disableServices();
    }
  }

  _enableServices(isOptIn = false) {
    this._enableErrorReporting();
    return this._isDomainAllowedForAnalytics()
      ? this._enableAnalytics().then(() => {
          if (isOptIn) {
            this._trackEvent(EventName.SETTINGS.OPTED_IN_TRACKING);
          }
        })
      : Promise.resolve();
  }

  _disableServices() {
    this._disableErrorReporting();
    this._trackEvent(EventName.SETTINGS.OPTED_OUT_TRACKING);
    this._disableAnalytics();
  }

  //##############################################################################
  // Analytics
  //##############################################################################

  _disableAnalytics() {
    this.logger.debug('Analytics was disabled due to user preferences');
    this.isUserAnalyticsActivated = false;

    this._unsubscribeFromAnalyticsEvents();

    if (this.providerAPI) {
      // Disable provider API
      this.providerAPI = undefined;
    }
  }

  _enableAnalytics() {
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

  _initAnalytics() {
    // Initialize provider API
    return Promise.resolve(this.providerAPI);
  }

  _isDomainAllowedForAnalytics() {
    const trackingParameter = getParameter(URLParameter.TRACKING);
    return typeof trackingParameter === 'boolean'
      ? trackingParameter
      : !EventTrackingRepository.CONFIG.USER_ANALYTICS.DISABLED_DOMAINS.some(domain => {
          if (includesString(window.location.hostname, domain)) {
            this.logger.debug(`Analytics is disabled for domain '${window.location.hostname}'`);
            return true;
          }
        });
  }

  _resetSuperProperties() {
    if (this.providerAPI) {
      // Reset super properties on provider API and forget distinct ids
    }
  }

  _subscribeToAnalyticsEvents() {
    amplify.subscribe(WebAppEvents.ANALYTICS.SUPER_PROPERTY, this, (...args) => {
      if (this.isUserAnalyticsActivated) {
        this._setSuperProperty(...args);
      }
    });

    amplify.subscribe(WebAppEvents.ANALYTICS.EVENT, this, (...args) => {
      if (this.isUserAnalyticsActivated) {
        this._trackEvent(...args);
      }
    });

    amplify.subscribe(WebAppEvents.LIFECYCLE.SIGNED_OUT, this._resetSuperProperties.bind(this));
  }

  _setSuperProperties() {
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

  _setSuperProperty(superPropertyName, value) {
    // Set property on provider API
    this.logger.info(`Set super property '${superPropertyName}' to value '${value}'`);
  }

  _trackEvent(eventName, attributes) {
    const isDisabledEvent = EventTrackingRepository.CONFIG.USER_ANALYTICS.DISABLED_EVENTS.includes(eventName);
    if (isDisabledEvent) {
      this.logger.info(`Skipped sending disabled event of type '${eventName}'`);
    } else {
      const logAttributes = attributes ? `with attributes: ${JSON.stringify(attributes)}` : 'without attributes';
      this.logger.info(`Tracking event '${eventName}' ${logAttributes}`);

      // Send event if provider API available
    }
  }

  _unsubscribeFromAnalyticsEvents() {
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
   * @param {JSON} raygunPayload - Error payload about to be send
   * @returns {JSON|boolean} Payload if error will be reported, otherwise "false"
   */
  _checkErrorPayload(raygunPayload) {
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

  _disableErrorReporting() {
    this.logger.debug('Disabling Raygun error reporting');
    this.isErrorReportingActivated = false;
    Raygun.detach();
    Raygun.init(EventTrackingRepository.CONFIG.ERROR_REPORTING.API_KEY, {disableErrorTracking: true});
  }

  _enableErrorReporting() {
    this.logger.debug('Enabling Raygun error reporting');
    this.isErrorReportingActivated = true;

    const options = {
      disableErrorTracking: false,
      excludedHostnames: ['localhost', 'wire.ms'],
      ignore3rdPartyErrors: true,
      ignoreAjaxAbort: true,
      ignoreAjaxError: true,
    };

    options.debugMode = !Environment.frontend.isProduction();

    Raygun.init(EventTrackingRepository.CONFIG.ERROR_REPORTING.API_KEY, options).attach();
    Raygun.disableAutoBreadcrumbs();

    /*
    Adding a version to the Raygun reports to identify which version of the Wire ran into the issue.
    @note We cannot use our own version string as it has to be in a certain format
    @see https://github.com/MindscapeHQ/raygun4js#version-filtering
    */
    if (!Environment.frontend.isLocalhost()) {
      Raygun.setVersion(Environment.version(false));
    }
    if (Environment.desktop) {
      Raygun.withCustomData({electron_version: Environment.version(true)});
    }
    Raygun.onBeforeSend(this._checkErrorPayload.bind(this));
  }
}
