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

import {Logger, getLogger} from 'Util/Logger';
import {loadValue} from 'Util/StorageUtil';
import {TIME_IN_MILLIS} from 'Util/TimeUtil';
import {appendParameter} from 'Util/UrlUtil';

import {AuthRepository} from '../auth/AuthRepository';
import {BackendClient} from '../service/BackendClient';
import {StorageKey} from '../storage/StorageKey';
import {WarningsViewModel} from '../view_model/WarningsViewModel';
import {WebAppEvents} from './WebApp';

enum CHANGE_TRIGGER {
  CLEANUP = 'CHANGE_TRIGGER.CLEANUP',
  CLOSE = 'CHANGE_TRIGGER.CLOSE',
  ERROR = 'CHANGE_TRIGGER.ERROR',
  LOGOUT = 'CHANGE_TRIGGER.LOGOUT',
  OFFLINE = 'CHANGE_TRIGGER.OFFLINE',
  ONLINE = 'CHANGE_TRIGGER.ONLINE',
  PAGE_NAVIGATION = 'CHANGE_TRIGGER.PAGE_NAVIGATION',
  PING_INTERVAL = 'CHANGE_TRIGGER.PING_INTERVAL',
  READY_STATE = 'CHANGE_TRIGGER.READY_STATE',
  WARNING_BAR = 'CHANGE_TRIGGER.WARNING_BAR',
}

export type OnNotificationCallback = (data: string) => void;

export class WebSocketService {
  private readonly backendClient: BackendClient;
  private readonly clientId?: string;
  private readonly logger: Logger;
  private connectionUrl: string;
  private hasAlreadySentUnansweredPing: boolean;
  private onNotification?: OnNotificationCallback;
  private pendingReconnectTrigger?: CHANGE_TRIGGER;
  private pingIntervalId?: number;
  private reconnectCount: number;
  private reconnectTimeoutId?: number;
  private socket: WebSocket;

  static get CHANGE_TRIGGER(): typeof CHANGE_TRIGGER {
    return CHANGE_TRIGGER;
  }

  // tslint:disable-next-line:typedef
  static get CONFIG() {
    return {
      PING_INTERVAL: TIME_IN_MILLIS.SECOND * 5,
      RECONNECT_INTERVAL: TIME_IN_MILLIS.SECOND * 15,
    };
  }

  constructor(backendClient: BackendClient) {
    this.backendClient = backendClient;
    this.logger = getLogger('WebSocketService');

    this.clientId = undefined;
    this.connectionUrl = '';
    this.socket = undefined;

    this.onNotification = undefined;

    this.pingIntervalId = undefined;
    this.hasAlreadySentUnansweredPing = false;

    this.reconnectTimeoutId = undefined;
    this.reconnectCount = 0;

    this.pendingReconnectTrigger = undefined;

    amplify.subscribe(WebAppEvents.CONNECTION.ACCESS_TOKEN.RENEWED, this.pendingReconnect.bind(this));
  }

