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

'use strict';

window.z = window.z || {};
window.z.tracking = z.tracking || {};

/**
 * Enum of custom dimensions for Localytics
 *
 * @note Custom Dimensions for Localytics have to be created server side and are
 *   identified by the index found in the settings of Desktop and Desktop staging projects
 * @see https://dashboard.localytics.com/settings/apps?org_id=1145
 *
 * @returns {z.tracking.CustomDimension} Enum of custom dimensions
 */
z.tracking.CustomDimension = {
  APP: 0,
  CONTACTS: 1,
};
