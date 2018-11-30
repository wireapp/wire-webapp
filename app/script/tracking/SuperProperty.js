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

window.z = window.z || {};
window.z.tracking = z.tracking || {};

/**
 * Enumeration of properties that should get send with every user tracking call.
 * @returns {z.tracking.SuperProperty} Super property identifier
 */
z.tracking.SuperProperty = {
  APP: 'app',
  APP_VERSION: 'App Version',
  CONTACTS: 'contacts',
  DESKTOP_APP: 'desktop_app',
  TEAM: {
    IN_TEAM: 'team.in_team',
    SIZE: 'team.size',
  },
  WRAPPER_VERSION: 'wrapper_version',
};
