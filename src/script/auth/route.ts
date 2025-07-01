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
  SSO_AUTO_LOGIN: 'sso_auto_login',
  SCOPE: 'scope',
  TRACKING: 'tracking',
  TWO_FACTOR: '2fa',
};

// These are the query keys that are in the redirect link from the OAuth server
export const OAUTH_QUERY_KEYS = {
  CLIENT_ID: 'client_id',
  REDIRECT_URI: 'redirect_uri',
  RESPONSE_TYPE: 'response_type',
  SCOPE: 'scope',
  STATE: 'state',
  CODE_CHALLENGE: 'code_challenge',
  CODE_CHALLENGE_METHOD: 'code_challenge_method',
  RESPONSE_MODE: 'response_mode',
  CODE: 'code',
  AUTH_USER: 'authuser',
  PROMPT: 'prompt',
  HD: 'hd',
};

export const FORWARDED_QUERY_KEYS = [
  QUERY_KEY.ACCOUNT_ID,
  QUERY_KEY.ENVIRONMENT,
  QUERY_KEY.LOCALE,
  QUERY_KEY.TRACKING,
  ...Object.values(OAUTH_QUERY_KEYS),
];

export const LOGOUT_REASON = {
  ACCOUNT_REMOVED: 'deleted',
  CLIENT_REMOVED: 'client_removed',
  NO_APP_CONFIG: 'no_app_config',
  SESSION_EXPIRED: 'expired',
};

export const ROUTE = {
  AUTHORIZE: '/authorize',
  CLIENTS: '/clients',
  CONVERSATION_JOIN: '/join-conversation',
  CONVERSATION_JOIN_INVALID: '/join-conversation-invalid',
  CREATE_ACCOUNT: '/createaccount',
  CREATE_TEAM: '/createteam',
  CUSTOM_ENV_REDIRECT: '/custom-env-redirect',
  HISTORY_INFO: '/historyinfo',
  INDEX: '/',
  LOGIN: '/login',
  CUSTOM_BACKEND: '/custom-backend',
  SET_ACCOUNT_TYPE: '/setaccounttype',
  SET_EMAIL: '/setemail',
  SET_ENTROPY: '/setentropy',
  SET_HANDLE: '/sethandle',
  SET_PASSWORD: '/setpassword',
  SSO: '/sso',
  VERIFY_EMAIL_CODE: '/verifyemailcode',
  VERIFY_EMAIL_LINK: '/verifyemaillink',
  E2EI_OAUTH_REDIRECT: '/e2ei-redirect',
  SUCCESS: '/success',
};
