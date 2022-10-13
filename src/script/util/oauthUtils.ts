/*
 * Wire
 * Copyright (C) 2022 Wire Swiss GmbH
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

import {Config} from '../Config';
import {ROUTE} from '../auth/route';
import axios from 'axios';
import {UrlUtil} from '@wireapp/commons';

interface TokenRequestBody extends Record<string, string> {
  code: string;
  grant_type: string;
  redirect_uri: string;
  client_id: string;
  client_secret: string;
}

interface TokenResponseData {
  access_token: string;
  refresh_token: string;
  scope: string;
  id_token: string;
  token_type: string;
  expires_in: number;
}

const OAUTH_CONFIG = {
  REDIRECT_URI: `${Config.getConfig().APP_BASE}/auth#${ROUTE.OAUTH}`,
  RESPONSE_TYPE: 'code',
  SCOPE: 'openid profile email',
  TOKEN_GRANT_TYPE: 'authorization_code',
} as const;

export const getOAuthTokenID = async (code: string) => {
  const requestBody: TokenRequestBody = {
    //we're not sure whether we'll send secrets here or via Authorisation Token (if at all)
    client_id: Config.getConfig().OIDC_OAUTH_CLIENT_ID,

    client_secret: Config.getConfig().OIDC_OAUTH_CLIENT_SECRET,

    code,

    grant_type: OAUTH_CONFIG.TOKEN_GRANT_TYPE,
    redirect_uri: OAUTH_CONFIG.REDIRECT_URI,
  };
  const requestBodyUrlEncoded = new URLSearchParams(requestBody).toString();

  const {data} = await axios.post<TokenResponseData>(Config.getConfig().OIDC_OAUTH_TOKEN_URI, requestBodyUrlEncoded, {
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
  });

  return data;
};

const OAUTH_STORAGE_KEY = 'oauth_state';

export const OAuthStateStorage = {
  getState: () => {
    return window.localStorage.getItem(OAUTH_STORAGE_KEY);
  },
  setState: (state: string) => {
    window.localStorage.setItem(OAUTH_STORAGE_KEY, state);
  },
};

export const getOAuthAuthorizeUrl = (state: string) => {
  const authorizeUrl = UrlUtil.pathWithParams(Config.getConfig().OIDC_OAUTH_AUTHORIZATION_URI, {
    client_id: Config.getConfig().OIDC_OAUTH_CLIENT_ID,
    redirect_uri: OAUTH_CONFIG.REDIRECT_URI,
    response_type: OAUTH_CONFIG.RESPONSE_TYPE,
    scope: OAUTH_CONFIG.SCOPE,
    state,
  });

  return authorizeUrl.toString();
};

export const validateOAuthState = (state: string | null) => {
  const storedState = OAuthStateStorage.getState();

  const storedStateMatches = state && storedState && state === storedState;

  return storedStateMatches;
};

export enum OAUTH_ERROR_CODE {
  INTERACTION_REQUIRED = 'interaction_required',
  LOGIN_REQUIRED = 'login_required',
  ACCOUNT_SELECTION_REQUIRED = 'account_selection_required',
  CONSENT_REQUIRED = 'consent_required',
  INVALID_REQUEST_URI = 'invalid_request_uri',
  INVALID_REQUEST_OBJECT = 'invalid_request_object',
  REQUEST_NOT_SUPPORTED = 'request_not_supported',
  REQUEST_URI_NOT_SUPPORTED = 'request_uri_not_supported',
  REGISTRATION_NOT_SUPPORTED = 'registration_not_supported',
}

enum OAUTH_ERROR_PARAMS {
  CODE = 'error',
  DESCRIPTION = 'error_description',
  URI = 'error_uri',
}

interface OAuthError {
  code: OAUTH_ERROR_CODE;
  description: string | null;
  uri: string | null;
}

export const validateOAuthErrorParams = (params: URLSearchParams): OAuthError | null => {
  const errorCode = params.get(OAUTH_ERROR_PARAMS.CODE) as OAUTH_ERROR_CODE | null;
  const errorDescription = params.get(OAUTH_ERROR_PARAMS.DESCRIPTION);
  const errorUri = params.get(OAUTH_ERROR_PARAMS.URI);

  if (!errorCode) {
    //no error, successful response
    return null;
  }

  return {
    code: errorCode,
    description: errorDescription,
    uri: errorUri,
  };
};
