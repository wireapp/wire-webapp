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

window.z = window.z || {};

const env = window.wire.env;

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

  FEATURE: {
    CHECK_CONSENT: env.FEATURE && env.FEATURE.CHECK_CONSENT,
    ENABLE_ACCOUNT_REGISTRATION: env.FEATURE && env.FEATURE.ENABLE_ACCOUNT_REGISTRATION,
    ENABLE_DEBUG: env.FEATURE && env.FEATURE.ENABLE_DEBUG,
    ENABLE_PHONE_LOGIN: env.FEATURE && env.FEATURE.ENABLE_PHONE_LOGIN,
    ENABLE_SSO: env.FEATURE && env.FEATURE.ENABLE_SSO,
    SHOW_LOADING_INFORMATION: env.FEATURE && env.FEATURE.SHOW_LOADING_INFORMATION,
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

  // maximum chars for link preview titles and descriptions
  MAXIMUM_LINK_PREVIEW_CHARS: 200,

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
};
