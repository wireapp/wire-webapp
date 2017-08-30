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
window.z.service = z.service || {};

z.service.BackendClient = class BackendClient {
  static get CONFIG() {
    return {
      CONNECTIVITY_CHECK: {
        INITIAL_TIMEOUT: 0,
        RECHECK_TIMEOUT: 2000,
        REQUEST_TIMEOUT: 500,
      },
    };
  }

  static get CONNECTIVITY_CHECK_TRIGGER() {
    return {
      ACCESS_TOKEN_REFRESH: 'BackendClient.CONNECTIVITY_CHECK_TRIGGER.ACCESS_TOKEN_REFRESH',
      ACCESS_TOKEN_RETRIEVAL: 'BackendClient.CONNECTIVITY_CHECK_TRIGGER.ACCESS_TOKEN_RETRIEVAL',
      APP_INIT_RELOAD: '.BackendClient.CONNECTIVITY_CHECK_TRIGGER.APP_INIT_RELOAD',
      CONNECTION_REGAINED: 'BackendClient.CONNECTIVITY_CHECK_TRIGGER.CONNECTION_REGAINED',
      LOGIN_REDIRECT: 'BackendClient.CONNECTIVITY_CHECK_TRIGGER.LOGIN_REDIRECT',
      REQUEST_FAILURE: 'BackendClient.CONNECTIVITY_CHECK_TRIGGER.REQUEST_FAILURE',
      UNKNOWN: 'BackendClient.CONNECTIVITY_CHECK_TRIGGER.UNKNOWN',
    };
  }

  static get IGNORED_BACKEND_ERRORS() {
    return [
      z.service.BackendClientError.STATUS_CODE.BAD_GATEWAY,
      z.service.BackendClientError.STATUS_CODE.CONFLICT,
      z.service.BackendClientError.STATUS_CODE.CONNECTIVITY_PROBLEM,
      z.service.BackendClientError.STATUS_CODE.INTERNAL_SERVER_ERROR,
      z.service.BackendClientError.STATUS_CODE.NOT_FOUND,
      z.service.BackendClientError.STATUS_CODE.PRECONDITION_FAILED,
      z.service.BackendClientError.STATUS_CODE.REQUEST_TIMEOUT,
      z.service.BackendClientError.STATUS_CODE.REQUEST_TOO_LARGE,
      z.service.BackendClientError.STATUS_CODE.TOO_MANY_REQUESTS,
    ];
  }

  static get IGNORED_BACKEND_LABELS() {
    return [
      z.service.BackendClientError.LABEL.INVALID_CREDENTIALS,
      z.service.BackendClientError.LABEL.PASSWORD_EXISTS,
      z.service.BackendClientError.LABEL.TOO_MANY_CLIENTS,
      z.service.BackendClientError.LABEL.TOO_MANY_MEMBERS,
      z.service.BackendClientError.LABEL.UNKNOWN_CLIENT,
    ];
  }

  /**
   * Construct a new client.
   *
   * @param {Object} settings - Settings for different backend environments
   * @param {string} settings.environment - Backend environment used
   * @param {string} settings.rest_url - Backend REST URL
   * @param {string} settings.web_socket_url - Backend WebSocket URL
  */
  constructor(settings) {
    this.logger = new z.util.Logger('z.service.BackendClient', z.config.LOGGER.OPTIONS);

    z.util.Environment.backend.current = settings.environment;
    this.rest_url = settings.rest_url;
    this.web_socket_url = settings.web_socket_url;

    this.connectivity_timeout = undefined;
    this.connectivity_queue = new z.util.PromiseQueue({name: 'BackendClient.Connectivity'});

    this.request_queue = new z.util.PromiseQueue({name: 'BackendClient.Request'});
    this.request_queue_blocked_state = ko.observable(z.service.RequestQueueBlockedState.NONE);

    this.access_token = '';
    this.access_token_type = '';

    this.number_of_requests = ko.observable(0);
    this.number_of_requests.subscribe((new_value) => amplify.publish(z.event.WebApp.TELEMETRY.BACKEND_REQUESTS, new_value));

    // Only allow JSON response by default
    $.ajaxSetup({
      contents: {javascript: false},
      dataType: 'json',
    });

    // http://stackoverflow.com/a/18996758/451634
    $.ajaxPrefilter((options, originalOptions, jqXHR) => {
      jqXHR.wire = {
        original_request_options: originalOptions,
        request_id: this.number_of_requests(),
        requested: new Date(),
      };
    });
  }

  /**
   * Create a request URL.
   * @param {string} path - API endpoint path to be suffixed to REST API environment
   * @returns {string} REST API endpoint URL
   */
  create_url(path) {
    z.util.ValidationUtil.is_valid_api_path(path);
    return `${this.rest_url}${path}`;
  }

  /**
   * Request backend status.
   * @returns {$.Promise} jQuery AJAX promise
   */
  status() {
    return $.ajax({
      timeout: BackendClient.CONFIG.CONNECTIVITY_CHECK.REQUEST_TIMEOUT,
      type: 'HEAD',
      url: this.create_url('/self'),
    });
  }

  /**
   * Delay a function call until backend connectivity is guaranteed.
   * @param {BackendClient.CONNECTIVITY_CHECK_TRIGGER} [source=BackendClient.CONNECTIVITY_CHECK_TRIGGER.UNKNOWN] - Trigger that requested connectivity check
   * @returns {Promise} Resolves once the connectivity is verified
   */
  execute_on_connectivity(source = BackendClient.CONNECTIVITY_CHECK_TRIGGER.UNKNOWN) {
    this.logger.info(`Connectivity check requested by '${source}'`);

    const _reset_queue = () => {
      if (this.connectivity_timeout) {
        window.clearTimeout(this.connectivity_timeout);
        this.connectivity_queue.pause(false);
      }
      this.connectivity_timeout = undefined;
    };

    const _check_status = () => {
      return this.status()
        .done((jqXHR) => {
          this.logger.info('Connectivity verified', jqXHR);
          _reset_queue();
        })
        .fail((jqXHR) => {
          if (jqXHR.readyState === 4) {
            this.logger.info(`Connectivity verified by server error '${jqXHR.status}'`, jqXHR);
            _reset_queue();
          } else {
            this.logger.warn('Connectivity could not be verified... retrying');
            this.connectivity_queue.pause();
            this.connectivity_timeout = window.setTimeout(_check_status, BackendClient.CONFIG.CONNECTIVITY_CHECK.RECHECK_TIMEOUT);
          }
        });
    };

    this.connectivity_queue.pause();
    const queued_promise = this.connectivity_queue.push(() => Promise.resolve());
    if (!this.connectivity_timeout) {
      this.connectivity_timeout = window.setTimeout(_check_status, BackendClient.CONFIG.CONNECTIVITY_CHECK.INITIAL_TIMEOUT);
    }

    return queued_promise;
  }

  /**
   * Execute queued requests.
   * @returns {undefined} No return value
   */
  execute_request_queue() {
    if (this.access_token && this.request_queue.get_length()) {
      this.logger.info(`Executing '${this.request_queue.get_length()}' queued requests`);
      this.request_queue.pause(false);
    }
  }

  /**
   * Deprecated: Send jQuery AJAX request with compressed JSON body.
   *
   * @note ContentType will be overwritten with 'application/json; charset=utf-8'
   * @see send_request for valid parameters
   *
   * @param {Object} config - AJAX request configuration
   * @returns {Promise} Resolves when the request has been executed
   */
  send_json(config) {
    return this.send_request(config);
  }

  /**
   * Send or queue jQuery AJAX request.
   * @see http://api.jquery.com/jquery.ajax/#jQuery-ajax-settings
   *
   * @param {Object} config - AJAX request configuration
   * @param {string} config.contentType - Request content type
   * @param {Object} config.data - Request data payload
   * @param {Object} config.headers - Request headers
   * @param {boolean} config.processData - Process data before sending
   * @param {number} config.timeout - Request timeout
   * @param {string} config.type - Request type
   * @param {string} config.url - Request URL
   * @param {boolean} config.withCredentials - Request send with credentials
   * @returns {Promise} Resolves when the request has been executed
   */
  send_request(config) {
    if (this.request_queue_blocked_state() !== z.service.RequestQueueBlockedState.NONE) {
      return this._push_to_request_queue(config, this.request_queue_blocked_state());
    }

    return this._send_request(config);
  }

  /**
   * Push a request to the queue
   *
   * @private
   * @param {Object} config - Configuration for the AJAX request
   * @param {string} reason - Reason for delayed execution of request
   * @returns {Promise} Resolved when the request has been executed
   */
  _push_to_request_queue(config, reason) {
    this.logger.info(`Adding '${config.type}' request to '${config.url}' to queue due to '${reason}'`, config);
    return this.request_queue.push(() => this._send_request(config));
  }

  /**
   * Send jQuery AJAX request.
   *
   * @private
   * @param {Object} config - Request configuration
   * @returns {Promise} Resolves when request has been executed
   */
  _send_request(config) {
    if (this.access_token) {
      config.headers = $.extend(config.headers || {}, {Authorization: `${this.access_token_type} ${this.access_token}`});
    }

    if (config.withCredentials) {
      config.xhrFields = {withCredentials: true};
    }

    this.number_of_requests(this.number_of_requests() + 1);

    return new Promise((resolve, reject) => {
      $.ajax({
        cache: config.cache,
        contentType: config.contentType,
        data: config.data,
        headers: config.headers,
        processData: config.processData,
        timeout: config.timeout,
        type: config.type,
        url: config.url,
        xhrFields: config.xhrFields,
      })
        .done((data, textStatus, {wire: wire_request}) => {
          const request_id = wire_request ? wire_request.request : 'ID not set';
          this.logger.debug(this.logger.levels.OFF, `Server response to '${config.type}' request '${config.url}' - '${request_id}':`, data);

          resolve(data);
        })
        .fail(({responseJSON: response, status: status_code, wire: wire_request}) => {
          switch (status_code) {
            case z.service.BackendClientError.STATUS_CODE.CONNECTIVITY_PROBLEM: {
              this.request_queue.pause();
              this.request_queue_blocked_state(z.service.RequestQueueBlockedState.CONNECTIVITY_PROBLEM);

              this._push_to_request_queue(config, this.request_queue_blocked_state())
                .then(resolve)
                .catch(reject);

              return this.execute_on_connectivity()
                .then(() => {
                  this.request_queue_blocked_state(z.service.RequestQueueBlockedState.NONE);
                  this.execute_request_queue();
                });
            }

            case z.service.BackendClientError.STATUS_CODE.FORBIDDEN: {
              if (response) {
                const error_label = response.label;
                const error_message = `Server request forbidden: ${error_label}`;

                if (BackendClient.IGNORED_BACKEND_LABELS.includes(error_label)) {
                  this.logger.warn(error_message);
                } else {
                  const request_id = wire_request ? wire_request.request_id : undefined;
                  const custom_data = {
                    endpoint: config.url,
                    request_id: request_id,
                  };

                  Raygun.send(new Error(error_message), custom_data);
                }
              }
              break;
            }

            case z.service.BackendClientError.STATUS_CODE.ACCEPTED:
            case z.service.BackendClientError.STATUS_CODE.CREATED:
            case z.service.BackendClientError.STATUS_CODE.NO_CONTENT:
            case z.service.BackendClientError.STATUS_CODE.OK: {
              // Prevent empty valid response from being rejected
              if (!response) {
                return resolve({});
              }
              break;
            }

            case z.service.BackendClientError.STATUS_CODE.UNAUTHORIZED: {
              this._push_to_request_queue(config, z.service.RequestQueueBlockedState.ACCESS_TOKEN_REFRESH)
                .then(resolve)
                .catch(reject);

              const trigger = z.auth.AuthRepository.ACCESS_TOKEN_TRIGGER.UNAUTHORIZED_REQUEST;
              return amplify.publish(z.event.WebApp.CONNECTION.ACCESS_TOKEN.RENEW, trigger);
            }

            default: {
              if (!BackendClient.IGNORED_BACKEND_ERRORS.includes(status_code)) {
                const request_id = wire_request ? wire_request.request_id : undefined;
                const custom_data = {
                  endpoint: config.url,
                  request_id: request_id,
                };

                Raygun.send(new Error(`Server request failed: ${status_code}`), custom_data);
              }
            }
          }

          return reject(response || new z.service.BackendClientError(status_code));
        });
    });
  }
};
