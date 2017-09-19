/*
 * Wire
 * Copyright (C) 2017 Wire Swiss GmbH
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

/* eslint-disable no-undef */
'use strict';

window.z = window.z || {};
window.z.tracking = z.tracking || {};

z.tracking.EventTrackingRepository = class EventTrackingRepository {
  static get CONFIG() {
    const MIXPANEL_TOKEN = z.util.Environment.frontend.is_production() ? 'c7dcb15893f14932b1c31b5fb33ff669' : '537da3b3bc07df1e420d07e2921a6f6f';
    const RAYGUN_API_KEY = z.util.Environment.frontend.is_production() ? 'lAkLCPLx3ysnsXktajeHmw==' : '5hvAMmz8wTXaHBYqu2TFUQ==';

    return {
      ERROR_TRACKING: {
        API_KEY: RAYGUN_API_KEY,
        REPORTING_THRESHOLD: 60 * 1000, // milliseconds
      },
      USER_TRACKING: {
        API_KEY: MIXPANEL_TOKEN,
        DISABLED_DOMAINS: [
          'localhost',
          'zinfra.io',
        ],
      },
    };
  }

  /**
   * Construct a new repository for user actions and errors reporting.
   *
   * @param {z.conversation.ConversationRepository} conversation_repository - Repository that handles conversations
   * @param {z.user.UserRepository} user_repository - Repository that handles users
   * @returns {EventTrackingRepository} The new repository for user actions
   */
  constructor(conversation_repository, user_repository) {
    this.logger = new z.util.Logger('z.tracking.EventTrackingRepository', z.config.LOGGER.OPTIONS);

    this.conversation_repository = conversation_repository;
    this.user_repository = user_repository;

    this.last_report = undefined;
    this.mixpanel = undefined;
    this.privacy_preference = false;

    this.is_error_tracking_activated = false;
    this.is_user_tracking_activated = false;

    if (!this.conversation_repository && !this.user_repository) {
      this.init_without_user_tracking();
    } else {
      amplify.subscribe(z.event.WebApp.ANALYTICS.INIT, this.init.bind(this));
    }
  }

  /**
   * Init the repository.
   * @param {boolean} privacy_preference - Privacy preference
   * @returns {undefined} No return value
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
      .then((mixpanel_instance) => {
        if (mixpanel_instance) {
          this.mixpanel = mixpanel_instance;
          this._subscribe_to_tracking_events();
        }
        amplify.subscribe(z.event.WebApp.PROPERTIES.UPDATE.PRIVACY, this._update_privacy_preference.bind(this));
      });
  }

  /**
   * Initialize the repository without user tracking but with error reporting (used for "auth" page).
   * @note Mode for auth page
   * @returns {undefined} No return value
   */
  init_without_user_tracking() {
    this._enable_error_reporting();
  }

  _update_privacy_preference(privacy_preference) {
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

  _subscribe_to_tracking_events() {
    amplify.subscribe(z.event.WebApp.ANALYTICS.SUPER_PROPERTY, this, (...args) => {
      if (this.is_user_tracking_activated) {
        this._set_super_property(...args);
      }
    });

    amplify.subscribe(z.event.WebApp.ANALYTICS.EVENT, this, (...args) => {
      if (this.is_user_tracking_activated) {
        this._track_event(...args);
      }
    });
  }

  _unsubscribe_from_tracking_events() {
    amplify.unsubscribeAll(z.event.WebApp.ANALYTICS.SUPER_PROPERTY);
    amplify.unsubscribeAll(z.event.WebApp.ANALYTICS.EVENT);
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

    // During the transition phase (Localytics -> Mixpanel), we only want to log certain events:
    const allowed_events = [
      z.tracking.EventName.MEDIA.COMPLETED_MEDIA_ACTION,
      z.tracking.EventName.TRACKING.OPT_IN,
      z.tracking.EventName.TRACKING.OPT_OUT,
    ];

    if (allowed_events.includes(event_name)) {
      this.mixpanel.track(event_name, attributes);
    }
  }

  _disable_tracking() {
    this.logger.debug('Tracking was disabled due to user preferences');
    this.is_user_tracking_activated = false;

    this._unsubscribe_from_tracking_events();
    this._track_event(z.tracking.EventName.TRACKING.OPT_OUT);

    if (this.mixpanel) {
      this.mixpanel.register({
        '$ignore': true,
      });
    }
  }

  _re_enable_tracking() {
    this.is_user_tracking_activated = true;
    this.mixpanel.unregister('$ignore');
    this._subscribe_to_tracking_events();
    this._track_event(z.tracking.EventName.TRACKING.OPT_IN);
    this._set_super_property(z.tracking.SuperProperty.CONTACTS, this.user_repository.connected_users().length);
  }

  _init_tracking() {
    this.is_user_tracking_activated = true;

    return new Promise((resolve) => {
      if (!this.mixpanel) {
        mixpanel.init(EventTrackingRepository.CONFIG.USER_TRACKING.API_KEY, {
          autotrack: false,
          debug: !z.util.Environment.frontend.is_production(),
          loaded: (mixpanel) => {
            mixpanel.register({
              '$city': null,
              '$initial_referrer': null,
              '$initial_referring_domain': null,
              '$referrer': null,
              '$referring_domain': null,
              '$region': null,
              'mp_country_code': null,
            });
            resolve(mixpanel);
          },
        }, Date.now());
      } else {
        resolve(this.mixpanel);
      }
    });
  }

  _is_domain_allowed_for_tracking() {
    if (!z.util.get_url_parameter(z.auth.URLParameter.TRACKING)) {
      for (const domain of EventTrackingRepository.CONFIG.USER_TRACKING.DISABLED_DOMAINS) {
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
            rejected_promise.catch((promise_error) => {
              this.logger.log(this.logger.levels.OFF, 'Handled uncaught Promise in error reporting', promise_error);
            });
          },
          0);
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
    if (time_since_last_report > EventTrackingRepository.CONFIG.ERROR_TRACKING.REPORTING_THRESHOLD) {
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
    this.is_error_tracking_activated = false;
    Raygun.detach();
    Raygun.init(EventTrackingRepository.CONFIG.ERROR_TRACKING.API_KEY, {disableErrorTracking: true});
    this._detach_promise_rejection_handler();
  }

  _enable_error_reporting() {
    this.logger.debug('Enabling Raygun error reporting');
    this.is_error_tracking_activated = true;

    const options = {
      disableErrorTracking: false,
      excludedHostnames: [
        'localhost',
        'wire.ms',
      ],
      ignore3rdPartyErrors: true,
      ignoreAjaxAbort: true,
      ignoreAjaxError: true,
    };

    options.debugMode = !z.util.Environment.frontend.is_production();

    Raygun.init(EventTrackingRepository.CONFIG.ERROR_TRACKING.API_KEY, options).attach();

    /*
    Adding a version to the Raygun reports to identify which version of the Wire ran into the issue.
    @note We cannot use our own version string as it has to be in a certain format
    @see https://github.com/MindscapeHQ/raygun4js#version-filtering
    */
    if (!z.util.Environment.frontend.is_localhost()) {
      Raygun.setVersion(z.util.Environment.version(false));
    }
    if (z.util.Environment.desktop) {
      Raygun.withCustomData({electron_version: z.util.Environment.version(true)});
    }
    Raygun.onBeforeSend(this._check_error_payload.bind(this));
    this._attach_promise_rejection_handler();
  }
};
