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

import {Cookie as ToughCookie} from 'tough-cookie';

import {AccessTokenData} from '../auth';

const obfuscationLengthLimit = 20;

const obfuscateAccessToken = (accessToken: AccessTokenData, enabled = true): AccessTokenData => {
  if (enabled) {
    return {
      ...accessToken,
      access_token: `${accessToken.access_token.substr(0, obfuscationLengthLimit)}...`,
    };
  }
  return accessToken;
};

const obfuscateCookie = (cookie: ToughCookie, enabled = true): ToughCookie => {
  if (enabled) {
    const obfuscatedCookie = cookie.clone();
    obfuscatedCookie.value = `${cookie.value.substr(0, obfuscationLengthLimit)}...`;
    return obfuscatedCookie;
  }
  return cookie;
};

export const ObfuscationUtil = {
  obfuscateAccessToken,
  obfuscateCookie,
};
