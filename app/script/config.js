/*
 * Wire
 * Copyright (C) 2016 Wire Swiss GmbH
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

if (window.z == null) {
  window.z = {};
}

window.z.config = {
  BROWSER_NOTIFICATION: {
    TIMEOUT: 5000,
    TITLE_LENGTH: 38,
    BODY_LENGTH: 80,
  },

  LOGGER: {
    OPTIONS: {
      name_length: 65,
      domains: {
        'app.wire.com': () => {
          return 0;
        },
        'localhost': () => {
          return 300;
        },
        'wire.ms': () => {
          return 300;
        },
        'wire-webapp-staging.wire.com': () => {
          return 300;
        },
        'zinfra.io': () => {
          return 300;
        },
      },
    },
  },

  // number of messages that will be pulled
  MESSAGES_FETCH_LIMIT: 30,

  // number of users displayed in "people you may know"
  SUGGESTIONS_FETCH_LIMIT: 30,

  ACCENT_ID: {
    BLUE: 1,
    GREEN: 2,
    YELLOW: 3,
    RED: 4,
    ORANGE: 5,
    PINK: 6,
    PURPLE: 7,
  },

  MAXIMUM_CONVERSATION_SIZE: 128,

  // self profile image size in pixel
  MINIMUM_PROFILE_IMAGE_SIZE: {
    WIDTH: 320,
    HEIGHT: 320,
  },

  // 15 megabyte image upload limit
  MAXIMUM_IMAGE_FILE_SIZE: 15 * 1024 * 1024,

  // 25 megabyte upload limit (minus AES overhead)
  MAXIMUM_ASSET_FILE_SIZE: 25 * 1024 * 1024 - 32,

  // Maximum of parallel uploads
  MAXIMUM_ASSET_UPLOADS: 10,

  // Maximum characters per message
  MAXIMUM_MESSAGE_LENGTH: 8000,

  SUPPORTED_PROFILE_IMAGE_TYPES: [
    '.jpg-large',
    'image/jpg',
    'image/jpeg',
    'image/png',
    'image/bmp',
  ],

  SUPPORTED_CONVERSATION_IMAGE_TYPES: [
    '.jpg-large',
    'image/jpg',
    'image/jpeg',
    'image/png',
    'image/bmp',
    'image/gif',
  ],

  // 3 minutes session timeout
  LOCALYTICS_SESSION_TIMEOUT: 3 * 60 * 1000,

  MINIMUM_USERNAME_LENGTH: 2,
  MINIMUM_PASSWORD_LENGTH: 8,

  // 10 seconds until phone code expires
  LOGIN_CODE_EXPIRATION: 10 * 60,

  // measured in pixel
  SCROLL_TO_LAST_MESSAGE_THRESHOLD: 100,

  PROPERTIES_KEY: 'webapp',

  // bigger requests will be split in chunks with a maximum size as defined
  MAXIMUM_USERS_PER_REQUEST: 200,

  UNSPLASH_URL: 'https://source.unsplash.com/1200x1200/?landscape',

  ACCOUNT_PRODUCTION_URL: 'https://account-wire.com/',
  ACCOUNT_STAGING_URL: 'https://wire-account-staging.zinfra.io/',

  WEBSITE_PRODUCTION_URL: 'https://wire.com/',
  WEBSITE_STAGING_URL: 'https://staging-website.zinfra.io/',
};
