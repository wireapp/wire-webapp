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

  ACCOUNT_PRODUCTION_URL: 'https://account-wire.com/',
  ACCOUNT_STAGING_URL: 'https://wire-account-staging.zinfra.io/',

  LOGGER: {
    OPTIONS: {
      domains: {
        'app.wire.com': function() {
          return 0;
        },
        localhost: function() {
          return 300;
        },
        'wire.ms': function() {
          return 300;
        },
        'wire-webapp-staging.wire.com': function() {
          return 300;
        },
        'zinfra.io': function() {
          return 300;
        },
      },
      name_length: 65,
    },
  },

  // 10 seconds until phone code expires
  LOGIN_CODE_EXPIRATION: 10 * 60,

  // 25 megabyte upload limit (minus AES overhead)
  MAXIMUM_ASSET_FILE_SIZE: 25 * 1024 * 1024 - 32,

  // Maximum of parallel uploads
  MAXIMUM_ASSET_UPLOADS: 10,

  MAXIMUM_CONVERSATION_SIZE: 128,

  // 15 megabyte image upload limit
  MAXIMUM_IMAGE_FILE_SIZE: 15 * 1024 * 1024,

  // Maximum characters per message
  MAXIMUM_MESSAGE_LENGTH: 8000,

  // bigger requests will be split in chunks with a maximum size as defined
  MAXIMUM_USERS_PER_REQUEST: 200,

  // number of messages that will be pulled
  MESSAGES_FETCH_LIMIT: 30,

  MINIMUM_PASSWORD_LENGTH: 8,

  // measured in pixel
  SCROLL_TO_LAST_MESSAGE_THRESHOLD: 100,

  SUPPORTED_CONVERSATION_IMAGE_TYPES: [
    '.jpg-large',
    'image/jpg',
    'image/jpeg',
    'image/png',
    'image/bmp',
    'image/gif',
  ],

  SUPPORTED_PROFILE_IMAGE_TYPES: [
    '.jpg-large',
    'image/jpg',
    'image/jpeg',
    'image/png',
    'image/bmp',
  ],

  UNSPLASH_URL: 'https://source.unsplash.com/1200x1200/?landscape',

  WEBSITE_PRODUCTION_URL: 'https://wire.com/',
  WEBSITE_STAGING_URL: 'https://staging-website.zinfra.io/',
};
