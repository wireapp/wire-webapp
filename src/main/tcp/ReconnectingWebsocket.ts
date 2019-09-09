/*
 * Wire
 * Copyright (C) 2019 Wire Swiss GmbH
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

import {TimeUtil} from '@wireapp/commons';
import logdown from 'logdown';
import NodeWebSocket = require('ws');

import RWS, {Options} from 'reconnecting-websocket';
import {CloseEvent, ErrorEvent, Event} from 'reconnecting-websocket/dist/events';
import * as buffer from '../shims/node/buffer';

export enum CloseEventCode {
  NORMAL_CLOSURE = 1000,
  GOING_AWAY = 1001,
  PROTOCOL_ERROR = 1002,
  UNSUPPORTED_DATA = 1003,
}

export enum WEBSOCKET_STATE {
  CONNECTING = 0,
  OPEN = 1,
  CLOSING = 2,
  CLOSED = 3,
}

export class ReconnectingWebsocket {
  private static readonly RECONNECTING_OPTIONS: Options = {
    WebSocket: typeof window !== 'undefined' ? WebSocket : NodeWebSocket,
    connectionTimeout: TimeUtil.TimeInMillis.SECOND * 4,
    debug: false,
    maxReconnectionDelay: TimeUtil.TimeInMillis.SECOND * 10,
    maxRetries: Infinity,
    minReconnectionDelay: TimeUtil.TimeInMillis.SECOND * 4,
    reconnectionDelayGrowFactor: 1.3,
  };

  private readonly logger: logdown.Logger;
  private socket?: RWS;

  private onOpen?: (event: Event) => void;
  private onMessage?: (data: string) => void;
  private onError?: (error: ErrorEvent) => void;
  private onClose?: (event: CloseEvent) => void;

  constructor(private readonly onReconnect: () => string) {
    this.logger = logdown('@wireapp/api-client/tcp/ReconnectingWebsocket', {
      logger: console,
      markdown: false,
    });
  }

  private readonly internalOnError = (error: ErrorEvent) => {
    this.logger.warn('WebSocket connection error', error);
    if (this.onError) {
      this.onError(error);
    }
  };

  private readonly internalOnMessage = (event: MessageEvent) => {
    this.logger.debug('Incoming message', event);

    const data = buffer.bufferToString(event.data);
    if (this.onMessage) {
      this.onMessage(data);
    }
  };

  private readonly internalOnOpen = (event: Event) => {
    this.logger.debug('WebSocket opened', event);
    if (this.socket) {
      this.socket.binaryType = 'arraybuffer';
    }
    if (this.onOpen) {
      this.onOpen(event);
    }
  };

  private readonly internalOnReconnect = (): string => {
    this.logger.debug('Connecting to WebSocket');
    return this.onReconnect();
  };

  private readonly internalOnClose = (event: CloseEvent) => {
    this.logger.debug('WebSocket closed', event);
    if (this.onClose) {
      this.onClose(event);
    }
  };

  public connect(): void {
    this.socket = this.getReconnectingWebsocket();

    this.socket.onmessage = this.internalOnMessage;
    this.socket.onerror = this.internalOnError;
    this.socket.onopen = this.internalOnOpen;
    this.socket.onclose = this.internalOnClose;
  }

  public send(message: any): void {
    if (this.socket) {
      this.socket.send(message);
    }
  }

  public getState(): WEBSOCKET_STATE {
    if (this.socket) {
      return this.socket.readyState;
    }
    return WEBSOCKET_STATE.CLOSED;
  }

  public disconnect(reason = 'Closed by client', keepClosed = true): void {
    if (this.socket) {
      this.logger.info(`Disconnecting from WebSocket (reason: "${reason}")`);
      // TODO: 'any' can be removed once this issue is resolved:
      // https://github.com/pladaria/reconnecting-websocket/issues/44
      (this.socket as any).close(CloseEventCode.NORMAL_CLOSURE, reason, {
        delay: 0,
        fastClose: true,
        keepClosed,
      });
    }
  }

  private getReconnectingWebsocket(): RWS {
    return new RWS(this.internalOnReconnect, undefined, ReconnectingWebsocket.RECONNECTING_OPTIONS);
  }

  public setOnOpen(onOpen: (event: Event) => void): void {
    this.onOpen = onOpen;
  }

  public setOnMessage(onMessage: (data: string) => void): void {
    this.onMessage = onMessage;
  }

  public setOnError(onError: (error: ErrorEvent) => void): void {
    this.onError = onError;
  }

  public setOnClose(onClose: (event: CloseEvent) => void): void {
    this.onClose = onClose;
  }
}
