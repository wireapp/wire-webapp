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

export const QUERY_KEY = {
  ACCOUNT_ID: 'id', // account ID passed from the wrapper to the webview
  APPLOCK_SCHEDULED_TIMEOUT: 'applock_scheduled_timeout',
  APPLOCK_UNFOCUS_TIMEOUT: 'applock_unfocus_timeout',
  CLIENT_TYPE: 'clienttype',
  CONVERSATION_CODE: 'join_code',
  CONVERSATION_KEY: 'join_key',
  CURRENCY: 'currency',
  DESTINATION_URL: 'destination_url',
  ENVIRONMENT: 'env',
  IMMEDIATE_LOGIN: 'immediate_login',
  JOIN_EXPIRES: 'expires_in',
  LANGUAGE: 'hl',
  LOCALE: 'hl',
  LOGOUT_REASON: 'reason',
  PERSIST_TEMPORARY_CLIENTS: 'persist_temporary_clients',
  PWA_AWARE: 'pwa_aware',
  SSO_AUTO_LOGIN: 'sso_auto_login',
  TRACKING: 'tracking',
};

export const FORWARDED_QUERY_KEYS = [
  QUERY_KEY.ACCOUNT_ID,
  QUERY_KEY.APPLOCK_SCHEDULED_TIMEOUT,
  QUERY_KEY.APPLOCK_UNFOCUS_TIMEOUT,
  QUERY_KEY.ENVIRONMENT,
  QUERY_KEY.LOCALE,
  QUERY_KEY.PERSIST_TEMPORARY_CLIENTS,
  QUERY_KEY.TRACKING,
];

export const LOGOUT_REASON = {
  ACCOUNT_REMOVED: 'deleted',
  CLIENT_REMOVED: 'client_removed',
  SESSION_EXPIRED: 'expired',
};

export const ROUTE = {
  CHECK_PASSWORD: '/checkpassword',
  CLIENTS: '/clients',
  CONVERSATION_JOIN: '/join-conversation',
  CONVERSATION_JOIN_INVALID: '/join-conversation-invalid',
  CREATE_ACCOUNT: '/createaccount',
  CREATE_TEAM: '/createteam',
  CREATE_TEAM_ACCOUNT: '/createteamaccount',
  CUSTOM_ENV_REDIRECT: '/custom-env-redirect',
  HISTORY_INFO: '/historyinfo',
  INDEX: '/',
  INITIAL_INVITE: '/teaminvite',
  LOGIN: '/login',
  LOGIN_PHONE: '/phonelogin',
  SET_ACCOUNT_TYPE: '/setaccounttype',
  SET_EMAIL: '/setemail',
  SET_HANDLE: '/sethandle',
  SET_PASSWORD: '/setpassword',
  SSO: '/sso',
  VERIFY_EMAIL_CODE: '/verifyemailcode',
  VERIFY_EMAIL_LINK: '/verifyemaillink',
  VERIFY_PHONE_CODE: '/verifyphonecode',
};
