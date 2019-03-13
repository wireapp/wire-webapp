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

import {APIClient} from '@wireapp/api-client';
import {QUERY_KEY} from './route';
import {getURLParameter} from './util/urlUtil';

export enum ENVIRONMENT {
  LOCAL = 'LOCAL',
  STAGING = 'STAGING',
  PRODUCTION = 'PRODUCTION',
}

export const APP_ENVIRONMENT = getEnvironmentFromQuery();
checkEnvironment();
export function getEnvironmentFromQuery() {
  switch (getURLParameter(QUERY_KEY.ENVIRONMENT)) {
    case 'staging': {
      return ENVIRONMENT.STAGING;
    }
    case 'prod': {
      return ENVIRONMENT.PRODUCTION;
    }
    default: {
      const isProductionHost = window.location.hostname.endsWith('wire.com');
      if (isProductionHost) {
        return ENVIRONMENT.PRODUCTION;
      }
      return isLocalhost() ? ENVIRONMENT.LOCAL : ENVIRONMENT.STAGING;
    }
  }
}

export function isLocalhost() {
  return window.location.hostname.includes('localhost') || window.location.hostname.startsWith('192.168.');
}

export function isInternalEnvironment() {
  return window.location.hostname.includes('wire-webapp') || isLocalhost();
}

export function checkEnvironment() {
  const environment = getEnvironment();
  if (![ENVIRONMENT.LOCAL, ENVIRONMENT.STAGING, ENVIRONMENT.PRODUCTION].includes(environment)) {
    throw new Error(`Invalid environment ${environment}`);
  }
}

export function getEnvironment() {
  return APP_ENVIRONMENT;
}

export function isEnvironment(environment: ENVIRONMENT) {
  return APP_ENVIRONMENT === environment;
}

export function onEnvironment<T>(environmentConditions: {onLocal?: T; onStaging: T; onProduction: T}): T {
  switch (getEnvironment()) {
    case ENVIRONMENT.LOCAL: {
      return environmentConditions.onLocal === undefined
        ? environmentConditions.onStaging
        : environmentConditions.onLocal;
    }
    case ENVIRONMENT.STAGING: {
      return environmentConditions.onStaging;
    }
    case ENVIRONMENT.PRODUCTION: {
      return environmentConditions.onProduction;
    }
    default: {
      return environmentConditions.onProduction;
    }
  }
}

export const BACKEND = onEnvironment({
  onProduction: APIClient.BACKEND.PRODUCTION,
  onStaging: APIClient.BACKEND.STAGING,
});
