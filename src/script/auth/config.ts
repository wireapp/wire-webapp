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

import {ValidationUtil} from '@wireapp/commons';
import * as UUID from 'uuid/v4';

class Configuration {
  readonly APP_BASE = window.wire.env.APP_BASE || 'https://app.wire.com';
  readonly APP_NAME = window.wire.env.APP_NAME || 'Webapp';
  readonly APP_INSTANCE_ID = UUID();
  readonly BACKEND_REST = window.wire.env.BACKEND_REST || 'https://prod-nginz-https.wire.com';
  readonly BACKEND_WS = window.wire.env.BACKEND_WS || 'wss://prod-nginz-ssl.wire.com';
  readonly BRAND_NAME = window.wire.env.BRAND_NAME || 'Wire';
  readonly CALLING_PROTOCOL_VERSION = '3.0';
  readonly ENVIRONMENT = window.wire.env.ENVIRONMENT || 'production';
  readonly FEATURE = window.wire.env.FEATURE || {
    CHECK_CONSENT: true,
    ENABLE_ACCOUNT_REGISTRATION: true,
    ENABLE_DEBUG: false,
    ENABLE_PHONE_LOGIN: true,
    ENABLE_SSO: false,
    SHOW_LOADING_INFORMATION: false,
  };
  readonly MAX_VIDEO_PARTICIPANTS = 4;
  readonly NEW_PASSWORD_MINIMUM_LENGTH =
    window.wire.env.NEW_PASSWORD_MINIMUM_LENGTH || ValidationUtil.DEFAULT_PASSWORD_MIN_LENGTH;
  readonly URL = window.wire.env.URL || {
    ACCOUNT_BASE: 'https://account.wire.com',
    MOBILE_BASE: '',
    SUPPORT_BASE: 'https://support.wire.com',
    TEAMS_BASE: 'https://teams.wire.com',
    WEBSITE_BASE: 'https://wire.com',
  };
  readonly VERSION = window.wire.env.VERSION || '0.0.0';
}

const Config = new Configuration();

export {Config};
