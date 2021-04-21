/*
 * Wire
 * Copyright (C) 2021 Wire Swiss GmbH
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

import {AccessTokenType, parseAccessToken, parseValue} from './parseAccessToken';

describe('parseValue', () => {
  it('parses a value from a key/value string', () => {
    const accessToken =
      'ABC==.v=1.k=1.d=1618838628.t=a.l=.u=39b7f597-dfd1-4dff-86f5-fe1b79cb70a0.c=4720693440453917158';
    const value = parseValue(accessToken, 'u');
    expect(value).toBe('39b7f597-dfd1-4dff-86f5-fe1b79cb70a0');
  });

  it('returns an empty string if the key is not found', () => {
    const accessToken =
      'ABC==.v=1.k=1.d=1618838628.t=a.l=.u=39b7f597-dfd1-4dff-86f5-fe1b79cb70a0.c=4720693440453917158';
    const value = parseValue(accessToken, 'r');
    expect(value).toBe('');
  });
});

describe('parseAccessToken', () => {
  it('parses all information from a stringified access token', () => {
    const accessToken =
      'ABC==.v=1.k=1.d=1618838628.t=a.l=.u=39b7f597-dfd1-4dff-86f5-fe1b79cb70a0.c=4720693440453917158';
    const parsedAccessToken = parseAccessToken(accessToken);
    expect(parsedAccessToken.clientId).toBe('4720693440453917158');
    expect(parsedAccessToken.expirationDate.toISOString()).toBe('2021-04-19T13:23:48.000Z');
    expect(parsedAccessToken.keyIndex).toBe(1);
    expect(parsedAccessToken.tag).toBe('');
    expect(parsedAccessToken.token).toBe('ABC==');
    expect(parsedAccessToken.type).toBe(AccessTokenType.ACCESS_DATA);
    expect(parsedAccessToken.userData).toBe('');
    expect(parsedAccessToken.userId).toBe('39b7f597-dfd1-4dff-86f5-fe1b79cb70a0');
    expect(parsedAccessToken.version).toBe(1);
  });

  it('parses token information from a cookie', () => {
    const zuid = 'XYZ==.v=1.k=1.d=1621428214.t=u.l=.u=8a88604a-430a-42ed-966e-19a35c3d292a.r=1019f4ca';
    const parsedCookie = parseAccessToken(zuid);
    expect(parsedCookie.type).toBe(AccessTokenType.USER_DATA);
    expect(parsedCookie.userData).toBe('1019f4ca');
  });
});