  /**
   * Establish the WebSocket connection.
   * @param onNotification Function to be called on incoming notifications
   * @returns Resolves once the WebSocket connects
   */
  connect(onNotification: OnNotificationCallback): Promise<void> {
    this.onNotification = onNotification;

    return new Promise(resolve => {
      this.connectionUrl = `${this.backendClient.webSocketUrl}/await?access_token=${this.backendClient.accessToken}`;
      if (this.clientId) {
        this.connectionUrl = appendParameter(this.connectionUrl, `client=${this.clientId}`);
      }

      const wrongSocketType = typeof this.socket === 'object';
      if (wrongSocketType) {
        this.reset(CHANGE_TRIGGER.CLEANUP);
      }

      this.socket = new WebSocket(this.connectionUrl);
      this.socket.binaryType = 'blob';

      // http://stackoverflow.com/a/27828483/451634
      delete (this.socket as any).URL;

      this.socket.onopen = () => {
        this.logger.info(`Connected WebSocket to: ${this.backendClient.webSocketUrl}/await`);
        this.pingIntervalId = window.setInterval(this.sendPing, WebSocketService.CONFIG.PING_INTERVAL);
        resolve();
      };

      this.socket.onerror = event => {
        this.logger.error('WebSocket connection error.', event);
        this.reset(CHANGE_TRIGGER.ERROR, true);
      };

      this.socket.onclose = event => {
        this.logger.warn('Closed WebSocket connection', event);
        this.reset(CHANGE_TRIGGER.CLOSE, true);
      };

      this.socket.onmessage = event => {
        if (event.data instanceof Blob) {
          const blobReader = new FileReader();
          blobReader.onload = () => {
            if (blobReader.result === 'pong') {
              this.hasAlreadySentUnansweredPing = false;
            } else {
              this.onNotification(JSON.parse(blobReader.result.toString()));
            }
          };
          blobReader.readAsText(event.data);
        }
      };
    });
  }

  /**
   * Reconnect WebSocket after access token has been refreshed.
   */
  pendingReconnect(): void {
    if (this.pendingReconnectTrigger) {
      this.logger.info(`Reconnecting WebSocket (TRIGGER: ${this.pendingReconnectTrigger}) after access token refresh`);
      this.reconnect(this.pendingReconnectTrigger);
      this.pendingReconnectTrigger = undefined;
    }
  }

  /**
   * Try to re-establish the WebSocket connection.
   */
  reconnect(trigger: CHANGE_TRIGGER): Promise<void> {
    if (!loadValue(StorageKey.AUTH.ACCESS_TOKEN.EXPIRATION)) {
      this.logger.info(`Access token has to be refreshed before reconnecting the WebSocket triggered by '${trigger}'`);
      this.pendingReconnectTrigger = trigger;
      amplify.publish(WebAppEvents.CONNECTION.ACCESS_TOKEN.RENEW, AuthRepository.ACCESS_TOKEN_TRIGGER.WEB_SOCKET);
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
    return Promise.resolve();
  }

  /**
   * Behavior when WebSocket connection is re-established after a connection drop.
   */
  reconnected(): void {
    amplify.publish(WebAppEvents.WARNING.DISMISS, WarningsViewModel.TYPE.CONNECTIVITY_RECONNECT);
    this.logger.warn('Re-established WebSocket connection.');
    amplify.publish(WebAppEvents.CONNECTION.ONLINE);
  }

  /**
   * Reset the WebSocket connection.
   * @param reconnect Re-establish the WebSocket connection
   */
  reset(trigger: CHANGE_TRIGGER, reconnect: boolean = false): void {
    if (this.socket?.onclose) {
      this.logger.info(`WebSocket reset triggered by '${trigger}'`);
      this.socket.onerror = undefined;
      this.socket.onclose = undefined;
      this.socket.close();
      window.clearInterval(this.pingIntervalId);
      window.clearTimeout(this.reconnectTimeoutId);
      this.hasAlreadySentUnansweredPing = false;
    }

    if (reconnect) {
      amplify.publish(WebAppEvents.WARNING.SHOW, WarningsViewModel.TYPE.CONNECTIVITY_RECONNECT);
      this.reconnect(trigger);
    }
  }

  sendPing = () => {
    const isReadyStateOpen = this.socket.readyState === 1;
    if (isReadyStateOpen) {
      if (this.hasAlreadySentUnansweredPing) {
        this.logger.warn('Ping interval check failed');
        return this.reconnect(CHANGE_TRIGGER.PING_INTERVAL);
      }
      this.hasAlreadySentUnansweredPing = true;
      return this.socket.send('ping');
    }

    this.logger.warn(`WebSocket connection is closed. Current ready state: ${this.socket.readyState}`);
    this.reconnect(CHANGE_TRIGGER.READY_STATE);
  };
}
