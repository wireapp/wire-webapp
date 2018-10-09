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

const {version}: {version: string} = require('../package.json');

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
    SUPPORTED: {
      [name: string]: number;
    };
    VERSION: string;
  };
  SERVER: {
    BASE: string;
    CACHE_DURATION_SECONDS: number;
    COMPRESS_LEVEL: number;
    COMPRESS_MIN_SIZE: number;
    CSP: typeof CSP;
    DEVELOPMENT?: boolean;
    ENVIRONMENT: string;
    PORT_HTTP: number;
  };
}

const nodeEnvironment = process.env.NODE_ENV || 'production';

const config: ServerConfig = {
  CLIENT: {
    APP_NAME: process.env.APP_NAME,
    BACKEND_HTTP: process.env.BACKEND_HTTP,
    BACKEND_WS: process.env.BACKEND_WS,
    ENVIRONMENT: nodeEnvironment,
    SUPPORTED: {
      chrome: 56,
      firefox: 60,
      msedge: 15,
      opera: 43,
    },
    VERSION: version,
  },
  SERVER: {
    BASE: process.env.BASE,
    CACHE_DURATION_SECONDS: 300,
    COMPRESS_LEVEL: 6,
    COMPRESS_MIN_SIZE: 500,
    CSP,
    DEVELOPMENT: nodeEnvironment === 'development',
    ENVIRONMENT: nodeEnvironment,
    PORT_HTTP: Number(process.env.PORT) || 21080,
  },
};

export default config;
