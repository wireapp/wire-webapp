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

'use strict';

window.z = window.z || {};
window.z.tracking = z.tracking || {};

z.tracking.EventTrackingRepository = class EventTrackingRepository {
  static get CONFIG() {
    const RAYGUN_API_KEY = z.util.Environment.frontend.is_production() ? 'lAkLCPLx3ysnsXktajeHmw==' : '5hvAMmz8wTXaHBYqu2TFUQ==';
    const LOCALYTICS_APP_KEY = z.util.Environment.frontend.is_production() ? 'f19c50ccf7bff11992798f0-59fac3b8-ad88-11e6-ff9e-00ae30fe7875' : '905792736c9f17c3464fd4e-60d90c82-d14a-11e4-af66-009c5fda0a25';

    return {
      ERROR_REPORTING_THRESHOLD: 60 * 1000, // in milliseconds
      LOCALYTICS: {
        APP_KEY: LOCALYTICS_APP_KEY,
        DISABLED_DOMAINS: [
          'localhost',
          'zinfra.io',
        ],
        SESSION_INTERVAL: 60 * 1000, // milliseconds
        SESSION_TIMEOUT: 3 * 60 * 1000,
      },
      RAYGUN: {
        API_KEY: RAYGUN_API_KEY,
      },
    };
  }

  /**
   * Construct a new repository for user actions and errors reporting.
   *
   * @note Uses Localytics and Raygun.
   * @see https://support.localytics.com/Javascript
   * @see http://docs.localytics.com/#Dev/Instrument/js-tag-events.html
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
    this.localytics = undefined;
    this.properties = undefined;
    this.session_interval = undefined;

    if (!this.conversation_repository && !this.user_repository) {
      this.init_without_user_tracking();
    } else {
      amplify.subscribe(z.event.WebApp.ANALYTICS.INIT, this.init.bind(this));
    }
  }

  /**
   * Init the repository.
   * @param {z.properties.Properties} properties - User properties
   * @returns {undefined} No return value
   */
  init(properties) {
    this.properties = properties;
    this.logger.info('Initialize tracking and error reporting');

    if (!this._localytics_disabled() && this._has_permission()) {
      this._enable_error_reporting();
      if (!this.localytics) {
        this._init_localytics();
      }
      this.set_custom_dimension(z.tracking.CustomDimension.CONTACTS, this.user_repository.connected_users().length);
      this._subscribe_to_events();
    }

    amplify.subscribe(z.event.WebApp.PROPERTIES.UPDATE.PRIVACY, this.updated_privacy.bind(this));
  }

  /**
   * Init the repository without user.
   * @note Mode for auth page
   * @returns {undefined} No return value
   */
  init_without_user_tracking() {
    this._enable_error_reporting();

    if (!this._localytics_disabled()) {
      if (!this.localytics) {
        this._init_localytics();
      }
      this.set_custom_dimension(z.tracking.CustomDimension.CONTACTS, -1);
      amplify.subscribe(z.event.WebApp.ANALYTICS.EVENT, this.tag_event.bind(this));
    }
  }

  updated_privacy(privacy_preference) {
    if (privacy_preference) {
      this._enable_error_reporting();
      if (!this._localytics_disabled()) {
        this.start_session();
        this.set_custom_dimension(z.tracking.CustomDimension.CONTACTS, this.user_repository.connected_users().length);
        this._subscribe_to_events();
        this.tag_event(z.tracking.EventName.TRACKING.OPT_IN);
      }
    } else {
      if (!this._localytics_disabled()) {
        amplify.unsubscribeAll(z.event.WebApp.ANALYTICS.CUSTOM_DIMENSION);
        amplify.unsubscribeAll(z.event.WebApp.ANALYTICS.EVENT);
        this.tag_event(z.tracking.EventName.TRACKING.OPT_OUT);
        this._disable_localytics();
      }
      this._disable_error_reporting();
    }
  }

  _has_permission() {
    if (this.properties) {
      return this.properties.settings.privacy.improve_wire;
    }
    return false;
  }

  _subscribe_to_events() {
    amplify.subscribe(z.event.WebApp.ANALYTICS.CLOSE_SESSION, this.close_session.bind(this));
    amplify.subscribe(z.event.WebApp.ANALYTICS.CUSTOM_DIMENSION, this.set_custom_dimension.bind(this));
    amplify.subscribe(z.event.WebApp.ANALYTICS.EVENT, this.tag_event.bind(this));
    amplify.subscribe(z.event.WebApp.ANALYTICS.START_SESSION, this.start_session.bind(this));
  }

  _unsubscribe_from_events() {
    amplify.unsubscribeAll(z.event.WebApp.ANALYTICS.CLOSE_SESSION);
    amplify.unsubscribeAll(z.event.WebApp.ANALYTICS.CUSTOM_DIMENSION);
    amplify.unsubscribeAll(z.event.WebApp.ANALYTICS.EVENT);
    amplify.unsubscribeAll(z.event.WebApp.ANALYTICS.START_SESSION);
  }


  //##############################################################################
  // Localytics
  //##############################################################################

  close_session() {
    if (this.localytics && this._has_permission()) {
      this.logger.info('Closing Localytics session');

      if (this.session_interval) {
        window.clearInterval(this.session_interval);
        this.session_interval = undefined;
      }

      this.localytics('upload');
      this.localytics('close');
    }
  }

  set_custom_dimension(custom_dimension, value) {
    if (this.localytics) {
      this.logger.info(`Set Localytics custom dimension '${custom_dimension}' to value '${value}'`);
      this.localytics('setCustomDimension', custom_dimension, value);
    }
  }

  start_session() {
    if (this._has_permission() && !this.session_interval) {
      if (!this.localytics) {
        this._init_localytics();
      }

      this.logger.info('Starting new Localytics session');
      this.localytics('open');
      this.localytics('upload');
      this.session_interval = window.setInterval(this.upload_session, EventTrackingRepository.CONFIG.LOCALYTICS.SESSION_INTERVAL);
    }
  }

  tag_event(event_name, attributes) {
    if (this.localytics) {
      if (attributes) {
        this.logger.info(`Localytics event '${event_name}' with attributes: ${JSON.stringify(attributes)}`);
      } else {
        this.logger.info(`Localytics event '${event_name}' without attributes`);
      }

      this.localytics('tagEvent', event_name, attributes);
    }
  }

  upload_session() {
    if (this.localytics) {
      this.localytics('upload');
    }
  }

  _disable_localytics() {
    if (this.localytics) {
      this.localytics('close');
      window.ll = undefined;
      this.localytics = undefined;
      this.logger.debug('Localytics reporting was disabled due to user preferences');
    }
  }

  // @see http://docs.localytics.com/#Dev/Integrate/web-options.html
  _init_localytics() {
    let element_node;
    const options = {
      appVersion: z.util.Environment.version(),
      customDimensions: [z.tracking.helpers.get_platform()],
    };

    this.localytics = function() {
      /* eslint-disable id-length */
      this.localytics.t = new Date();
      this.localytics.q = this.localytics.q || [];
      this.localytics.q.push(arguments);
      /* eslint-enable id-length */
    };

    window.ll = this.localytics;
    window.LocalyticsGlobal = 'll';

    const script_element = document.createElement('script');
    script_element.src = 'https://web.localytics.com/v3/localytics.min.js';

    (element_node = document.getElementsByTagName('script')[0]).parentNode.insertBefore(script_element, element_node);

    this.localytics('init', EventTrackingRepository.CONFIG.LOCALYTICS.APP_KEY, options);
    this.logger.debug('Localytics reporting is enabled');
  }

  _localytics_disabled() {
    if (!z.util.get_url_parameter(z.auth.URLParameter.LOCALYTICS)) {
      for (const domain of EventTrackingRepository.CONFIG.LOCALYTICS.DISABLED_DOMAINS) {
        if (z.util.StringUtil.includes(window.location.hostname, domain)) {
          this.logger.debug('Localytics reporting is disabled due to domain');

          return true;
        }
      }
    }

    return false;
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
    if (time_since_last_report > EventTrackingRepository.CONFIG.ERROR_REPORTING_THRESHOLD) {
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
    Raygun.detach();
    Raygun.init(EventTrackingRepository.CONFIG.RAYGUN.API_KEY, {disableErrorTracking: true});
    this._detach_promise_rejection_handler();
  }

  _enable_error_reporting() {
    this.logger.debug('Enabling Raygun error reporting');
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

    Raygun.init(EventTrackingRepository.CONFIG.RAYGUN.API_KEY, options).attach();

    /*
    Adding a version to the Raygun reports to identify which version of the Wire ran into the issue.
    @note We cannot use our own version string as it has to be in a certain format
    @see https://github.com/MindscapeHQ/raygun4js#version-filtering
    */
    if (!z.util.Environment.frontend.is_localhost()) {
      Raygun.setVersion(z.util.Environment.version(false));
    }
    if (z.util.Environment.electron) {
      Raygun.withCustomData({electron_version: z.util.Environment.version(true)});
    }
    Raygun.onBeforeSend(this._check_error_payload.bind(this));
    this._attach_promise_rejection_handler();
  }
};
