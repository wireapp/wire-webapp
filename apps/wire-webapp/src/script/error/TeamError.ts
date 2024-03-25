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

import {BaseError} from './BaseError';

enum TEAM_ERROR_TYPE {
  NO_APP_CONFIG = 'NO_APP_CONFIG',
  NO_PERMISSIONS = 'NO_PERMISSIONS',
}

export class TeamError extends BaseError {
  constructor(type: TEAM_ERROR_TYPE, message: string) {
    super(type, message);
  }

  static get MESSAGE(): Record<TEAM_ERROR_TYPE, string> {
    return {
      NO_APP_CONFIG: 'Unable to receive application configuration',
      NO_PERMISSIONS: 'No permissions provided',
    };
  }

  static get TYPE(): Record<TEAM_ERROR_TYPE, TEAM_ERROR_TYPE> {
    return {
      NO_APP_CONFIG: TEAM_ERROR_TYPE.NO_APP_CONFIG,
      NO_PERMISSIONS: TEAM_ERROR_TYPE.NO_PERMISSIONS,
    };
  }
}
