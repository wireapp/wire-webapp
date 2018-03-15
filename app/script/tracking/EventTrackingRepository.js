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
        REPORTING_THRESHOLD: 60 * 1000, // milliseconds
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
   * @param {z.conversation.ConversationRepository} conversation_repository - Repository that handles conversations
   * @param {z.team.TeamRepository} team_repository - Repository that handles teams
   * @param {z.user.UserRepository} user_repository - Repository that handles users
   * @returns {EventTrackingRepository} The new repository for user actions
   */
  constructor(conversation_repository, team_repository, user_repository) {
    this.update_privacy_preference = this.update_privacy_preference.bind(this);

    this.logger = new z.util.Logger('z.tracking.EventTrackingRepository', z.config.LOGGER.OPTIONS);

    this.conversation_repository = conversation_repository;
    this.team_repository = team_repository;
    this.user_repository = user_repository;

    this.last_report = undefined;
    this.mixpanel = undefined;
    this.privacy_preference = false;

    this.is_error_reporting_activated = false;
    this.is_user_analytics_activated = false;

    if (!this.conversation_repository || !this.team_repository || !this.user_repository) {
      this.init_without_user_analytics();
    }
  }

  /**
   * Init the repository.
   * @param {boolean} privacy_preference - Privacy preference
   * @returns {Promise} Resolves after initialization
   */
  init(privacy_preference) {
    this.privacy_preference = privacy_preference;
    this.logger.info(`Initialize tracking and error reporting: ${this.privacy_preference}`);

    return Promise.resolve()
      .then(() => {
        if (this._is_domain_allowed_for_tracking() && this.privacy_preference) {
          this._enable_error_reporting();
          return this._init_tracking();
        }
        return undefined;
      })
      .then(mixpanel_instance => this._init_mixpanel(mixpanel_instance))
      .then(() => amplify.subscribe(z.event.WebApp.PROPERTIES.UPDATE.PRIVACY, this.update_privacy_preference));
  }

  /**
   * Initialize the repository without user analytics but with error reporting (used for "auth" page).
   * @note Mode for auth page
   * @returns {Promise} Resolves after initialization
   */
  init_without_user_analytics() {
    return Promise.resolve()
      .then(() => {
        if (this._is_domain_allowed_for_tracking()) {
          this._enable_error_reporting();
          return this._init_tracking();
        }
        return undefined;
      })
      .then(mixpanel_instance => this._init_mixpanel(mixpanel_instance));
  }

  update_privacy_preference(privacy_preference) {
    if (privacy_preference !== this.privacy_preference) {
      this.privacy_preference = privacy_preference;

      if (privacy_preference) {
        this._enable_error_reporting();
        if (this._is_domain_allowed_for_tracking()) {
          this._re_enable_tracking();
        }
      } else {
        this._disable_error_reporting();
        this._disable_tracking();
      }
    }
  }

  _init_mixpanel(mixpanel_instance) {
    if (mixpanel_instance) {
      this._set_super_properties();
      this._subscribe_to_tracking_events();
    }
  }

  _subscribe_to_tracking_events() {
    amplify.subscribe(z.event.WebApp.ANALYTICS.SUPER_PROPERTY, this, (...args) => {
      if (this.is_user_analytics_activated) {
        this._set_super_property(...args);
      }
    });

    amplify.subscribe(z.event.WebApp.ANALYTICS.EVENT, this, (...args) => {
      if (this.is_user_analytics_activated) {
        this._track_event(...args);
      }
    });

    amplify.subscribe(z.event.WebApp.LIFECYCLE.SIGNED_OUT, this._reset_super_properties.bind(this));
  }

  /**
   * Calling the reset method will clear the Distinct Id and all super properties.
   * @see https://mixpanel.com/blog/2015/09/21/community-tip-maintaining-user-identity/
   * @returns {undefined}
   */
  _reset_super_properties() {
    if (this.mixpanel) {
      this.mixpanel.reset();
    }
  }

  _unsubscribe_from_tracking_events() {
    amplify.unsubscribeAll(z.event.WebApp.ANALYTICS.SUPER_PROPERTY);
    amplify.unsubscribeAll(z.event.WebApp.ANALYTICS.EVENT);
  }

  _set_super_properties() {
    this._set_super_property(z.tracking.SuperProperty.APP, EventTrackingRepository.CONFIG.USER_ANALYTICS.CLIENT_TYPE);
    this._set_super_property(z.tracking.SuperProperty.APP_VERSION, z.util.Environment.version(false));
    this._set_super_property(z.tracking.SuperProperty.DESKTOP_APP, z.tracking.helpers.get_platform());
    if (z.util.Environment.desktop) {
      this._set_super_property(z.tracking.SuperProperty.WRAPPER_VERSION, z.util.Environment.version(true));
    }

    if (this.user_repository) {
      this._set_super_property(z.tracking.SuperProperty.CONTACTS, this.user_repository.number_of_contacts());
      this._set_super_property(z.tracking.SuperProperty.TEAM.IN_TEAM, this.team_repository.isTeam());
      this._set_super_property(z.tracking.SuperProperty.TEAM.SIZE, this.team_repository.teamSize());
    }
  }

  _set_super_property(super_property, value) {
    this.logger.info(`Set super property '${super_property}' to value '${value}'`);
    const super_properties = {};
    super_properties[super_property] = value;
    this.mixpanel.register(super_properties);
  }

  _track_event(event_name, attributes) {
    if (attributes) {
      this.logger.info(`Tracking event '${event_name}' with attributes: ${JSON.stringify(attributes)}`);
    } else {
      this.logger.info(`Tracking event '${event_name}' without attributes`);
    }

    const isDisabledEvent = EventTrackingRepository.CONFIG.USER_ANALYTICS.DISABLED_EVENTS.includes(event_name);
    if (!isDisabledEvent) {
      this.mixpanel.track(event_name, attributes);
    }
  }

  _disable_tracking() {
    this.logger.debug('Tracking was disabled due to user preferences');
    this.is_user_analytics_activated = false;

    this._unsubscribe_from_tracking_events();
    this._track_event(z.tracking.EventName.SETTINGS.OPTED_OUT_TRACKING);

    if (this.mixpanel) {
      this.mixpanel.register({
        $ignore: true,
      });
    }
  }

  _re_enable_tracking() {
    this.is_user_analytics_activated = true;

    Promise.resolve()
      .then(() => {
        if (this.mixpanel) {
          this.mixpanel.unregister('$ignore');
          return this.mixpanel;
        }

        return this._init_tracking();
      })
      .then(mixpanel_instance => this._init_mixpanel(mixpanel_instance))
      .then(() => this._track_event(z.tracking.EventName.SETTINGS.OPTED_IN_TRACKING));
  }

  _init_tracking() {
    this.is_user_analytics_activated = true;

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

  _is_domain_allowed_for_tracking() {
    if (!z.util.get_url_parameter(z.auth.URLParameter.TRACKING)) {
      for (const domain of EventTrackingRepository.CONFIG.USER_ANALYTICS.DISABLED_DOMAINS) {
        if (z.util.StringUtil.includes(window.location.hostname, domain)) {
          this.logger.debug(`Tracking is disabled for domain '${window.location.hostname}'`);
          return false;
        }
      }
    }

    return true;
  }

  //##############################################################################
  // Raygun
  //##############################################################################

  /**
   * Attach to rejected Promises.
   * @returns {undefined} No return value
   */
  _attach_promise_rejection_handler() {
    window.onunhandledrejection = ({reason: error, promise: rejected_promise}) => {
      if (window.onerror) {
        if (error) {
          if (_.isString(error)) {
            window.onerror.call(this, error, null, null, null);
          } else if (error.message) {
            window.onerror.call(this, error.message, error.fileName, error.lineNumber, error.columnNumber, error);
          }
        }

        if (rejected_promise) {
          window.setTimeout(() => {
            rejected_promise.catch(promise_error => {
              this.logger.log(this.logger.levels.OFF, 'Handled uncaught Promise in error reporting', promise_error);
            });
          }, 0);
        }
      }
    };
  }

  /**
   * Checks if a Raygun payload should be reported.
   *
   * @see https://github.com/MindscapeHQ/raygun4js#onbeforesend
   * @param {JSON} raygun_payload - Error payload about to be send
   * @returns {JSON|boolean} Payload if error will be reported, otherwise "false"
   */
  _check_error_payload(raygun_payload) {
    if (!this.last_report) {
      this.last_report = Date.now();
      return raygun_payload;
    }

    const time_since_last_report = Date.now() - this.last_report;
    if (time_since_last_report > EventTrackingRepository.CONFIG.ERROR_REPORTING.REPORTING_THRESHOLD) {
      this.last_report = Date.now();
      return raygun_payload;
    }

    return false;
  }

  _detach_promise_rejection_handler() {
    window.onunhandledrejection = undefined;
  }

  _disable_error_reporting() {
    this.logger.debug('Disabling Raygun error reporting');
    this.is_error_reporting_activated = false;
    Raygun.detach();
    Raygun.init(EventTrackingRepository.CONFIG.ERROR_REPORTING.API_KEY, {disableErrorTracking: true});
    this._detach_promise_rejection_handler();
  }

  _enable_error_reporting() {
    this.logger.debug('Enabling Raygun error reporting');
    this.is_error_reporting_activated = true;

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
    Raygun.onBeforeSend(this._check_error_payload.bind(this));
    this._attach_promise_rejection_handler();
  }
};
