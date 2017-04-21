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
window.z.event = z.event || {};

const WEB_SOCKET_SERVICE_CONFIG = {
  PING_INTERVAL: 30000,
  PING_INTERVAL_THRESHOLD: 2000,
  RECONNECT_INTERVAL: 15000,
};

z.event.WebSocketService = class WebSocketService {
  static get CHANGE_TRIGGER() {
    return {
      CLEANUP: 'z.event.WebSocketService.CHANGE_TRIGGER.CLEANUP',
      CLOSE: 'z.event.WebSocketService.CHANGE_TRIGGER.CLOSE',
      ERROR: 'z.event.WebSocketService.CHANGE_TRIGGER.ERROR',
      LOGOUT: 'z.event.WebSocketService.CHANGE_TRIGGER.LOGOUT',
      OFFLINE: 'z.event.WebSocketService.CHANGE_TRIGGER.OFFLINE',
      ONLINE: 'z.event.WebSocketService.CHANGE_TRIGGER.ONLINE',
      PAGE_NAVIGATION: 'z.event.WebSocketService.CHANGE_TRIGGER.PAGE_NAVIGATION',
      PING_INTERVAL: 'z.event.WebSocketService.CHANGE_TRIGGER.PING_INTERVAL',
      READY_STATE: 'z.event.WebSocketService.CHANGE_TRIGGER.READY_STATE',
      WARNING_BAR: 'z.event.WebSocketService.CHANGE_TRIGGER.WARNING_BAR',
    };
  }


  /**
   * Construct a new WebSocket Service.
   * @param {z.service.Client} client - Client for the API calls
   * @returns {WebSocketService} WebSocket Service to manage the WebSocket connection to the backend
   */
  constructor(client) {
    this.client = client;
    this.logger = new z.util.Logger('z.event.WebSocketService', z.config.LOGGER.OPTIONS);

    this.client_id = undefined;
    this.connection_url = '';
    this.socket = undefined;

    this.on_notification = undefined;

    this.ping_interval_id = undefined;
    this.last_ping_time = undefined;

    this.reconnect_timeout_id = undefined;
    this.reconnect_count = 0;

    return this;
  }

  /**
   * Establish the WebSocket connection.
   * @param {Function} on_notification - Function to be called on incoming notifications
   * @returns {Promise} Resolves once the WebSocket connects
   */
  connect(on_notification) {
    return new Promise((resolve, reject) => {
      this.on_notification = on_notification;
      this.connection_url = `${this.client.web_socket_url}/await?access_token=${this.client.access_token}`;
      if (this.client_id) {
        this.connection_url = z.util.append_url_parameter(this.connection_url, `client=${this.client_id}`);
      }

      if (typeof this.socket === 'object') {
        this.reset(z.event.WebSocketService.CHANGE_TRIGGER.CLEANUP);
      }

      this.socket = new WebSocket(this.connection_url);
      this.socket.binaryType = 'blob';

      // http://stackoverflow.com/a/27828483/451634
      delete this.socket.URL;

      this.socket.onopen = () => {
        this.logger.info(`Connected WebSocket to: ${this.client.web_socket_url}/await`);
        this.ping_interval_id = window.setInterval(this.send_ping.bind(this), WEB_SOCKET_SERVICE_CONFIG.PING_INTERVAL);
        resolve();
      };

      this.socket.onerror = (event) => {
        this.logger.error('WebSocket connection error.', event);
        this.reset(z.event.WebSocketService.CHANGE_TRIGGER.ERROR, true);
      };

      this.socket.onclose = (event) => {
        this.logger.warn('Closed WebSocket connection', event);
        this.reset(z.event.WebSocketService.CHANGE_TRIGGER.CLOSE, true);
      };

      this.socket.onmessage = function(event) {
        if (event.data instanceof Blob) {
          const blob_reader = new FileReader();
          blob_reader.onload = function() {
            on_notification(JSON.parse(blob_reader.result));
          };
          return blob_reader.readAsText(event.data);
        }
      };
    });
  }

  /**
   * Reconnect WebSocket after access token has been refreshed.
   * @param {z.event.WebSocketService.CHANGE_TRIGGER} trigger - Trigger of the reconnect
   * @returns {undefined} No return value
   */
  pending_reconnect(trigger) {
    amplify.unsubscribeAll(z.event.WebApp.CONNECTION.ACCESS_TOKEN.RENEWED);
    this.logger.info(`Executing pending WebSocket reconnect triggered by '${trigger}' after access token refresh`);
    this.reconnect(trigger);
  }

  /**
   * Try to re-establish the WebSocket connection.
   * @param {z.event.WebSocketService.CHANGE_TRIGGER} trigger - Trigger of the reconnect
   * @returns {undefined} No return value
   */
  reconnect(trigger) {
    if (!z.util.StorageUtil.get_value(z.storage.StorageKey.AUTH.ACCESS_TOKEN.EXPIRATION)) {
      this.logger.info(`Access token has to be refreshed before reconnecting the WebSocket triggered by '${trigger}'`);
      amplify.unsubscribeAll(z.event.WebApp.CONNECTION.ACCESS_TOKEN.RENEWED);
      amplify.subscribe(z.event.WebApp.CONNECTION.ACCESS_TOKEN.RENEWED, this.pending_reconnect(trigger)).bind(this);
      return amplify.publish(z.event.WebApp.CONNECTION.ACCESS_TOKEN.RENEW, 'Attempted WebSocket reconnect');
    }

    this.reconnect_count++;
    const reconnect = () => {
      this.logger.info(`Trying to re-establish WebSocket connection. Try #${this.reconnect_count}`);
      return this.connect(this.on_notification)
      .then(() => {
        this.reconnect_count = 0;
        this.logger.info(`Reconnect to WebSocket triggered by '${trigger}'`);
        return this.reconnected();
      });
    };

    if (this.reconnect_count === 1) {
      return reconnect();
    }
    this.reconnect_timeout_id = window.setTimeout(() => reconnect(), WEB_SOCKET_SERVICE_CONFIG.RECONNECT_INTERVAL);
  }

  /**
   * Behavior when WebSocket connection is re-established after a connection drop.
   * @returns {undefined} No return value
   */
  reconnected() {
    amplify.publish(z.event.WebApp.WARNING.DISMISS, z.ViewModel.WarningType.CONNECTIVITY_RECONNECT);
    this.logger.warn('Re-established WebSocket connection. Recovering from Notification Stream...');
    amplify.publish(z.event.WebApp.CONNECTION.ONLINE);
  }

  /**
   * Reset the WebSocket connection.
   *
   * @param {z.event.WebSocketService.CHANGE_TRIGGER} trigger - Trigger of the reset
   * @param {boolean} [reconnect=false] - Re-establish the WebSocket connection
   * @returns {undefined} No return value
   */
  reset(trigger, reconnect = false) {
    if (this.socket && this.socket.onclose) {
      this.logger.info(`WebSocket reset triggered by '${trigger}'`);
      this.socket.onerror = undefined;
      this.socket.onclose = undefined;
      this.socket.close();
      window.clearInterval(this.ping_interval_id);
      window.clearTimeout(this.reconnect_timeout_id);
    }

    if (reconnect) {
      amplify.publish(z.event.WebApp.WARNING.SHOW, z.ViewModel.WarningType.CONNECTIVITY_RECONNECT);
      this.reconnect(trigger);
    }
  }

  /**
   * Send a WebSocket ping.
   * @returns {undefined} No return value
   */
  send_ping() {
    if (this.socket.readyState === 1) {
      const current_time = Date.now();
      if (!this.last_ping_time) {
        this.last_ping_time = current_time;
      }
      const ping_interval_diff = this.last_ping_time - current_time;

      if (ping_interval_diff > (WEB_SOCKET_SERVICE_CONFIG.PING_INTERVAL + WEB_SOCKET_SERVICE_CONFIG.PING_INTERVAL_THRESHOLD)) {
        this.logger.warn('Ping interval check failed');
        return this.reconnect(z.event.WebSocketService.CHANGE_TRIGGER.PING_INTERVAL);
      }
      this.logger.info('Sending ping to WebSocket');
      return this.socket.send('Wire is so much nicer with internet!');
    }

    this.logger.warn(`WebSocket connection is closed. Current ready state: ${this.socket.readyState}`);
    this.reconnect(z.event.WebSocketService.CHANGE_TRIGGER.READY_STATE);
  }
};
