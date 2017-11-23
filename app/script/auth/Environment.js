/*
 * Wire
 * Copyright (C) 2017 Wire Swiss GmbH
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

import * as config from './config';

export const LOCAL = 'LOCAL';
export const STAGING = 'STAGING';
export const PRODUCTION = 'PRODUCTION';

export function checkEnvironment() {
  const environment = getEnvironment();
  console.log(`Starting with environment ### ${environment} ###`);
  if (![LOCAL, STAGING, PRODUCTION].includes(environment)) {
    throw new Error(`Invalid environment ${environment}`);
  }
}

export function getEnvironment() {
  return config.APP_ENVIRONMENT;
}

export function isEnvironment(environment) {
  return config.APP_ENVIRONMENT === environment;
}

export function onEnvironment(onLocal, onStaging, onProduction) {
  switch (getEnvironment()) {
    case LOCAL: {
      return onLocal;
    }
    case STAGING: {
      return onStaging;
    }
    case PRODUCTION: {
      return onProduction;
    }
    default: {
      return onProduction;
    }
  }
}
