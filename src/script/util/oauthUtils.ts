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
import {constructUrlWithSearchParams} from 'Util/constructUrlWithSearchParams';

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
  const authorizeUrl = constructUrlWithSearchParams(Config.getConfig().OIDC_OAUTH_AUTHORIZATION_URI, {
    client_id: Config.getConfig().OIDC_OAUTH_CLIENT_ID,
    redirect_uri: OAUTH_CONFIG.REDIRECT_URI,
    response_type: OAUTH_CONFIG.RESPONSE_TYPE,
    scope: OAUTH_CONFIG.SCOPE,
    state,
  });

  return authorizeUrl.toString();
};
