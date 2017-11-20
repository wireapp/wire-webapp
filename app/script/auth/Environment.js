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

import * as config from 'script/config';

export const LOCAL = 'LOCAL';
export const STAGING = 'STAGING';
export const PRODUCTION = 'PRODUCTION';

export function checkEnvironment() {
  console.log(`Starting with environment ### ${getEnvironment()} ###`);
  if (![LOCAL, STAGING, PRODUCTION].includes(getEnvironment())) {
    throw new Error(`Invalid environment ${getEnvironment()}`);
  }
}

export function getEnvironment() {
  return config.APP_ENVIRONMENT || PRODUCTION;
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
