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

'use strict';

window.z = window.z || {};
window.z.tracking = z.tracking || {};

z.tracking.EventTrackingRepository = class EventTrackingRepository {
  static get CONFIG() {
    const MIXPANEL_TOKEN = z.util.Environment.frontend.isProduction()
      ? 'c7dcb15893f14932b1c31b5fb33ff669'
      : '537da3b3bc07df1e420d07e2921a6f6f';
    const RAYGUN_API_KEY = z.util.Environment.frontend.isProduction()
      ? 'lAkLCPLx3ysnsXktajeHmw=='
      : '5hvAMmz8wTXaHBYqu2TFUQ==';

    return {
      ERROR_REPORTING: {
        API_KEY: RAYGUN_API_KEY,
        REPORTING_THRESHOLD: z.util.TimeUtil.UNITS_IN_MILLIS.MINUTE,
      },
      USER_ANALYTICS: {
        API_KEY: MIXPANEL_TOKEN,
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

    this.lastReportTimestamp = undefined;
    this.mixpanel = undefined;
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
    this.logger.info(`Initialize tracking and error reporting: ${this.privacyPreference}`);

    return Promise.resolve()
      .then(() => {
        if (this._isDomainAllowedForTracking() && this.privacyPreference) {
          this._enableErrorReporting();
          return this._initTracking();
        }
        return undefined;
      })
      .then(mixpanelInstance => this._initAnalytics(mixpanelInstance))
      .then(() => amplify.subscribe(z.event.WebApp.PROPERTIES.UPDATE.PRIVACY, this.updatePrivacyPreference));
  }

  updatePrivacyPreference(privacyPreference) {
    if (privacyPreference !== this.privacyPreference) {
      this.privacyPreference = privacyPreference;

      if (privacyPreference) {
        this._enableErrorReporting();
        if (this._isDomainAllowedForTracking()) {
          this._reEnableTracking();
        }
      } else {
        this._disableErrorReporting();
        this._disableTracking();
      }
    }
  }

  _initAnalytics(analyticsProvider) {
    if (analyticsProvider) {
      this._setSuperProperties();
      this._subscribeToTrackingEvents();
    }
  }

  _subscribeToTrackingEvents() {
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

  /**
   * Calling the reset method will clear the Distinct Id and all super properties.
   * @see https://mixpanel.com/blog/2015/09/21/community-tip-maintaining-user-identity/
   * @returns {undefined}
   */
  _resetSuperProperties() {
    if (this.mixpanel) {
      this.mixpanel.reset();
    }
  }

  _unsubscribeFromTrackingEvents() {
    amplify.unsubscribeAll(z.event.WebApp.ANALYTICS.SUPER_PROPERTY);
    amplify.unsubscribeAll(z.event.WebApp.ANALYTICS.EVENT);
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
    this.logger.info(`Set super property '${superPropertyName}' to value '${value}'`);
    this.mixpanel.register({[superPropertyName]: value});
  }

  _trackEvent(eventName, attributes) {
    const logMessage = attributes
      ? `Tracking event '${eventName}' with attributes: ${JSON.stringify(attributes)}`
      : `Tracking event '${eventName}' without attributes`;
    this.logger.info(logMessage);

    const isDisabledEvent = EventTrackingRepository.CONFIG.USER_ANALYTICS.DISABLED_EVENTS.includes(eventName);
    if (!isDisabledEvent) {
      this.mixpanel.track(eventName, attributes);
    }
  }

  _disableTracking() {
    this.logger.debug('Tracking was disabled due to user preferences');
    this.isUserAnalyticsActivated = false;

    this._unsubscribeFromTrackingEvents();

    if (this.mixpanel) {
      this._trackEvent(z.tracking.EventName.SETTINGS.OPTED_OUT_TRACKING);
      this.mixpanel.register({
        $ignore: true,
      });
    }
  }

  _reEnableTracking() {
    this.isUserAnalyticsActivated = true;

    Promise.resolve()
      .then(() => {
        if (this.mixpanel) {
          this.mixpanel.unregister('$ignore');
          return this.mixpanel;
        }

        return this._initTracking();
      })
      .then(mixpanelInstance => this._initAnalytics(mixpanelInstance))
      .then(() => this._trackEvent(z.tracking.EventName.SETTINGS.OPTED_IN_TRACKING));
  }

  _initTracking() {
    this.isUserAnalyticsActivated = true;

    if (this.mixpanel) {
      return Promise.resolve(this.mixpanel);
    }

    return new Promise(resolve => {
      mixpanel.init(
        EventTrackingRepository.CONFIG.USER_ANALYTICS.API_KEY,
        {
          autotrack: false,
          debug: !z.util.Environment.frontend.isProduction(),
          loaded: mixpanel => {
            mixpanel.register({
              $city: null,
              $initial_referrer: null,
              $initial_referring_domain: null,
              $referrer: null,
              $referring_domain: null,
              $region: null,
            });
            this.mixpanel = mixpanel;
            resolve(mixpanel);
          },
        },
        Date.now()
      );
    });
  }

  _isDomainAllowedForTracking() {
    if (!z.util.URLUtil.getParameter(z.auth.URLParameter.TRACKING)) {
      return !EventTrackingRepository.CONFIG.USER_ANALYTICS.DISABLED_DOMAINS.some(domain => {
        if (z.util.StringUtil.includes(window.location.hostname, domain)) {
          this.logger.debug(`Tracking is disabled for domain '${window.location.hostname}'`);
          return true;
        }
      });
    }

    return true;
  }

  //##############################################################################
  // Raygun
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
