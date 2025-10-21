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

import {MINIMUM_API_VERSION} from '@wireapp/api-client/lib/Config';

import {Runtime} from '@wireapp/commons';

import {createUuid} from 'Util/uuid';

import packageJson from '../../package.json';
const env = window.wire.env;

export const ACCENT_ID = {
  AMBER: 5,
  BLUE: 1,
  GREEN: 2,
  PURPLE: 7,
  RED: 4,
  TURQUOISE: 6,
};

const config = {
  ...env,
  APP_INSTANCE_ID: createUuid(),
  FEATURE: {
    ...env.FEATURE,
    ENABLE_EXTRA_CLIENT_ENTROPY:
      env.FEATURE.ENABLE_EXTRA_CLIENT_ENTROPY && (Runtime.isWindows() || env.FEATURE.FORCE_EXTRA_CLIENT_ENTROPY),
  },

  /** 25 megabyte upload limit for personal use (private users & guests) */
  MAXIMUM_ASSET_FILE_SIZE_PERSONAL: 25 * 1024 * 1024,

  /** 100 megabyte upload limit for organizations (team members) */
  MAXIMUM_ASSET_FILE_SIZE_TEAM: 100 * 1024 * 1024,

  /** 500 megabyte upload limit when Cells is enabled */
  MAXIMUM_ASSET_FILE_SIZE_CELLS: 500 * 1024 * 1024,

  /** 15 megabyte image upload limit */
  MAXIMUM_IMAGE_FILE_SIZE: 15 * 1024 * 1024,

  /** maximum chars for link preview titles and descriptions */
  MAXIMUM_LINK_PREVIEW_CHARS: 200,

  /** Maximum characters per sent message */
  MAXIMUM_MESSAGE_LENGTH: 8000,

  /**
   * Maximum characters per received message
   * Encryption is approx. +40% of the original payload so let's round it at +50%
   */
  MAXIMUM_MESSAGE_LENGTH_RECEIVING: 12000 * 1.5,

  /** bigger requests will be split in chunks with a maximum size as defined */
  MAXIMUM_USERS_PER_REQUEST: 200,

  /** number of messages that will be pulled */
  MESSAGES_FETCH_LIMIT: 30,

  MINIMUM_PASSWORD_LENGTH: 8,

  /** measured in pixel */
  SCROLL_TO_LAST_MESSAGE_THRESHOLD: 100,

  /** min supported api version for team creation */
  MIN_TEAM_CREATION_SUPPORTED_API_VERSION: 7,

  /** min supported api version for Enterprise login v2 */
  MIN_ENTERPRISE_LOGIN_V2_AND_CHANNELS_SUPPORTED_API_VERSION: 8,

  /** Image MIME types */
  ALLOWED_IMAGE_TYPES: ['image/bmp', 'image/gif', 'image/jpeg', 'image/jpg', 'image/png', 'image/webp'],

  /** Which min and max version of the backend api do we support */
  SUPPORTED_API_RANGE: [MINIMUM_API_VERSION, env.ENABLE_DEV_BACKEND_API ? Infinity : 11],

  /** DataDog client api keys access */
  dataDog: {
    clientToken: env.DATADOG_CLIENT_TOKEN,
    applicationId: env.DATADOG_APPLICATION_ID,
  },

  AVS_VERSION: packageJson.dependencies['@wireapp/avs'],

  COUNTLY_SERVER_URL: 'https://countly.wire.com/',
  GET_WIRE_URL: 'https://get.wire.com',
} as const;

export type Configuration = typeof config;

const Config = {
  getConfig: () => {
    return config;
  },
  _dangerouslySetConfigFeaturesForDebug: (newConfigFeatures: Configuration['FEATURE']) => {
    (config.FEATURE as unknown) = newConfigFeatures;
  },
  getDesktopConfig: () => {
    if (!Runtime.isDesktopApp) {
      return undefined;
    }

    return window.desktopAppConfig;
  },
};

export {Config};
