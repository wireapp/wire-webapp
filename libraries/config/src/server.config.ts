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

import fs from 'fs-extra';
import logdown from 'logdown';
import path from 'path';

import {ConfigGeneratorParams} from './config.types';
import {Env} from './env';

const ROBOTS_DIR = path.join(__dirname, 'robots');
const ROBOTS_ALLOW_FILE = path.join(ROBOTS_DIR, 'robots.txt');
const ROBOTS_DISALLOW_FILE = path.join(ROBOTS_DIR, 'robots-disallow.txt');

const defaultCSP = {
  connectSrc: ["'self'", 'blob:', 'data:', 'https://*.giphy.com'],
  defaultSrc: ["'self'"],
  fontSrc: ["'self'", 'data:'],
  frameSrc: [
    'https://*.soundcloud.com',
    'https://*.spotify.com',
    'https://*.vimeo.com',
    'https://*.youtube-nocookie.com',
  ],
  imgSrc: ["'self'", 'blob:', 'data:', 'https://*.giphy.com'],
  manifestSrc: ["'self'"],
  mediaSrc: ["'self'", 'blob:', 'data:'],
  scriptSrc: ["'self'", "'unsafe-eval'"],
  styleSrc: ["'self'", "'unsafe-inline'"],
  workerSrc: ["'self'", 'blob:', 'data:'],
};
const logger = logdown('config', {
  logger: console,
  markdown: false,
});

function readFile(filePath: string, fallback: string = ''): string {
  try {
    return fs.readFileSync(filePath, {encoding: 'utf8', flag: 'r'});
  } catch (error: unknown) {
    logger.warn(`Cannot access "${filePath}": ${(error as Error).message}`);
    return fallback;
  }
}

function parseCommaSeparatedList(list: string | undefined = ''): string[] {
  const cleanedList = list.replace(/\s/g, '');
  if (cleanedList.length === 0) {
    return [];
  }
  return cleanedList.split(',');
}

function getNonEmptyStringValueOrDefault(value: string | undefined, fallback: string): string {
  return value !== undefined && value.length > 0 ? value : fallback;
}

function resolveServerCertificatePath(certificateFileName: string): string {
  const certificatePathInWorkspaceRoot = path.resolve(process.cwd(), `certificate/${certificateFileName}`);
  if (fs.existsSync(certificatePathInWorkspaceRoot)) {
    return certificatePathInWorkspaceRoot;
  }

  return path.resolve(process.cwd(), `apps/server/dist/certificate/${certificateFileName}`);
}

function mergedCSP({urls}: ConfigGeneratorParams, env: Env): Record<string, Iterable<string>> {
  const objectSrc = parseCommaSeparatedList(env.CSP_EXTRA_OBJECT_SRC);
  const csp = {
    connectSrc: [
      ...defaultCSP.connectSrc,
      urls.api,
      urls.ws,
      ...parseCommaSeparatedList(env.CSP_EXTRA_CONNECT_SRC),
      // Allow all other connections in debug mode
      env.FEATURE_ENABLE_DEBUG == 'true' ? '*' : '',
    ].filter(Boolean),
    defaultSrc: [...defaultCSP.defaultSrc, ...parseCommaSeparatedList(env.CSP_EXTRA_DEFAULT_SRC)],
    fontSrc: [...defaultCSP.fontSrc, ...parseCommaSeparatedList(env.CSP_EXTRA_FONT_SRC)],
    frameSrc: [...defaultCSP.frameSrc, ...parseCommaSeparatedList(env.CSP_EXTRA_FRAME_SRC)],
    imgSrc: [...defaultCSP.imgSrc, ...parseCommaSeparatedList(env.CSP_EXTRA_IMG_SRC)],
    manifestSrc: [...defaultCSP.manifestSrc, ...parseCommaSeparatedList(env.CSP_EXTRA_MANIFEST_SRC)],
    mediaSrc: [...defaultCSP.mediaSrc, ...parseCommaSeparatedList(env.CSP_EXTRA_MEDIA_SRC)],
    objectSrc: objectSrc.length > 0 ? objectSrc : ["'none'"],
    scriptSrc: [...defaultCSP.scriptSrc, ...parseCommaSeparatedList(env.CSP_EXTRA_SCRIPT_SRC)],
    styleSrc: [...defaultCSP.styleSrc, ...parseCommaSeparatedList(env.CSP_EXTRA_STYLE_SRC)],
    workerSrc: [...defaultCSP.workerSrc, ...parseCommaSeparatedList(env.CSP_EXTRA_WORKER_SRC)],
  };
  return Object.entries(csp)
    .filter(([key, value]) => !!Array.from(value).length)
    .reduce((accumulator, [key, value]) => ({...accumulator, [key]: value}), {});
}

export function generateConfig(params: ConfigGeneratorParams, env: Env) {
  const {commit, version, urls, env: nodeEnv} = params;
  const baseUrl = urls.base ?? '';
  const apiUrl = urls.api ?? '';
  const websocketUrl = urls.ws ?? '';
  const parsedHttpPort = Number(env.PORT);
  const isHttpPortMissingOrZero = Number.isNaN(parsedHttpPort) || parsedHttpPort === 0;
  const httpPort = isHttpPortMissingOrZero ? 21080 : parsedHttpPort;
  const defaultSslCertificateKeyPath = resolveServerCertificatePath('development-key.pem');
  const defaultSslCertificatePath = resolveServerCertificatePath('development-cert.pem');
  const sslCertificateKeyPath = getNonEmptyStringValueOrDefault(
    env.SSL_CERTIFICATE_KEY_PATH,
    defaultSslCertificateKeyPath,
  );
  const sslCertificatePath = getNonEmptyStringValueOrDefault(env.SSL_CERTIFICATE_PATH, defaultSslCertificatePath);

  return {
    APP_BASE: baseUrl,
    COMMIT: commit,
    VERSION: version,
    CACHE_DURATION_SECONDS: 300,
    CSP: mergedCSP(params, env),
    BACKEND_REST: apiUrl,
    BACKEND_WS: websocketUrl,
    DEVELOPMENT: nodeEnv === 'development',
    DEVELOPMENT_ENABLE_TLS: baseUrl.startsWith('https://'),
    ENFORCE_HTTPS: env.ENFORCE_HTTPS != 'false',
    ENVIRONMENT: nodeEnv,
    GOOGLE_WEBMASTER_ID: env.GOOGLE_WEBMASTER_ID,
    OPEN_GRAPH: {
      DESCRIPTION: env.OPEN_GRAPH_DESCRIPTION,
      IMAGE_URL: env.OPEN_GRAPH_IMAGE_URL,
      TITLE: env.OPEN_GRAPH_TITLE,
    },
    ENABLE_DYNAMIC_HOSTNAME: env.ENABLE_DYNAMIC_HOSTNAME === 'true',
    ENABLE_CLIENT_VERSION_ENFORCEMENT: env.ENABLE_CLIENT_VERSION_ENFORCEMENT === 'true',
    PORT_HTTP: httpPort,
    ROBOTS: {
      ALLOW: readFile(ROBOTS_ALLOW_FILE, 'User-agent: *\r\nDisallow: /'),
      ALLOWED_HOSTS: ['app.wire.com'],
      DISALLOW: readFile(ROBOTS_DISALLOW_FILE, 'User-agent: *\r\nDisallow: /'),
    },
    SSL_CERTIFICATE_KEY_PATH: sslCertificateKeyPath,
    SSL_CERTIFICATE_PATH: sslCertificatePath,
  } as const;
}

export type ServerConfig = ReturnType<typeof generateConfig>;
