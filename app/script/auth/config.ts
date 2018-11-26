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
    wire: {
      env: {
        APP_BASE: string;
        APP_NAME: string;
        BACKEND_REST: string;
        BACKEND_WS: string;
        ENVIRONMENT: string;
        URL: {
          ACCOUNT_BASE: string;
          MOBILE_BASE: string;
          TEAMS_BASE: string;
          WEBSITE_BASE: string;
        };
        VERSION: string;
        FEATURE: {
          CHECK_CONSENT: boolean;
          ENABLE_DEBUG: boolean;
          ENABLE_SSO: boolean;
        };
      };
    };
  }
}

export const APP_NAME = window.wire.env.APP_NAME || 'Webapp';
export const BACKEND_REST = window.wire.env.BACKEND_REST || 'https://prod-nginz-https.wire.com';
export const BACKEND_WS = window.wire.env.BACKEND_WS || 'wss://prod-nginz-ssl.wire.com';
export const ENVIRONMENT = window.wire.env.ENVIRONMENT || 'production';
export const APP_BASE = window.wire.env.APP_BASE || 'https://app.wire.com';
export const URL = window.wire.env.URL || {
  ACCOUNT_BASE: 'https://account.wire.com',
  MOBILE_BASE: '/',
  TEAMS_BASE: 'https://teams.wire.com',
  WEBSITE_BASE: 'https://wire.com',
};
export const VERSION = window.wire.env.VERSION || '0.0.0';
export const FEATURE = window.wire.env.FEATURE || {
  CHECK_CONSENT: true,
  ENABLE_DEBUG: false,
  ENABLE_SSO: false,
};
export const APP_INSTANCE_ID = UUID();
