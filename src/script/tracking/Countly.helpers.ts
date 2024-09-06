/*
 * Wire
 * Copyright (C) 2024 Wire Swiss GmbH
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

import {getWebEnvironment} from 'Util/Environment';
import {getLogger, Logger} from 'Util/Logger';

import {Config} from '../Config';

const logger: Logger = getLogger('CountlyHelpers');

// This variable is used to force the activation of error reporting on specific environments
let forceActivateErrorReporting: boolean = false;

// This method is used by QA to disable the forced activation for testing purposes
export const disableForcedErrorReporting = (): void => {
  forceActivateErrorReporting = false;
};
export const getForcedErrorReportingStatus = (): boolean => forceActivateErrorReporting;

// Init the forced activation of error reporting based on the environment
export const initForcedErrorReporting = () => {
  const {isDev, isEdge, isInternal, isLocalhost, isStaging, name} = getWebEnvironment();

  if (isDev || isEdge || isInternal || isLocalhost || isStaging) {
    forceActivateErrorReporting = true;
    logger.warn(`Error reporting is forced to be activated on this environment: ${name}`);
  }
};

export function isCountlyEnabledAtCurrentEnvironment(): boolean {
  if (forceActivateErrorReporting) {
    return true;
  }

  const {COUNTLY_API_KEY, COUNTLY_ALLOWED_BACKEND, BACKEND_REST} = Config.getConfig();

  const allowedBackendUrls = COUNTLY_ALLOWED_BACKEND.split(',').map(url => url.trim()) || [];
  const isCountlyEnabled =
    !!COUNTLY_API_KEY && allowedBackendUrls.length > 0 && allowedBackendUrls.includes(BACKEND_REST);

  return isCountlyEnabled;
}
