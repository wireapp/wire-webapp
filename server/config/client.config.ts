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

export function generateConfig(params: ConfigGeneratorParams) {
  const {urls, version, env} = params;
  return {
    APP_BASE: urls.base,
    ANALYTICS_API_KEY: process.env.ANALYTICS_API_KEY,
    APP_NAME: process.env.APP_NAME ?? 'Wire',
    BACKEND_NAME: process.env.BACKEND_NAME,
    BACKEND_REST: urls.api,
    BACKEND_WS: urls.ws,
    BRAND_NAME: process.env.BRAND_NAME,
    COUNTLY_API_KEY: process.env.COUNTLY_API_KEY,
    DATADOG_APPLICATION_ID: process.env.DATADOG_APPLICATION_ID,
    DATADOG_CLIENT_TOKEN: process.env.DATADOG_CLIENT_TOKEN,
    ENABLE_DEV_BACKEND_API: process.env.ENABLE_DEV_BACKEND_API == 'true',
    ENVIRONMENT: env,
    FEATURE: {
      ALLOWED_FILE_UPLOAD_EXTENSIONS: (process.env.FEATURE_ALLOWED_FILE_UPLOAD_EXTENSIONS || '*')
        .split(',')
        .map(extension => extension.trim()),
      APPLOCK_SCHEDULED_TIMEOUT: process.env.FEATURE_APPLOCK_SCHEDULED_TIMEOUT
        ? Number(process.env.FEATURE_APPLOCK_SCHEDULED_TIMEOUT)
        : null,
      CHECK_CONSENT: process.env.FEATURE_CHECK_CONSENT != 'false',
      CONFERENCE_AUTO_MUTE: process.env.FEATURE_CONFERENCE_AUTO_MUTE == 'true',
      DEFAULT_LOGIN_TEMPORARY_CLIENT: process.env.FEATURE_DEFAULT_LOGIN_TEMPORARY_CLIENT == 'true',
      ENABLE_ACCOUNT_REGISTRATION: process.env.FEATURE_ENABLE_ACCOUNT_REGISTRATION != 'false',
      ENABLE_ACCOUNT_REGISTRATION_ACCEPT_TERMS_AND_PRIVACY_POLICY:
        process.env.FEATURE_ENABLE_ACCOUNT_REGISTRATION_ACCEPT_TERMS_AND_PRIVACY_POLICY == 'true',
      ENABLE_DEBUG: process.env.FEATURE_ENABLE_DEBUG == 'true',
      ENABLE_DOMAIN_DISCOVERY: process.env.FEATURE_ENABLE_DOMAIN_DISCOVERY != 'false',
      ENABLE_ENFORCE_DESKTOP_APPLICATION_ONLY: process.env.FEATURE_ENABLE_ENFORCE_DESKTOP_APPLICATION_ONLY == 'true',
      ENABLE_EXTRA_CLIENT_ENTROPY: process.env.FEATURE_ENABLE_EXTRA_CLIENT_ENTROPY == 'true',
      ENABLE_MEDIA_EMBEDS: process.env.FEATURE_ENABLE_MEDIA_EMBEDS != 'false',
      ENABLE_MLS: process.env.FEATURE_ENABLE_MLS == 'true',
      ENABLE_PHONE_LOGIN: process.env.FEATURE_ENABLE_PHONE_LOGIN != 'false',
      ENABLE_PROTEUS_CORE_CRYPTO: process.env.FEATURE_ENABLE_PROTEUS_CORE_CRYPTO == 'true',
      ENABLE_SSO: process.env.FEATURE_ENABLE_SSO == 'true',
      ENFORCE_CONSTANT_BITRATE: process.env.FEATURE_ENFORCE_CONSTANT_BITRATE == 'true',
      FORCE_EXTRA_CLIENT_ENTROPY: process.env.FEATURE_FORCE_EXTRA_CLIENT_ENTROPY == 'true',
      MLS_CONFIG_KEYING_MATERIAL_UPDATE_THRESHOLD:
        process.env.FEATURE_MLS_CONFIG_KEYING_MATERIAL_UPDATE_THRESHOLD &&
        Number(process.env.FEATURE_MLS_CONFIG_KEYING_MATERIAL_UPDATE_THRESHOLD),
      PERSIST_TEMPORARY_CLIENTS: process.env.FEATURE_PERSIST_TEMPORARY_CLIENTS != 'false',
      SHOW_LOADING_INFORMATION: process.env.FEATURE_SHOW_LOADING_INFORMATION == 'true',
      USE_CORE_CRYPTO: process.env.FEATURE_USE_CORE_CRYPTO == 'true',
    },
    MAX_GROUP_PARTICIPANTS: (process.env.MAX_GROUP_PARTICIPANTS && Number(process.env.MAX_GROUP_PARTICIPANTS)) || 500,
    MAX_VIDEO_PARTICIPANTS: (process.env.MAX_VIDEO_PARTICIPANTS && Number(process.env.MAX_VIDEO_PARTICIPANTS)) || 4,
    NEW_PASSWORD_MINIMUM_LENGTH:
      (process.env.NEW_PASSWORD_MINIMUM_LENGTH && Number(process.env.NEW_PASSWORD_MINIMUM_LENGTH)) || 8,
    URL: {
      ACCOUNT_BASE: process.env.URL_ACCOUNT_BASE ?? 'https://account.wire.com',
      MOBILE_BASE: process.env.URL_MOBILE_BASE,
      PRICING: process.env.URL_PRICING ?? '#',
      PRIVACY_POLICY: process.env.URL_PRIVACY_POLICY ?? 'https://wire-website-staging.zinfra.io/security',
      SUPPORT: {
        BUG_REPORT: process.env.URL_SUPPORT_BUG_REPORT ?? 'https://support.wire.com/new?ticket_form_id:101615',
        CALLING: process.env.URL_SUPPORT_CALLING ?? 'https://support.wire.com/hc/articles/202969412',
        CAMERA_ACCESS_DENIED: process.env.URL_SUPPORT_CAMERA_ACCESS_DENIED,
        CONTACT: process.env.URL_SUPPORT_CONTACT ?? 'https://support.wire.com/new',
        DEVICE_ACCESS_DENIED:
          process.env.URL_SUPPORT_DEVICE_ACCESS_DENIED ?? 'https://support.wire.com/hc/articles/213512545',
        DEVICE_NOT_FOUND: process.env.URL_SUPPORT_DEVICE_NOT_FOUND ?? 'https://support.wire.com/hc/articles/202970662',
        EMAIL_EXISTS: process.env.URL_SUPPORT_EMAIL_EXISTS ?? 'https://support.wire.com/hc/articles/115004082129',
        HISTORY: process.env.URL_SUPPORT_HISTORY ?? 'https://support.wire.com/hc/articles/207834645',
        INDEX: process.env.URL_SUPPORT_INDEX ?? 'https://support.wire.com/',
        LEGAL_HOLD_BLOCK: process.env.URL_SUPPORT_LEGAL_HOLD_BLOCK,
        MICROPHONE_ACCESS_DENIED:
          process.env.URL_SUPPORT_MICROPHONE_ACCESS_DENIED ?? 'https://support.wire.com/hc/articles/202590081',
        PRIVACY_VERIFY_FINGERPRINT:
          process.env.URL_SUPPORT_PRIVACY_VERIFY_FINGERPRINT ?? 'https://support.wire.com/hc/en-us/articles/207692235',
        SCREEN_ACCESS_DENIED:
          process.env.URL_SUPPORT_SCREEN_ACCESS_DENIED ?? 'https://support.wire.com/hc/articles/202935412',
      },
      TEAMS_BASE: process.env.URL_TEAMS_BASE ?? 'https://teams.wire.com',
      TEAMS_CREATE: process.env.URL_TEAMS_CREATE ?? 'https://wire.com/create-team/?pk_campaign:client&pk_kwd:desktop',
      TERMS_BILLING: process.env.URL_TERMS_BILLING ?? 'https://teams.wire.com/billing',
      TERMS_OF_USE_PERSONAL:
        process.env.URL_TERMS_OF_USE_PERSONAL ?? 'https://wire-website-staging.zinfra.io/legal/terms/personal',
      TERMS_OF_USE_TEAMS:
        process.env.URL_TERMS_OF_USE_TEAMS ?? 'https://wire-website-staging.zinfra.io/legal/terms/teams',
      WEBSITE_BASE: process.env.URL_WEBSITE_BASE ?? 'https://wire.com',
      WHATS_NEW: process.env.URL_WHATS_NEW ?? 'https://medium.com/wire-news/webapp-updates/home',
    },
    VERSION: version,
    WEBSITE_LABEL: process.env.WEBSITE_LABEL,
  } as const;
}
