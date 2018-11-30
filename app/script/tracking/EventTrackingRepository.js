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

window.z = window.z || {};
window.z.tracking = z.tracking || {};

z.tracking.EventTrackingRepository = class EventTrackingRepository {
  static get CONFIG() {
    return {
      ERROR_REPORTING: {
        API_KEY: window.wire.env.RAYGUN_API_KEY,
        REPORTING_THRESHOLD: z.util.TimeUtil.UNITS_IN_MILLIS.MINUTE,
      },
      USER_ANALYTICS: {
        API_KEY: window.wire.env.ANALYTICS_API_KEY,
        CLIENT_TYPE: 'desktop',
        DISABLED_DOMAINS: ['localhost', 'zinfra.io'],
        DISABLED_EVENTS: [
          z.tracking.EventName.CALLING.FAILED_REQUEST,
          z.tracking.EventName.CALLING.FAILED_REQUESTING_MEDIA,
          z.tracking.EventName.CALLING.FAILED_RTC,
          z.tracking.EventName.TELEMETRY.APP_INITIALIZATION,
        ],
      },
    };
  }

  /**
   * Construct a new repository for user actions and errors reporting.
   *
   * @param {z.team.TeamRepository} teamRepository - Repository that handles teams
   * @param {z.user.UserRepository} userRepository - Repository that handles users
   * @returns {EventTrackingRepository} The new repository for user actions
   */
  constructor(teamRepository, userRepository) {
    this.updatePrivacyPreference = this.updatePrivacyPreference.bind(this);

    this.logger = new z.util.Logger('z.tracking.EventTrackingRepository', z.config.LOGGER.OPTIONS);

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
      amplify.subscribe(z.event.WebApp.PROPERTIES.UPDATE.PRIVACY, this.updatePrivacyPreference);
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
            this._trackEvent(z.tracking.EventName.SETTINGS.OPTED_IN_TRACKING);
          }
        })
      : Promise.resolve();
  }

  _disableServices() {
    this._disableErrorReporting();
    this._trackEvent(z.tracking.EventName.SETTINGS.OPTED_OUT_TRACKING);
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
    const trackingParameter = z.util.URLUtil.getParameter(z.auth.URLParameter.TRACKING);
    return typeof trackingParameter === 'boolean'
      ? trackingParameter
      : !EventTrackingRepository.CONFIG.USER_ANALYTICS.DISABLED_DOMAINS.some(domain => {
          if (z.util.StringUtil.includes(window.location.hostname, domain)) {
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
    amplify.subscribe(z.event.WebApp.ANALYTICS.SUPER_PROPERTY, this, (...args) => {
      if (this.isUserAnalyticsActivated) {
        this._setSuperProperty(...args);
      }
    });

    amplify.subscribe(z.event.WebApp.ANALYTICS.EVENT, this, (...args) => {
      if (this.isUserAnalyticsActivated) {
        this._trackEvent(...args);
      }
    });

    amplify.subscribe(z.event.WebApp.LIFECYCLE.SIGNED_OUT, this._resetSuperProperties.bind(this));
  }

  _setSuperProperties() {
    this._setSuperProperty(z.tracking.SuperProperty.APP, EventTrackingRepository.CONFIG.USER_ANALYTICS.CLIENT_TYPE);
    this._setSuperProperty(z.tracking.SuperProperty.APP_VERSION, z.util.Environment.version(false));
    this._setSuperProperty(z.tracking.SuperProperty.DESKTOP_APP, z.tracking.helpers.getPlatform());
    if (z.util.Environment.desktop) {
      this._setSuperProperty(z.tracking.SuperProperty.WRAPPER_VERSION, z.util.Environment.version(true));
    }

    if (this.userRepository) {
      this._setSuperProperty(z.tracking.SuperProperty.CONTACTS, this.userRepository.number_of_contacts());
      this._setSuperProperty(z.tracking.SuperProperty.TEAM.IN_TEAM, this.teamRepository.isTeam());
      this._setSuperProperty(z.tracking.SuperProperty.TEAM.SIZE, this.teamRepository.teamSize());
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
    amplify.unsubscribeAll(z.event.WebApp.ANALYTICS.SUPER_PROPERTY);
    amplify.unsubscribeAll(z.event.WebApp.ANALYTICS.EVENT);
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

    options.debugMode = !z.util.Environment.frontend.isProduction();

    Raygun.init(EventTrackingRepository.CONFIG.ERROR_REPORTING.API_KEY, options).attach();
    Raygun.disableAutoBreadcrumbs();

    /*
    Adding a version to the Raygun reports to identify which version of the Wire ran into the issue.
    @note We cannot use our own version string as it has to be in a certain format
    @see https://github.com/MindscapeHQ/raygun4js#version-filtering
    */
    if (!z.util.Environment.frontend.isLocalhost()) {
      Raygun.setVersion(z.util.Environment.version(false));
    }
    if (z.util.Environment.desktop) {
      Raygun.withCustomData({electron_version: z.util.Environment.version(true)});
    }
    Raygun.onBeforeSend(this._checkErrorPayload.bind(this));
  }
};
