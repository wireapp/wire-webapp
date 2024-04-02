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

import {ObfuscationUtil} from './ObfuscationUtil';

import {AccessTokenData} from '../auth';

describe('ObfuscationUtil', () => {
  const accessTokenData: AccessTokenData = {
    access_token:
      'iJCRCjc8oROO-dkrkqCXOade997oa8Jhbz6awMUQPBQo80VenWqp_oNvfY6AnU5BxEsdDPOBfBP-uz_b0gAKBQ==.v=1.k=1.d=1498600993.t=a.l=.u=aaf9a833-ef30-4c22-86a0-9adc8a15b3b4.c=15037015562284012115',
    expires_in: 900,
    token_type: 'Bearer',
    user: 'aaf9a833-ef30-4c22-86a0-9adc8a15b3b4',
  };

  const cookie = ToughCookie.parse(
    'zuid=SBMt4gP7v-SAxxP_8OEVVeTw11CeUBAV1Jx5AwdQNjcbgTIqvkhfmd8COLG5V3OrOJ==.v=1.k=1.d=1535117120.t=1234; Path=/access; Domain=example.com; HttpOnly; Secure',
  );

  it('obfuscates an access token', () => {
    const obfuscatedToken = ObfuscationUtil.obfuscateAccessToken(accessTokenData);
    expect(obfuscatedToken.access_token).not.toBe(accessTokenData.access_token);
  });

  it(`doesn't obfuscate an access token when disabled`, () => {
    const obfuscatedToken = ObfuscationUtil.obfuscateAccessToken(accessTokenData, false);
    expect(obfuscatedToken.access_token).toBe(accessTokenData.access_token);
  });

  it('obfuscates a cookie', () => {
    expect(cookie).toBeDefined();
    const obfuscatedCookie = ObfuscationUtil.obfuscateCookie(cookie!);
    expect(cookie!.value).not.toBe(obfuscatedCookie.value);
  });

  it(`doesn't obfuscate a cookie when disabled`, () => {
    expect(cookie).toBeDefined();
    const obfuscatedCookie = ObfuscationUtil.obfuscateCookie(cookie!, false);
    expect(cookie!.value).toBe(obfuscatedCookie.value);
  });
});
