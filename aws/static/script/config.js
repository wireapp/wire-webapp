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

'use strict';

window.z = window.z || {};

window.z.config = {
  ACCENT_ID: {
    BLUE: 1,
    GREEN: 2,
    ORANGE: 5,
    PINK: 6,
    PURPLE: 7,
    RED: 4,
    YELLOW: 3,
  },

  LOGGER: {
    OPTIONS: {
      domains: {
        'app.wire.com': () => 0,
        localhost: () => 300,
        'wire.ms': () => 300,
        'wire-webapp-staging.wire.com': () => 300,
        'zinfra.io': () => 300,
      },
      name_length: 65,
    },
  },

  // 10 seconds until phone code expires
  LOGIN_CODE_EXPIRATION: 10 * 60,

  // 25 megabyte upload limit for personal use
  MAXIMUM_ASSET_FILE_SIZE_PERSONAL: 25 * 1024 * 1024,

  // 100 megabyte upload limit for organizations
  MAXIMUM_ASSET_FILE_SIZE_TEAM: 100 * 1024 * 1024,

  // 15 megabyte image upload limit
  MAXIMUM_IMAGE_FILE_SIZE: 15 * 1024 * 1024,

  // Maximum characters per sent message
  MAXIMUM_MESSAGE_LENGTH: 8000,

  // Maximum characters per received message
  // Encryption is approx. +40% of the original payload so let's round it at +50%
  MAXIMUM_MESSAGE_LENGTH_RECEIVING: 12000 * 1.5,

  // bigger requests will be split in chunks with a maximum size as defined
  MAXIMUM_USERS_PER_REQUEST: 200,

  // number of messages that will be pulled
  MESSAGES_FETCH_LIMIT: 30,

  MINIMUM_PASSWORD_LENGTH: 8,

  // measured in pixel
  SCROLL_TO_LAST_MESSAGE_THRESHOLD: 100,

  SUPPORT: {
    FORM: {
      BUG: 'new?ticket_form_id=101615',
      CONTACT: 'new',
    },
    ID: {
      CALLING: 202969412,
      CAMERA_ACCESS_DENIED: 202935412,
      DEVICE_ACCESS_DENIED: 213512545,
      DEVICE_NOT_FOUND: 202970662,
      HISTORY: 207834645,
      MICROPHONE_ACCESS_DENIED: 202590081,
      SCREEN_ACCESS_DENIED: 202935412,
    },
  },

  UNSPLASH_URL: 'https://source.unsplash.com/1200x1200/?landscape',

  URL: {
    ACCOUNT: {
      PRODUCTION: (window.wire.env.URL && window.wire.env.URL.ACCOUNT_BASE) || 'https://account.wire.com',
      STAGING: 'https://wire-account-staging.zinfra.io',
    },
    SUPPORT: 'https://support.wire.com',
    TEAM_SETTINGS: {
      PRODUCTION: (window.wire.env.URL && window.wire.env.URL.TEAMS_BASE) || 'https://teams.wire.com',
      STAGING: 'https://wire-admin-staging.zinfra.io',
    },
    WEBAPP: {
      INTERNAL: 'https://wire-webapp-staging.wire.com',
      PRODUCTION: window.wire.env.APP_BASE || 'https://app.wire.com',
      STAGING: 'https://wire-webapp-staging.zinfra.io',
    },
    WEBSITE: {
      PRODUCTION: (window.wire.env.URL && window.wire.env.URL.WEBSITE_BASE) || 'https://wire.com',
      STAGING: 'https://wire-website-staging.zinfra.io',
    },
  },

  URL_PATH: {
    CREATE_TEAM: '/create-team/',
    DECRYPT_ERROR_1: '/privacy/error-1/',
    DECRYPT_ERROR_2: '/privacy/error-2/',
    MANAGE_SERVICES: '/services/',
    MANAGE_TEAM: '/login/',
    PASSWORD_RESET: '/forgot/',
    PRIVACY_HOW: '/privacy/how/',
    PRIVACY_WHY: '/privacy/why/',
    SUPPORT_USERNAME: '/support/username/',
    TERMS_OF_USE: '/legal/terms/',
  },
};
