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

import type {AxiosRequestConfig, AxiosResponse} from 'axios';

import type {HttpClient} from './http/httpClient';

export type CookiePlatform = {
  readonly retrieveCookie: <ResponseBody>(response: AxiosResponse<ResponseBody>) => Promise<ResponseBody>;
  readonly sendRequestWithCookie: <ResponseBody>(
    client: HttpClient,
    config: AxiosRequestConfig,
  ) => Promise<AxiosResponse<ResponseBody>>;
};

export type BufferPlatform = {
  readonly bufferToString: (buffer: ArrayBuffer) => string;
  readonly base64MD5FromBuffer: (buffer: ArrayBuffer) => string;
  readonly concatToBuffer: (...items: readonly (string | Uint8Array)[]) => Blob | Uint8Array<ArrayBuffer>;
};

export type WebSocketConstructor = new (url: string, protocols?: string | string[]) => WebSocket;

export type WebSocketPlatform = {
  readonly WebSocket: WebSocketConstructor;
  readonly bufferToString: BufferPlatform['bufferToString'];
};

export type ApiClientPlatform = {
  readonly cookie: CookiePlatform;
  readonly buffer: BufferPlatform;
  readonly websocket: WebSocketPlatform;
};
