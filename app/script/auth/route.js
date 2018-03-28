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

const QUERY_KEY = {
  CONVERSATION_CODE: 'join_code',
  CONVERSATION_KEY: 'join_key',
  CURRENCY: 'currency',
  ENVIRONMENT: 'env',
  JOIN_EXPIRES: 'expires_in',
  LANGUAGE: 'hl',
  LOGOUT_REASON: 'reason',
};

const LOGOUT_REASON = {
  ACCOUNT_REMOVED: 'deleted',
  CLIENT_REMOVED: 'client_removed',
  SESSION_EXPIRED: 'expired',
};

const ROUTE = {
  CHOOSE_HANDLE: '/choosehandle',
  CLIENTS: '/clients',
  CONVERSATION_JOIN: '/join-conversation',
  CONVERSATION_JOIN_INVALID: '/join-conversation-invalid',
  CREATE_ACCOUNT: '/createaccount',
  CREATE_TEAM: '/createteam',
  CREATE_TEAM_ACCOUNT: '/createteamaccount',
  HISTORY_INFO: '/historyinfo',
  INDEX: '/',
  INITIAL_INVITE: '/teaminvite',
  INVITE: '/invite',
  LOGIN: '/login',
  PERSONAL_INVITE: '/personalinvite',
  VERIFY: '/verify',
};

export {ROUTE, QUERY_KEY, LOGOUT_REASON};
