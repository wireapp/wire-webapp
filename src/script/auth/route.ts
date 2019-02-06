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
  IMMEDIATE_LOGIN: 'immediate_login',
  JOIN_EXPIRES: 'expires_in',
  LANGUAGE: 'hl',
  LOCALE: 'hl',
  LOGOUT_REASON: 'reason',
  PWA_AWARE: 'pwa_aware',
  SSO_CODE: 'sso_code',
  TRACKING: 'tracking',
};

const FORWARDED_QUERY_KEYS = [QUERY_KEY.ENVIRONMENT, QUERY_KEY.LOCALE, QUERY_KEY.TRACKING];

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
  LOGIN: '/login',
  SSO: '/sso',
  VERIFY: '/verify',
};

export {ROUTE, QUERY_KEY, FORWARDED_QUERY_KEYS, LOGOUT_REASON};
