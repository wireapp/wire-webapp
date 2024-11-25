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

import {LOGOUT_REASON} from '../route';

export const logoutReasonStrings = {
  [LOGOUT_REASON.ACCOUNT_REMOVED]: 'LOGOUT_REASON.ACCOUNT_REMOVED',
  [LOGOUT_REASON.CLIENT_REMOVED]: 'LOGOUT_REASON.CLIENT_REMOVED',
  [LOGOUT_REASON.NO_APP_CONFIG]: 'LOGOUT_REASON.NO_APP_CONFIG',
  [LOGOUT_REASON.SESSION_EXPIRED]: 'LOGOUT_REASON.SESSION_EXPIRED',
};
