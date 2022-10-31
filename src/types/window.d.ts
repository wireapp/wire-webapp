/*
 * Wire
 * Copyright (C) 2022 Wire Swiss GmbH
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
import jQuery from 'jquery';
import ko from 'knockout';

import type {AssetService} from '../script/assets/AssetService';
import type {NotificationService} from '../script/event/NotificationService';

import {t} from '../script/util/LocalizerUtil';

declare global {
  interface Window {
    $: typeof jQuery;
    amplify: amplify.Static;
    jQuery: typeof jQuery;
    ko: typeof ko;
    t: typeof t;
    wire: {
      app: {
        service: {
          asset: AssetService;
          notification: NotificationService;
        };
      };
      env: {
        ANALYTICS_API_KEY: string;
        APP_BASE: string;
        APP_NAME: string;
        BACKEND_NAME: string;
        BACKEND_REST: string;
        BACKEND_WS: string;
        BRAND_NAME: string;
        CHROME_ORIGIN_TRIAL_TOKEN: string;
        COUNTLY_API_KEY: string;
        ENABLE_DEV_BACKEND_API: boolean;
        ENVIRONMENT: string;
        FEATURE: {
          ALLOWED_FILE_UPLOAD_EXTENSIONS: string[];
          APPLOCK_SCHEDULED_TIMEOUT: number;
          ENABLE_CC_PROTEUS: boolean;
          CHECK_CONSENT: boolean;
          CONFERENCE_AUTO_MUTE: boolean;
          DEFAULT_LOGIN_TEMPORARY_CLIENT: boolean;
          ENABLE_ACCOUNT_REGISTRATION: boolean;
          ENABLE_ACCOUNT_REGISTRATION_ACCEPT_TERMS_AND_PRIVACY_POLICY: boolean;
          ENABLE_DEBUG: boolean;
          ENABLE_DOMAIN_DISCOVERY: boolean;
          ENABLE_ENFORCE_DESKTOP_APPLICATION_ONLY: boolean;
          ENABLE_EXTRA_CLIENT_ENTROPY: boolean;
          FORCE_EXTRA_CLIENT_ENTROPY: boolean;
          ENABLE_MEDIA_EMBEDS: boolean;
          ENABLE_MLS: boolean;
          ENABLE_PHONE_LOGIN: boolean;
          ENABLE_SSO: boolean;
          ENFORCE_CONSTANT_BITRATE: boolean;
          MLS_CONFIG_KEYING_MATERIAL_UPDATE_THRESHOLD: number;
          PERSIST_TEMPORARY_CLIENTS: boolean;
          SHOW_LOADING_INFORMATION: boolean;
        };
        MAX_GROUP_PARTICIPANTS: number;
        MAX_VIDEO_PARTICIPANTS: number;
        NEW_PASSWORD_MINIMUM_LENGTH: number;
        URL: {
          ACCOUNT_BASE: string;
          MOBILE_BASE: string;
          PRICING: string;
          PRIVACY_POLICY: string;
          SUPPORT: {
            BUG_REPORT: string;
            CALLING: string;
            CAMERA_ACCESS_DENIED: string;
            CONTACT: string;
            DEVICE_ACCESS_DENIED: string;
            DEVICE_NOT_FOUND: string;
            EMAIL_EXISTS: string;
            HISTORY: string;
            INDEX: string;
            LEGAL_HOLD_BLOCK: string;
            MICROPHONE_ACCESS_DENIED: string;
            PRIVACY_VERIFY_FINGERPRINT: string;
            SCREEN_ACCESS_DENIED: string;
          };
          TEAMS_BASE: string;
          TEAMS_BILLING: string;
          TEAMS_CREATE: string;
          TERMS_OF_USE_PERSONAL: string;
          TERMS_OF_USE_TEAMS: string;
          WEBSITE_BASE: string;
          WHATS_NEW: string;
        };
        VERSION: string;
        WEBSITE_LABEL: string;
      };
    };
    wSSOCapable: boolean;
    z: any;
  }
}
