/*
 * Wire
 * Copyright (C) 2023 Wire Swiss GmbH
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

import {ConfigGeneratorParams} from './config.types';
import {Env} from './env';

export function generateConfig(params: ConfigGeneratorParams, env: Env) {
  const {urls, version, env: nodeEnv} = params;
  return {
    APP_BASE: urls.base,
    ANALYTICS_API_KEY: env.ANALYTICS_API_KEY,
    APP_NAME: env.APP_NAME ?? 'Wire',
    BACKEND_NAME: env.BACKEND_NAME,
    BACKEND_REST: urls.api,
    BACKEND_WS: urls.ws,
    BRAND_NAME: env.BRAND_NAME,
    COUNTLY_API_KEY: env.COUNTLY_API_KEY,
    DATADOG_APPLICATION_ID: env.DATADOG_APPLICATION_ID,
    DATADOG_CLIENT_TOKEN: env.DATADOG_CLIENT_TOKEN,
    ENABLE_DEV_BACKEND_API: env.ENABLE_DEV_BACKEND_API == 'true',
    ENVIRONMENT: nodeEnv,
    FEATURE: {
      ALLOWED_FILE_UPLOAD_EXTENSIONS: (env.FEATURE_ALLOWED_FILE_UPLOAD_EXTENSIONS || '*')
        .split(',')
        .map(extension => extension.trim()),
      APPLOCK_SCHEDULED_TIMEOUT: env.FEATURE_APPLOCK_SCHEDULED_TIMEOUT
        ? Number(env.FEATURE_APPLOCK_SCHEDULED_TIMEOUT)
        : null,
      CHECK_CONSENT: env.FEATURE_CHECK_CONSENT != 'false',
      CONFERENCE_AUTO_MUTE: env.FEATURE_CONFERENCE_AUTO_MUTE == 'true',
      DEFAULT_LOGIN_TEMPORARY_CLIENT: env.FEATURE_DEFAULT_LOGIN_TEMPORARY_CLIENT == 'true',
      ENABLE_ACCOUNT_REGISTRATION: env.FEATURE_ENABLE_ACCOUNT_REGISTRATION != 'false',
      ENABLE_ACCOUNT_REGISTRATION_ACCEPT_TERMS_AND_PRIVACY_POLICY:
        env.FEATURE_ENABLE_ACCOUNT_REGISTRATION_ACCEPT_TERMS_AND_PRIVACY_POLICY == 'true',
      ENABLE_DEBUG: env.FEATURE_ENABLE_DEBUG == 'true',
      ENABLE_PING_CONFIRMATION: env.FEATURE_ENABLE_PING_CONFIRMATION == 'true',
      ENABLE_DOMAIN_DISCOVERY: env.FEATURE_ENABLE_DOMAIN_DISCOVERY != 'false',
      ENABLE_ENFORCE_DESKTOP_APPLICATION_ONLY: env.FEATURE_ENABLE_ENFORCE_DESKTOP_APPLICATION_ONLY == 'true',
      ENABLE_EXTRA_CLIENT_ENTROPY: env.FEATURE_ENABLE_EXTRA_CLIENT_ENTROPY == 'true',
      ENABLE_MEDIA_EMBEDS: env.FEATURE_ENABLE_MEDIA_EMBEDS != 'false',
      ENABLE_MLS: env.FEATURE_ENABLE_MLS == 'true',
      ENABLE_SELF_SUPPORTED_PROTOCOLS_UPDATES: env.FEATURE_ENABLE_SELF_SUPPORTED_PROTOCOLS_UPDATES == 'true',
      ENABLE_PHONE_LOGIN: env.FEATURE_ENABLE_PHONE_LOGIN != 'false',
      ENABLE_PROTEUS_CORE_CRYPTO: env.FEATURE_ENABLE_PROTEUS_CORE_CRYPTO == 'true',
      ENABLE_SSO: env.FEATURE_ENABLE_SSO == 'true',
      ENFORCE_CONSTANT_BITRATE: env.FEATURE_ENFORCE_CONSTANT_BITRATE == 'true',
      FORCE_EXTRA_CLIENT_ENTROPY: env.FEATURE_FORCE_EXTRA_CLIENT_ENTROPY == 'true',
      MLS_CONFIG_KEYING_MATERIAL_UPDATE_THRESHOLD:
        env.FEATURE_MLS_CONFIG_KEYING_MATERIAL_UPDATE_THRESHOLD &&
        Number(env.FEATURE_MLS_CONFIG_KEYING_MATERIAL_UPDATE_THRESHOLD),
      PERSIST_TEMPORARY_CLIENTS: env.FEATURE_PERSIST_TEMPORARY_CLIENTS != 'false',
      SHOW_LOADING_INFORMATION: env.FEATURE_SHOW_LOADING_INFORMATION == 'true',
      USE_CORE_CRYPTO: env.FEATURE_USE_CORE_CRYPTO == 'true',
      MAX_USERS_TO_PING_WITHOUT_ALERT:
        (env.FEATURE_MAX_USERS_TO_PING_WITHOUT_ALERT && Number(env.FEATURE_MAX_USERS_TO_PING_WITHOUT_ALERT)) || 3,
    },
    MAX_GROUP_PARTICIPANTS: (env.MAX_GROUP_PARTICIPANTS && Number(env.MAX_GROUP_PARTICIPANTS)) || 500,
    MAX_VIDEO_PARTICIPANTS: (env.MAX_VIDEO_PARTICIPANTS && Number(env.MAX_VIDEO_PARTICIPANTS)) || 4,
    NEW_PASSWORD_MINIMUM_LENGTH: (env.NEW_PASSWORD_MINIMUM_LENGTH && Number(env.NEW_PASSWORD_MINIMUM_LENGTH)) || 8,
    URL: {
      ACCOUNT_BASE: env.URL_ACCOUNT_BASE,
      MOBILE_BASE: env.URL_MOBILE_BASE,
      PRICING: env.URL_PRICING,
      PRIVACY_POLICY: env.URL_PRIVACY_POLICY,
      SUPPORT: {
        BUG_REPORT: env.URL_SUPPORT_BUG_REPORT,
        CALLING: env.URL_SUPPORT_CALLING,
        CAMERA_ACCESS_DENIED: env.URL_SUPPORT_CAMERA_ACCESS_DENIED,
        CONTACT: env.URL_SUPPORT_CONTACT,
        DEVICE_ACCESS_DENIED: env.URL_SUPPORT_DEVICE_ACCESS_DENIED,
        DEVICE_NOT_FOUND: env.URL_SUPPORT_DEVICE_NOT_FOUND,
        EMAIL_EXISTS: env.URL_SUPPORT_EMAIL_EXISTS,
        HISTORY: env.URL_SUPPORT_HISTORY,
        INDEX: env.URL_SUPPORT_INDEX,
        LEGAL_HOLD_BLOCK: env.URL_SUPPORT_LEGAL_HOLD_BLOCK,
        MICROPHONE_ACCESS_DENIED: env.URL_SUPPORT_MICROPHONE_ACCESS_DENIED,
        PRIVACY_VERIFY_FINGERPRINT: env.URL_SUPPORT_PRIVACY_VERIFY_FINGERPRINT,
        SCREEN_ACCESS_DENIED: env.URL_SUPPORT_SCREEN_ACCESS_DENIED,
        OFFLINE_BACKEND: env.URL_SUPPORT_OFFLINE_BACKEND,
        FEDERATION_STOP: env.URL_SUPPORT_FEDERATION_STOP,
      },
      TEAMS_BASE: env.URL_TEAMS_BASE,
      TEAMS_CREATE: env.URL_TEAMS_CREATE,
      TEAMS_BILLING: env.URL_TEAMS_BILLING,
      TERMS_OF_USE_PERSONAL: env.URL_TERMS_OF_USE_PERSONAL,
      TERMS_OF_USE_TEAMS: env.URL_TERMS_OF_USE_TEAMS,
      WEBSITE_BASE: env.URL_WEBSITE_BASE,
      WHATS_NEW: env.URL_WHATS_NEW,
    },
    VERSION: version,
    WEBSITE_LABEL: env.WEBSITE_LABEL,
  } as const;
}
