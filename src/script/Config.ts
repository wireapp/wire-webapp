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
import UUID from 'pure-uuid';
const env = window.wire.env;

export const ACCENT_ID = {
  BLUE: 1,
  GREEN: 2,
  ORANGE: 5,
  PINK: 6,
  PURPLE: 7,
  RED: 4,
  YELLOW: 3,
};

export class Configuration {
  readonly APP_BASE = env.APP_BASE || 'https://app.wire.com';
  readonly APP_NAME = env.APP_NAME || 'Webapp';
  readonly APP_INSTANCE_ID = new UUID(4).format();
  readonly BACKEND_NAME = env.BACKEND_NAME || 'Wire';
  readonly BACKEND_REST = env.BACKEND_REST || 'https://prod-nginz-https.wire.com';
  readonly BACKEND_WS = env.BACKEND_WS || 'wss://prod-nginz-ssl.wire.com';
  readonly BRAND_NAME = env.BRAND_NAME || 'Wire';
  readonly ENVIRONMENT = env.ENVIRONMENT || 'production';
  readonly FEATURE = env.FEATURE;
  readonly MAX_GROUP_PARTICIPANTS = env.MAX_GROUP_PARTICIPANTS || 500;
  readonly MAX_VIDEO_PARTICIPANTS = env.MAX_VIDEO_PARTICIPANTS || 4;
  readonly NEW_PASSWORD_MINIMUM_LENGTH = env.NEW_PASSWORD_MINIMUM_LENGTH || ValidationUtil.DEFAULT_PASSWORD_MIN_LENGTH;
  readonly URL = env.URL || {
    ACCOUNT_BASE: 'https://account.wire.com',
    MOBILE_BASE: '',
    PRIVACY_POLICY: 'https://wire-website-staging.zinfra.io/security',
    SUPPORT: {
      BUG_REPORT: 'https://support.wire.com/new?ticket_form_id=101615',
      CALLING: 'https://support.wire.com/hc/articles/202969412',
      CAMERA_ACCESS_DENIED: 'https://support.wire.com/hc/articles/202935412',
      CONTACT: 'https://support.wire.com/new',
      DEVICE_ACCESS_DENIED: 'https://support.wire.com/hc/articles/213512545',
      DEVICE_NOT_FOUND: 'https://support.wire.com/hc/articles/202970662',
      EMAIL_EXISTS: 'https://support.wire.com/hc/articles/115004082129',
      HISTORY: 'https://support.wire.com/hc/articles/207834645',
      INDEX: 'https://support.wire.com/',
      MICROPHONE_ACCESS_DENIED: 'https://support.wire.com/hc/articles/202590081',
      SCREEN_ACCESS_DENIED: 'https://support.wire.com/hc/articles/202935412',
    },
    TEAMS_BASE: 'https://teams.wire.com',
    TERMS_OF_USE_PERSONAL: 'https://wire-website-staging.zinfra.io/legal/terms/personal',
    TERMS_OF_USE_TEAMS: 'https://wire-website-staging.zinfra.io/legal/terms/teams',
    WEBSITE_BASE: 'https://wire.com',
  };
  readonly VERSION = env.VERSION || '0.0.0';
  readonly WEBSITE_LABEL = env.WEBSITE_LABEL;

  // 10 seconds until phone code expires
  readonly LOGIN_CODE_EXPIRATION = 10 * 60;

  // 25 megabyte upload limit for personal use (private users & guests)
  readonly MAXIMUM_ASSET_FILE_SIZE_PERSONAL = 25 * 1024 * 1024;

  // 100 megabyte upload limit for organizations (team members)
  readonly MAXIMUM_ASSET_FILE_SIZE_TEAM = 100 * 1024 * 1024;

  // 15 megabyte image upload limit
  readonly MAXIMUM_IMAGE_FILE_SIZE = 15 * 1024 * 1024;

  // maximum chars for link preview titles and descriptions
  readonly MAXIMUM_LINK_PREVIEW_CHARS = 200;

  // Maximum characters per sent message
  readonly MAXIMUM_MESSAGE_LENGTH = 8000;

  // Maximum characters per received message
  // Encryption is approx. +40% of the original payload so let's round it at +50%
  readonly MAXIMUM_MESSAGE_LENGTH_RECEIVING = 12000 * 1.5;

  // bigger requests will be split in chunks with a maximum size as defined
  readonly MAXIMUM_USERS_PER_REQUEST = 200;

  // number of messages that will be pulled
  readonly MESSAGES_FETCH_LIMIT = 30;

  readonly MINIMUM_PASSWORD_LENGTH = 8;

  // measured in pixel
  readonly SCROLL_TO_LAST_MESSAGE_THRESHOLD = 100;
}

let instance: Configuration;

const Config = {
  getConfig: () => {
    if (!instance) {
      instance = new Configuration();
    }
    return instance;
  },
};

export {Config};
