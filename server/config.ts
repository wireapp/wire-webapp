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

import * as dotenv from 'dotenv-extended';
import * as fs from 'fs-extra';
import {IHelmetContentSecurityPolicyDirectives as HelmetCSP} from 'helmet';
import * as logdown from 'logdown';
import * as path from 'path';
import {ServerConfig} from './ServerConfig';

const nodeEnvironment = process.env.NODE_ENV || 'production';

const COMMIT_FILE = path.join(__dirname, 'commit');
const ROBOTS_DIR = path.join(__dirname, 'robots');
const ROBOTS_ALLOW_FILE = path.join(ROBOTS_DIR, 'robots.txt');
const ROBOTS_DISALLOW_FILE = path.join(ROBOTS_DIR, 'robots-disallow.txt');
const VERSION_FILE = path.join(__dirname, 'version');

dotenv.load();

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
  manifestSrc: ["'self'"],
  mediaSrc: ["'self'", 'blob:', 'data:', '*'],
  objectSrc: ["'self'", 'https://*.youtube-nocookie.com', 'https://1-ps.googleusercontent.com'],
  prefetchSrc: ["'self'"],
  scriptSrc: ["'self'", "'unsafe-eval'", "'unsafe-inline'", 'https://apis.google.com'],
  styleSrc: ["'self'", "'unsafe-inline'", 'https://*.googleusercontent.com'],
  workerSrc: ["'self'"],
};
const logger = logdown('config', {
  logger: console,
  markdown: false,
});

function readFile(path: string, fallback?: string): string {
  try {
    return fs.readFileSync(path, {encoding: 'utf8', flag: 'r'});
  } catch (error) {
    logger.warn(`Cannot access "${path}": ${error.message}`);
    return fallback;
  }
}

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

const config: ServerConfig = {
  CLIENT: {
    ANALYTICS_API_KEY: process.env.ANALYTICS_API_KEY,
    APP_NAME: process.env.APP_NAME,
    BACKEND_REST: process.env.BACKEND_REST,
    BACKEND_WS: process.env.BACKEND_WS,
    BRAND_NAME: process.env.BRAND_NAME,
    ENVIRONMENT: nodeEnvironment,
    FEATURE: {
      ALLOWED_FILE_UPLOAD_EXTENSIONS: (process.env.FEATURE_ALLOWED_FILE_UPLOAD_EXTENSIONS || '*')
        .split(',')
        .map(extension => extension.trim()),
      APPLOCK_SCHEDULED_TIMEOUT: process.env.FEATURE_APPLOCK_SCHEDULED_TIMEOUT
        ? Number(process.env.FEATURE_APPLOCK_SCHEDULED_TIMEOUT)
        : null,
      APPLOCK_UNFOCUS_TIMEOUT: process.env.FEATURE_APPLOCK_UNFOCUS_TIMEOUT
        ? Number(process.env.FEATURE_APPLOCK_UNFOCUS_TIMEOUT)
        : null,
      CHECK_CONSENT: process.env.FEATURE_CHECK_CONSENT != 'false',
      DEFAULT_LOGIN_TEMPORARY_CLIENT: process.env.FEATURE_DEFAULT_LOGIN_TEMPORARY_CLIENT == 'true',
      ENABLE_ACCOUNT_REGISTRATION: process.env.FEATURE_ENABLE_ACCOUNT_REGISTRATION != 'false',
      ENABLE_DEBUG: process.env.FEATURE_ENABLE_DEBUG == 'true',
      ENABLE_DOMAIN_DISCOVERY: process.env.FEATURE_ENABLE_DOMAIN_DISCOVERY != 'false',
      ENABLE_PHONE_LOGIN: process.env.FEATURE_ENABLE_PHONE_LOGIN != 'false',
      ENABLE_SSO: process.env.FEATURE_ENABLE_SSO == 'true',
      PERSIST_TEMPORARY_CLIENTS: process.env.FEATURE_PERSIST_TEMPORARY_CLIENTS != 'false',
      SHOW_LOADING_INFORMATION: process.env.FEATURE_SHOW_LOADING_INFORMATION == 'true',
    },
    MAX_GROUP_PARTICIPANTS: (process.env.MAX_GROUP_PARTICIPANTS && Number(process.env.MAX_GROUP_PARTICIPANTS)) || 500,
    MAX_VIDEO_PARTICIPANTS: (process.env.MAX_VIDEO_PARTICIPANTS && Number(process.env.MAX_VIDEO_PARTICIPANTS)) || 4,
    NEW_PASSWORD_MINIMUM_LENGTH:
      (process.env.NEW_PASSWORD_MINIMUM_LENGTH && Number(process.env.NEW_PASSWORD_MINIMUM_LENGTH)) || 8,
    RAYGUN_API_KEY: process.env.RAYGUN_API_KEY,
    URL: {
      ACCOUNT_BASE: process.env.URL_ACCOUNT_BASE,
      MOBILE_BASE: process.env.URL_MOBILE_BASE,
      PRIVACY_POLICY: process.env.URL_PRIVACY_POLICY,
      SUPPORT_BASE: process.env.URL_SUPPORT_BASE,
      TEAMS_BASE: process.env.URL_TEAMS_BASE,
      TERMS_OF_USE_PERSONAL: process.env.URL_TERMS_OF_USE_PERSONAL,
      TERMS_OF_USE_TEAMS: process.env.URL_TERMS_OF_USE_TEAMS,
      WEBSITE_BASE: process.env.URL_WEBSITE_BASE,
    },
    VERSION: readFile(VERSION_FILE, '0.0.0'),
  },
  COMMIT: readFile(COMMIT_FILE, ''),
  SERVER: {
    APP_BASE: process.env.APP_BASE,
    CACHE_DURATION_SECONDS: 300,
    CSP: mergedCSP(),
    DEVELOPMENT: nodeEnvironment === 'development',
    ENFORCE_HTTPS: process.env.ENFORCE_HTTPS != 'false',
    ENVIRONMENT: nodeEnvironment,
    GOOGLE_WEBMASTER_ID: process.env.GOOGLE_WEBMASTER_ID,
    PORT_HTTP: Number(process.env.PORT) || 21080,
    ROBOTS: {
      ALLOW: readFile(ROBOTS_ALLOW_FILE, 'User-agent: *\r\nDisallow: /'),
      ALLOWED_HOSTS: ['app.wire.com'],
      DISALLOW: readFile(ROBOTS_DISALLOW_FILE, 'User-agent: *\r\nDisallow: /'),
    },
  },
};

export {config};
