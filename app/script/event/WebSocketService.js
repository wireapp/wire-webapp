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
window.z.event = z.event || {};

z.event.WebSocketService = class WebSocketService {
  static get CHANGE_TRIGGER() {
    return {
      CLEANUP: 'WebSocketService.CHANGE_TRIGGER.CLEANUP',
      CLOSE: 'WebSocketService.CHANGE_TRIGGER.CLOSE',
      ERROR: 'WebSocketService.CHANGE_TRIGGER.ERROR',
      LOGOUT: 'WebSocketService.CHANGE_TRIGGER.LOGOUT',
      LONG_INACTIVITY: 'WebSocketService.CHANGE_TRIGGER.LONG_INACTIVITY',
      OFFLINE: 'WebSocketService.CHANGE_TRIGGER.OFFLINE',
      ONLINE: 'WebSocketService.CHANGE_TRIGGER.ONLINE',
      PAGE_NAVIGATION: 'WebSocketService.CHANGE_TRIGGER.PAGE_NAVIGATION',
      PING_INTERVAL: 'WebSocketService.CHANGE_TRIGGER.PING_INTERVAL',
      READY_STATE: 'WebSocketService.CHANGE_TRIGGER.READY_STATE',
      WARNING_BAR: 'WebSocketService.CHANGE_TRIGGER.WARNING_BAR',
    };
  }

  static get CONFIG() {
    return {
      PING_INTERVAL: z.util.TimeUtil.UNITS_IN_MILLIS.SECOND * 30,
      PING_INTERVAL_THRESHOLD: z.util.TimeUtil.UNITS_IN_MILLIS.SECOND * 2,
      RECONNECT_INTERVAL: z.util.TimeUtil.UNITS_IN_MILLIS.SECOND * 15,
    };
  }

  /**
   * Construct a new WebSocket Service.
   * @param {z.service.BackendClient} client - Client for the API calls
   */
  constructor(client) {
    this.sendPing = this.sendPing.bind(this);

    this.client = client;
    this.logger = new z.util.Logger('z.event.WebSocketService', z.config.LOGGER.OPTIONS);

    this.clientId = undefined;
    this.connectionUrl = '';
    this.socket = undefined;

    this.onNotification = undefined;

    this.pingIntervalId = undefined;
    this.lastPingTime = undefined;

    this.reconnectTimeoutId = undefined;
    this.reconnectCount = 0;

    this.pendingReconnectTrigger = undefined;

    amplify.subscribe(z.event.WebApp.CONNECTION.ACCESS_TOKEN.RENEWED, this.pendingReconnect.bind(this));
  }

  /**
   * Establish the WebSocket connection.
   * @param {Function} onNotification - Function to be called on incoming notifications
   * @returns {Promise} Resolves once the WebSocket connects
   */
  connect(onNotification) {
    this.onNotification = onNotification;

    return new Promise((resolve, reject) => {
      this.connectionUrl = `${this.client.webSocketUrl}/await?access_token=${this.client.accessToken}`;
      if (this.clientId) {
        this.connectionUrl = z.util.URLUtil.appendParameter(this.connectionUrl, `client=${this.clientId}`);
      }

      const wrongSocketType = typeof this.socket === 'object';
      if (wrongSocketType) {
        this.reset(WebSocketService.CHANGE_TRIGGER.CLEANUP);
      }

      this.socket = new WebSocket(this.connectionUrl);
      this.socket.binaryType = 'blob';

      // http://stackoverflow.com/a/27828483/451634
      delete this.socket.URL;

      this.socket.onopen = () => {
        this.logger.info(`Connected WebSocket to: ${this.client.webSocketUrl}/await`);
        this.pingIntervalId = window.setInterval(this.sendPing, WebSocketService.CONFIG.PING_INTERVAL);
        resolve();
      };

      this.socket.onerror = event => {
        this.logger.error('WebSocket connection error.', event);
        this.reset(WebSocketService.CHANGE_TRIGGER.ERROR, true);
      };

      this.socket.onclose = event => {
        this.logger.warn('Closed WebSocket connection', event);
        this.reset(WebSocketService.CHANGE_TRIGGER.CLOSE, true);
      };

      this.socket.onmessage = event => {
        if (this._pingHasExperiencedSuspiciousInactivity()) {
          const secondsSinceLastPing = (Date.now() - this.lastPingTime) / z.util.TimeUtil.UNITS_IN_MILLIS.SECOND;
          this.logger.warn(`Message received but ping was inactive for "${secondsSinceLastPing}" sec, reconnecting.`);
          return this.reconnect(WebSocketService.CHANGE_TRIGGER.LONG_INACTIVITY);
        }
        if (event.data instanceof Blob) {
          const blobReader = new FileReader();
          blobReader.onload = () => onNotification(JSON.parse(blobReader.result));
          blobReader.readAsText(event.data);
        }
      };
    });
  }

  /**
   * Reconnect WebSocket after access token has been refreshed.
   * @returns {undefined} No return value
   */
  pendingReconnect() {
    if (this.pendingReconnectTrigger) {
      this.logger.info(`Reconnecting WebSocket (TRIGGER: ${this.pendingReconnectTrigger}) after access token refresh`);
      this.reconnect(this.pendingReconnectTrigger);
      this.pendingReconnectTrigger = undefined;
    }
  }

  /**
   * Try to re-establish the WebSocket connection.
   * @param {WebSocketService.CHANGE_TRIGGER} trigger - Trigger of the reconnect
   * @returns {undefined} No return value
   */
  reconnect(trigger) {
    if (!z.util.StorageUtil.getValue(z.storage.StorageKey.AUTH.ACCESS_TOKEN.EXPIRATION)) {
      this.logger.info(`Access token has to be refreshed before reconnecting the WebSocket triggered by '${trigger}'`);
      this.pendingReconnectTrigger = trigger;
      return amplify.publish(
        z.event.WebApp.CONNECTION.ACCESS_TOKEN.RENEW,
        z.auth.AuthRepository.ACCESS_TOKEN_TRIGGER.WEB_SOCKET
      );
    }

    this.reconnectCount++;
    const reconnect = () => {
      this.logger.info(`Trying to re-establish WebSocket connection. Try #${this.reconnectCount}`);
      return this.connect(this.onNotification).then(() => {
        this.reconnectCount = 0;
        this.logger.info(`Reconnect to WebSocket triggered by '${trigger}'`);
        return this.reconnected();
      });
    };

    const isFirstReconnectAttempt = this.reconnectCount === 1;
    if (isFirstReconnectAttempt) {
      return reconnect();
    }
    this.reconnectTimeoutId = window.setTimeout(() => reconnect(), WebSocketService.CONFIG.RECONNECT_INTERVAL);
  }

  /**
   * Behavior when WebSocket connection is re-established after a connection drop.
   * @returns {undefined} No return value
   */
  reconnected() {
    amplify.publish(z.event.WebApp.WARNING.DISMISS, z.viewModel.WarningsViewModel.TYPE.CONNECTIVITY_RECONNECT);
    this.logger.warn('Re-established WebSocket connection. Recovering from Notification Stream...');
    amplify.publish(z.event.WebApp.CONNECTION.ONLINE);
  }

  /**
   * Reset the WebSocket connection.
   *
   * @param {WebSocketService.CHANGE_TRIGGER} trigger - Trigger of the reset
   * @param {boolean} [reconnect=false] - Re-establish the WebSocket connection
   * @returns {undefined} No return value
   */
  reset(trigger, reconnect = false) {
    if (this.socket && this.socket.onclose) {
      this.logger.info(`WebSocket reset triggered by '${trigger}'`);
      this.socket.onerror = undefined;
      this.socket.onclose = undefined;
      this.socket.close();
      window.clearInterval(this.pingIntervalId);
      window.clearTimeout(this.reconnectTimeoutId);
      this.lastPingTime = undefined;
    }

    if (reconnect) {
      amplify.publish(z.event.WebApp.WARNING.SHOW, z.viewModel.WarningsViewModel.TYPE.CONNECTIVITY_RECONNECT);
      this.reconnect(trigger);
    }
  }

  /**
   * Send a WebSocket ping.
   * @returns {undefined} No return value
   */
  sendPing() {
    const isReadyStateOpen = this.socket.readyState === 1;
    if (isReadyStateOpen) {
      if (this._pingHasExperiencedSuspiciousInactivity()) {
        this.logger.warn('Ping interval check failed');
        return this.reconnect(WebSocketService.CHANGE_TRIGGER.PING_INTERVAL);
      }
      this.logger.info('Sending ping to WebSocket');
      this.lastPingTime = Date.now();
      return this.socket.send('Wire is so much nicer with internet!');
    }

    this.logger.warn(`WebSocket connection is closed. Current ready state: ${this.socket.readyState}`);
    this.reconnect(WebSocketService.CHANGE_TRIGGER.READY_STATE);
  }

  /**
   * Returns true if the gap between the last ping and the current time is too big.
   *
   * @returns {boolean} Was the last ping too long ago
   */
  _pingHasExperiencedSuspiciousInactivity() {
    const currentTime = Date.now();
    const lastPingTime = this.lastPingTime || currentTime;
    const pingIntervalDifference = currentTime - lastPingTime;

    const maxDifference = WebSocketService.CONFIG.PING_INTERVAL + WebSocketService.CONFIG.PING_INTERVAL_THRESHOLD;
    return pingIntervalDifference > maxDifference;
  }
};
