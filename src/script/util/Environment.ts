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

import {Runtime} from '@wireapp/commons';

import {Config} from '../Config';
import {BackendEnvironment} from '../service/BackendEnvironment';

const APP_ENV = {
  LOCALHOST: 'localhost',
  PRODUCTION: 'wire.com',
  VIRTUAL_HOST: 'wire.ms', // The domain "wire.ms" is our virtual host for testing contact uploads
};

const DEV_ENVIRONMENT_IDENTIFIERS = {
  EDGE: 'edge',
  DEV: 'dev',
  INTERNAL: 'internal',
  LINK: 'wire.link',
  LOCAL: 'local.',
} as const;

const getElectronVersion = (userAgent: string): string => {
  // [match, version]
  const [, electronVersion] = /Wire(?:Internal)?\/(\S+)/i.exec(userAgent) || [];
  return electronVersion;
};

const isLocalhost = (): boolean => [APP_ENV.LOCALHOST, APP_ENV.VIRTUAL_HOST].includes(window.location.hostname);
const isProduction = (): boolean => {
  return window.wire.env.ENVIRONMENT === BackendEnvironment.PRODUCTION;
};
export const getWebEnvironment = () => {
  const appBase = window.wire.env.APP_BASE;
  const environment = {
    isEdge: false,
    isDev: false,
    isInternal: false,
    isLinked: false,
    isLocalhost: false,
    isProduction: false,
    name: '',
  };

  if (appBase.includes(DEV_ENVIRONMENT_IDENTIFIERS.LOCAL || isLocalhost())) {
    environment.isLocalhost = true;
    environment.name = 'Localhost';
  } else if (appBase.includes(DEV_ENVIRONMENT_IDENTIFIERS.EDGE)) {
    environment.isEdge = true;
    environment.name = 'Edge Environment';
  } else if (appBase.includes(DEV_ENVIRONMENT_IDENTIFIERS.DEV)) {
    environment.isDev = true;
    environment.name = 'Dev Environment';
  } else if (appBase.includes(DEV_ENVIRONMENT_IDENTIFIERS.INTERNAL)) {
    environment.isInternal = true;
    environment.name = 'Internal Environment';
  } else if (appBase.includes(DEV_ENVIRONMENT_IDENTIFIERS.LINK)) {
    environment.isLinked = true;
    environment.name = 'Linked Environment';
  } else if (isProduction()) {
    environment.isProduction = true;
    environment.name = 'Production Environment';
  }

  return environment;
};

interface Environment {
  backend: {
    current?: string;
  };
  electronVersion: typeof getElectronVersion;
  frontend: {
    isLocalhost: typeof isLocalhost;
    isProduction: typeof isProduction;
  };
  version: (showWrapperVersion?: boolean) => string;
  avsVersion: () => string;
}

export const Environment: Environment = {
  backend: {},
  electronVersion: getElectronVersion,
  frontend: {
    isLocalhost,
    isProduction,
  },
  version: (showWrapperVersion = true): string => {
    if (Environment.frontend.isLocalhost()) {
      return 'dev';
    }

    const electronVersion = getElectronVersion(Runtime.getUserAgent());
    const showElectronVersion = electronVersion && showWrapperVersion;
    return showElectronVersion ? electronVersion : Config.getConfig().VERSION;
  },
  avsVersion: (): string => Config.getConfig().AVS_VERSION,
};
