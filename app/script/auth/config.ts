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

import * as UUID from 'uuid/v4';

declare global {
  interface Window {
    APP_NAME: string;
    BACKEND_HTTP: string;
    BACKEND_WS: string;
    ENVIRONMENT: string;
    VERSION: string;
  }
}

export const APP_NAME = window.APP_NAME || 'Webapp';
export const BACKEND_HTTP = window.BACKEND_HTTP || 'https://prod-nginz-https.wire.com';
export const BACKEND_WS = window.BACKEND_WS || 'wss://prod-nginz-ssl.wire.com';
export const ENVIRONMENT = window.ENVIRONMENT || 'production';
export const VERSION = window.VERSION || '0.0.0';
export const APP_INSTANCE_ID = UUID();
