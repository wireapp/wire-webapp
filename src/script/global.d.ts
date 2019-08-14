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

import {amplify} from 'amplify';
import {AssetService} from './assets/AssetService';

declare global {
  interface Window {
    $: any;
    amplify: amplify.Static;
    bazinga64: any;
    jQuery: any;
    platform: any;
    wire: {
      app: {
        service: {
          asset: AssetService;
        };
      };
      env: {
        APP_BASE: string;
        APP_NAME: string;
        BACKEND_REST: string;
        BACKEND_WS: string;
        BRAND_NAME: string;
        ENVIRONMENT: string;
        FEATURE: {
          APPLOCK_SCHEDULED_TIMEOUT: number;
          APPLOCK_UNFOCUS_TIMEOUT: number;
          CHECK_CONSENT: boolean;
          DEFAULT_LOGIN_TEMPORARY_CLIENT: boolean;
          ENABLE_ACCOUNT_REGISTRATION: boolean;
          ENABLE_DEBUG: boolean;
          ENABLE_PHONE_LOGIN: boolean;
          ENABLE_SSO: boolean;
          PERSIST_TEMPORARY_CLIENTS: boolean;
          SHOW_LOADING_INFORMATION: boolean;
        };
        MAX_GROUP_PARTICIPANTS: number;
        MAX_VIDEO_PARTICIPANTS: number;
        NEW_PASSWORD_MINIMUM_LENGTH: number;
        URL: {
          ACCOUNT_BASE: string;
          MOBILE_BASE: string;
          TEAMS_BASE: string;
          WEBSITE_BASE: string;
          SUPPORT_BASE: string;
          PRIVACY_POLICY: string;
          TERMS_OF_USE_PERSONAL: string;
          TERMS_OF_USE_TEAMS: string;
        };
        VERSION: string;
      };
    };
    wSSOCapable: boolean;
    z: any;
  }
}
