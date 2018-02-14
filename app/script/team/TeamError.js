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

'use strict';

window.z = window.z || {};
window.z.team = z.team || {};

z.team.TeamError = class TeamError extends Error {
  constructor(type) {
    super();

    this.name = this.constructor.name;
    this.stack = new Error().stack;
    this.type = type || z.team.TeamError.TYPE.UNKNOWN;

    switch (this.type) {
      case z.team.TeamError.TYPE.NO_PERMISSIONS:
        this.message = 'No permissions provided';
        break;
      default:
        this.message = 'Unknown TeamError';
    }
  }

  static get TYPE() {
    return {
      NO_PERMISSIONS: 'z.team.TeamError.TYPE.NO_PERMISSIONS',
      UNKNOWN: 'z.team.TeamError.TYPE.UNKNOWN',
    };
  }
};
