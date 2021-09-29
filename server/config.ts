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

import dotenv from 'dotenv-extended';
import fs from 'fs-extra';
import logdown from 'logdown';
import path from 'path';

import type {ServerConfig} from './ServerConfig';

const nodeEnvironment = process.env.NODE_ENV || 'production';

const COMMIT_FILE = path.join(__dirname, 'commit');
const ROBOTS_DIR = path.join(__dirname, 'robots');
const ROBOTS_ALLOW_FILE = path.join(ROBOTS_DIR, 'robots.txt');
const ROBOTS_DISALLOW_FILE = path.join(ROBOTS_DIR, 'robots-disallow.txt');
const VERSION_FILE = path.join(__dirname, 'version');

dotenv.load();

const defaultCSP = {
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
  workerSrc: ["'self'", 'blob:'],
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

function mergedCSP(): Record<string, Iterable<string>> {
  const csp = {
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
    .filter(([key, value]) => !!Array.from(value).length)
    .reduce((accumulator, [key, value]) => ({...accumulator, [key]: value}), {});
}

const config: ServerConfig = {
  CLIENT: {
    ANALYTICS_API_KEY: process.env.ANALYTICS_API_KEY,
    APP_NAME: process.env.APP_NAME,
    BACKEND_NAME: process.env.BACKEND_NAME,
    BACKEND_REST: process.env.BACKEND_REST,
    BACKEND_WS: process.env.BACKEND_WS,
    BRAND_NAME: process.env.BRAND_NAME,
    CHROME_ORIGIN_TRIAL_TOKEN: process.env.CHROME_ORIGIN_TRIAL_TOKEN,
    COUNTLY_API_KEY: process.env.COUNTLY_API_KEY,
    ENVIRONMENT: nodeEnvironment,
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
      ENABLE_FEDERATION: process.env.FEATURE_ENABLE_FEDERATION == 'true',
      ENABLE_MEDIA_EMBEDS: process.env.FEATURE_ENABLE_MEDIA_EMBEDS != 'false',
      ENABLE_PHONE_LOGIN: process.env.FEATURE_ENABLE_PHONE_LOGIN != 'false',
      ENABLE_SSO: process.env.FEATURE_ENABLE_SSO == 'true',
      ENFORCE_CONSTANT_BITRATE: process.env.FEATURE_ENFORCE_CONSTANT_BITRATE == 'true',
      FEDERATION_DOMAIN: process.env.FEATURE_FEDERATION_DOMAIN,
      PERSIST_TEMPORARY_CLIENTS: process.env.FEATURE_PERSIST_TEMPORARY_CLIENTS != 'false',
      SHOW_LOADING_INFORMATION: process.env.FEATURE_SHOW_LOADING_INFORMATION == 'true',
    },
    MAX_GROUP_PARTICIPANTS: (process.env.MAX_GROUP_PARTICIPANTS && Number(process.env.MAX_GROUP_PARTICIPANTS)) || 500,
    MAX_VIDEO_PARTICIPANTS: (process.env.MAX_VIDEO_PARTICIPANTS && Number(process.env.MAX_VIDEO_PARTICIPANTS)) || 4,
    NEW_PASSWORD_MINIMUM_LENGTH:
      (process.env.NEW_PASSWORD_MINIMUM_LENGTH && Number(process.env.NEW_PASSWORD_MINIMUM_LENGTH)) || 8,
    URL: {
      ACCOUNT_BASE: process.env.URL_ACCOUNT_BASE,
      MOBILE_BASE: process.env.URL_MOBILE_BASE,
      PRICING: process.env.URL_PRICING,
      PRIVACY_POLICY: process.env.URL_PRIVACY_POLICY,
      SUPPORT: {
        BUG_REPORT: process.env.URL_SUPPORT_BUG_REPORT,
        CALLING: process.env.URL_SUPPORT_CALLING,
        CAMERA_ACCESS_DENIED: process.env.URL_SUPPORT_CAMERA_ACCESS_DENIED,
        CONTACT: process.env.URL_SUPPORT_CONTACT,
        DEVICE_ACCESS_DENIED: process.env.URL_SUPPORT_DEVICE_ACCESS_DENIED,
        DEVICE_NOT_FOUND: process.env.URL_SUPPORT_DEVICE_NOT_FOUND,
        EMAIL_EXISTS: process.env.URL_SUPPORT_EMAIL_EXISTS,
        HISTORY: process.env.URL_SUPPORT_HISTORY,
        INDEX: process.env.URL_SUPPORT_INDEX,
        LEGAL_HOLD_BLOCK: process.env.URL_SUPPORT_LEGAL_HOLD_BLOCK,
        MICROPHONE_ACCESS_DENIED: process.env.URL_SUPPORT_MICROPHONE_ACCESS_DENIED,
        SCREEN_ACCESS_DENIED: process.env.URL_SUPPORT_SCREEN_ACCESS_DENIED,
      },
      TEAMS_BASE: process.env.URL_TEAMS_BASE,
      TEAMS_CREATE: process.env.URL_TEAMS_CREATE,
      TERMS_BILLING: process.env.URL_TERMS_BILLING,
      TERMS_OF_USE_PERSONAL: process.env.URL_TERMS_OF_USE_PERSONAL,
      TERMS_OF_USE_TEAMS: process.env.URL_TERMS_OF_USE_TEAMS,
      WEBSITE_BASE: process.env.URL_WEBSITE_BASE,
      WHATS_NEW: process.env.URL_WHATS_NEW,
    },
    VERSION: readFile(VERSION_FILE, '0.0.0'),
    WEBSITE_LABEL: process.env.WEBSITE_LABEL,
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
    OPEN_GRAPH: {
      DESCRIPTION: process.env.OPEN_GRAPH_DESCRIPTION,
      IMAGE_URL: process.env.OPEN_GRAPH_IMAGE_URL,
      TITLE: process.env.OPEN_GRAPH_TITLE,
    },
    PORT_HTTP: Number(process.env.PORT) || 21080,
    ROBOTS: {
      ALLOW: readFile(ROBOTS_ALLOW_FILE, 'User-agent: *\r\nDisallow: /'),
      ALLOWED_HOSTS: ['app.wire.com'],
      DISALLOW: readFile(ROBOTS_DISALLOW_FILE, 'User-agent: *\r\nDisallow: /'),
    },
    SSL_CERTIFICATE_KEY_PATH:
      process.env.SSL_CERTIFICATE_KEY_PATH || path.join(__dirname, 'certificate/development-key.pem'),
    SSL_CERTIFICATE_PATH: process.env.SSL_CERTIFICATE_PATH || path.join(__dirname, 'certificate/development-cert.pem'),
  },
};

export {config};
