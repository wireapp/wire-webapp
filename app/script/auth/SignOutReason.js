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
window.z.auth = z.auth || {};

z.auth.SignOutReason = {
  APP_INIT: 'app_init',
  CLIENT_REMOVED: 'client_removed',
  INDEXED_DB: 'indexed_db',
  MULTIPLE_TABS: 'multiple_tabs',
  NOT_SIGNED_IN: 'not_signed_in',
  SESSION_EXPIRED: 'session_expired',
  USER_REQUESTED: 'user_requested',
};
