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

import * as dotenv from 'dotenv';
import {IHelmetContentSecurityPolicyDirectives as HelmetCSP} from 'helmet';
import * as path from 'path';
import {fileIsReadable, readFile} from './util/FileUtil';

dotenv.config();

const CSP: HelmetCSP = {
  connectSrc: [
    "'self'",
    'blob:',
    'data:',
    'https://*.giphy.com',
    'https://*.unsplash.com',
    'https://*.wire.com',
    'https://*.zinfra.io',
    'https://api.mixpanel.com',
    'https://api.raygun.io',
    'https://apis.google.com',
    'https://wire.com',
    'https://www.google.com',
    'wss://*.zinfra.io',
    'wss://prod-nginz-ssl.wire.com',
  ],
  defaultSrc: ["'self'"],
  fontSrc: ["'self'", 'data:'],
  frameSrc: [
    'https://*.soundcloud.com',
    'https://*.spotify.com',
    'https://*.vimeo.com',
    'https://*.youtube-nocookie.com',
    'https://accounts.google.com',
  ],
  imgSrc: [
    "'self'",
    'blob:',
    'data:',
    'https://*.cloudfront.net',
    'https://*.giphy.com',
    'https://*.wire.com',
    'https://*.zinfra.io',
    'https://1-ps.googleusercontent.com',
    'https://api.mixpanel.com',
    'https://csi.gstatic.com',
  ],
  mediaSrc: ["'self'", 'blob:', 'data:', '*'],
  objectSrc: ["'self'", 'https://*.youtube-nocookie.com', 'https://1-ps.googleusercontent.com'],
  scriptSrc: [
    "'self'",
    "'unsafe-eval'",
    "'unsafe-inline'",
    'https://*.wire.com',
    'https://*.zinfra.io',
    'https://api.mixpanel.com',
    'https://api.raygun.io',
    'https://apis.google.com',
  ],
  styleSrc: ["'self'", "'unsafe-inline'", 'https://*.googleusercontent.com', 'https://*.wire.com'],
};

export interface ServerConfig {
  CLIENT: {
    APP_NAME: string;
    BACKEND_HTTP: string;
    BACKEND_WS: string;
    ENVIRONMENT: string;
    EXTERNAL_ACCOUNT_BASE: string;
    EXTERNAL_MOBILE_BASE: string;
    EXTERNAL_WEBSITE_BASE: string;
    VERSION?: string;
  };
  SERVER: {
    BASE: string;
    CACHE_DURATION_SECONDS: number;
    CSP: typeof CSP;
    DEVELOPMENT?: boolean;
    ENVIRONMENT: string;
    PORT_HTTP: number;
    ROBOTS: {
      ALLOWED_HOSTS: string[];
      ALLOW: string;
      DISALLOW: string;
    };
  };
}

const nodeEnvironment = process.env.NODE_ENV || 'production';

const config: ServerConfig = {
  CLIENT: {
    APP_NAME: process.env.APP_NAME,
    BACKEND_HTTP: process.env.BACKEND_HTTP,
    BACKEND_WS: process.env.BACKEND_WS,
    ENVIRONMENT: nodeEnvironment,
    EXTERNAL_ACCOUNT_BASE: process.env.EXTERNAL_ACCOUNT_BASE,
    EXTERNAL_MOBILE_BASE: process.env.EXTERNAL_MOBILE_BASE,
    EXTERNAL_WEBSITE_BASE: process.env.EXTERNAL_WEBSITE_BASE,
    VERSION: undefined,
  },
  SERVER: {
    BASE: process.env.BASE,
    CACHE_DURATION_SECONDS: 300,
    CSP,
    DEVELOPMENT: nodeEnvironment === 'development',
    ENVIRONMENT: nodeEnvironment,
    PORT_HTTP: Number(process.env.PORT) || 21080,
    ROBOTS: {
      ALLOW: '',
      ALLOWED_HOSTS: ['app.wire.com'],
      DISALLOW: '',
    },
  },
};

const robotsDir = path.join(__dirname, 'robots');
const robotsAllowFile = path.join(robotsDir, 'robots.txt');
const robotsDisallowFile = path.join(robotsDir, 'robots-disallow.txt');
const versionFile = path.join(__dirname, 'version');

if (fileIsReadable(robotsAllowFile, true)) {
  try {
    config.SERVER.ROBOTS.ALLOW = readFile(robotsAllowFile, true);
  } catch (error) {}
}

if (fileIsReadable(robotsDisallowFile, true)) {
  try {
    config.SERVER.ROBOTS.DISALLOW = readFile(robotsDisallowFile, true);
  } catch (error) {}
}

if (fileIsReadable(versionFile, true)) {
  try {
    config.CLIENT.VERSION = readFile(versionFile, true);
  } catch (error) {}
}

export default config;
