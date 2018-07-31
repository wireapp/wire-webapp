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

import {getURLParameter} from './util/urlUtil';
import {QUERY_KEY} from './route';
import {APIClient} from '@wireapp/api-client';

export const LOCAL = 'LOCAL';
export const STAGING = 'STAGING';
export const PRODUCTION = 'PRODUCTION';

export const APP_ENVIRONMENT = getEnvironmentFromQuery();
checkEnvironment();
export function getEnvironmentFromQuery() {
  switch (getURLParameter(QUERY_KEY.ENVIRONMENT)) {
    case 'staging': {
      return STAGING;
    }
    case 'prod': {
      return PRODUCTION;
    }
    default: {
      const isProductionHost = window.location.hostname.endsWith('wire.com');
      if (isProductionHost) {
        return PRODUCTION;
      }
      return isLocalhost() ? LOCAL : STAGING;
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
  if (![LOCAL, STAGING, PRODUCTION].includes(environment)) {
    throw new Error(`Invalid environment ${environment}`);
  }
}

export function getEnvironment() {
  return APP_ENVIRONMENT;
}

export function isEnvironment(environment) {
  return APP_ENVIRONMENT === environment;
}

export function onEnvironment(environmentConditions) {
  switch (getEnvironment()) {
    case LOCAL: {
      return environmentConditions.onLocal === undefined
        ? environmentConditions.onStaging
        : environmentConditions.onLocal;
    }
    case STAGING: {
      return environmentConditions.onStaging;
    }
    case PRODUCTION: {
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
