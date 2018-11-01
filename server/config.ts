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

const defaultCSP: HelmetCSP = {
  connectSrc: [
    "'self'",
    'blob:',
    'data:',
    'https://wire.com',
    'https://www.google.com',
    'https://*.giphy.com',
    'https://*.unsplash.com',
    'https://apis.google.com',
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
    'https://1-ps.googleusercontent.com',
    'https://csi.gstatic.com',
  ],
  manifestSrc: [],
  mediaSrc: ["'self'", 'blob:', 'data:', '*'],
  objectSrc: ["'self'", 'https://*.youtube-nocookie.com', 'https://1-ps.googleusercontent.com'],
  prefetchSrc: [],
  scriptSrc: ["'self'", "'unsafe-eval'", "'unsafe-inline'", 'https://apis.google.com'],
  styleSrc: ["'self'", "'unsafe-inline'", 'https://*.googleusercontent.com'],
  workerSrc: [],
};

function parseCommaSeparatedList(list: string = ''): string[] {
  const cleanedList = list.replace(/\s/g, '');
  if (!cleanedList) {
    return [];
  }
  return cleanedList.split(',');
}

function mergedCSP(): HelmetCSP {
  const csp: HelmetCSP = {
    connectSrc: [
      ...defaultCSP.connectSrc,
      process.env.BACKEND_REST,
      process.env.BACKEND_WS,
      ...parseCommaSeparatedList(process.env.CSP_EXTRA_CONNECT_SRC),
    ],
    defaultSrc: [...defaultCSP.defaultSrc, ...parseCommaSeparatedList(process.env.CSP_EXTRA_DEFAULT_SRC)],
    fontSrc: [...defaultCSP.fontSrc, ...parseCommaSeparatedList(process.env.CSP_EXTRA_FONT_SRC)],
    frameSrc: [...defaultCSP.frameSrc, ...parseCommaSeparatedList(process.env.CSP_EXTRA_FRAME_SRC)],
    imgSrc: [...defaultCSP.imgSrc, ...parseCommaSeparatedList(process.env.CSP_EXTRA_IMG_SRC)],
    manifestSrc: [...defaultCSP.manifestSrc, ...parseCommaSeparatedList(process.env.CSP_EXTRA_MANIFEST_SRC)],
    mediaSrc: [...defaultCSP.mediaSrc, ...parseCommaSeparatedList(process.env.CSP_EXTRA_MEDIA_SRC)],
    objectSrc: [...defaultCSP.objectSrc, ...parseCommaSeparatedList(process.env.CSP_EXTRA_OBJECT_SRC)],
    prefetchSrc: [...defaultCSP.prefetchSrc, ...parseCommaSeparatedList(process.env.CSP_EXTRA_PREFETCH_SRC)],
    scriptSrc: [...defaultCSP.scriptSrc, ...parseCommaSeparatedList(process.env.CSP_EXTRA_SCRIPT_SRC)],
    styleSrc: [...defaultCSP.styleSrc, ...parseCommaSeparatedList(process.env.CSP_EXTRA_STYLE_SRC)],
    workerSrc: [...defaultCSP.workerSrc, ...parseCommaSeparatedList(process.env.CSP_EXTRA_WORKER_SRC)],
  };
  return Object.entries(csp)
    .filter(([key, value]) => !!value.length)
    .reduce((accumulator, [key, value]) => ({...accumulator, [key]: value}), {});
}

export interface ServerConfig {
  CLIENT: {
    ANALYTICS_API_KEY: string;
    RAYGUN_API_KEY: string;
    APP_NAME: string;
    BACKEND_REST: string;
    BACKEND_WS: string;
    ENVIRONMENT: string;
    URL: {
      ACCOUNT_BASE: string;
      MOBILE_BASE: string;
      TEAMS_BASE: string;
      WEBSITE_BASE: string;
    };
    FEATURE: {
      CHECK_CONSENT: boolean;
      ENABLE_DEBUG: boolean;
      ENABLE_SSO: boolean;
    };
    VERSION?: string;
  };
  SERVER: {
    APP_BASE: string;
    CACHE_DURATION_SECONDS: number;
    CSP: HelmetCSP;
    DEVELOPMENT?: boolean;
    ENFORCE_HTTPS: boolean;
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
    ANALYTICS_API_KEY: process.env.ANALYTICS_API_KEY,
    APP_NAME: process.env.APP_NAME,
    BACKEND_REST: process.env.BACKEND_REST,
    BACKEND_WS: process.env.BACKEND_WS,
    ENVIRONMENT: nodeEnvironment,
    FEATURE: {
      CHECK_CONSENT: process.env.FEATURE_CHECK_CONSENT == 'false' ? false : true,
      ENABLE_DEBUG: process.env.FEATURE_ENABLE_DEBUG == 'true' ? true : false,
      ENABLE_SSO: process.env.FEATURE_ENABLE_SSO == 'true' ? true : false,
    },
    RAYGUN_API_KEY: process.env.RAYGUN_API_KEY,
    URL: {
      ACCOUNT_BASE: process.env.URL_ACCOUNT_BASE,
      MOBILE_BASE: process.env.URL_MOBILE_BASE,
      TEAMS_BASE: process.env.URL_TEAMS_BASE,
      WEBSITE_BASE: process.env.URL_WEBSITE_BASE,
    },
    VERSION: undefined,
  },
  SERVER: {
    APP_BASE: process.env.APP_BASE,
    CACHE_DURATION_SECONDS: 300,
    CSP: mergedCSP(),
    DEVELOPMENT: nodeEnvironment === 'development',
    ENFORCE_HTTPS: process.env.ENFORCE_HTTPS == 'false' ? false : true,
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
