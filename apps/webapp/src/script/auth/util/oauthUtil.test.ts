/*
 * Wire
 * Copyright (C) 2023 Wire Swiss GmbH
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

import {getOAuthQueryString, withOAuthQuery} from './oauthUtil';

const queries = [
  '?scope=read%3Aself&client_id=test&state=a%2Bb%26c&code_challenge=challenge&code_challenge_method=S256',
  '?client_id=test&scope=read%3Aself&state=a%2Bb%26c&code_challenge=challenge&code_challenge_method=S256',
];

describe('OAuth query preservation', () => {
  it.each(queries)('preserves the original query encoding (%s)', query => {
    const location = {hash: `#/login/${query}`};
    expect(getOAuthQueryString(location)).toBe(query);
    expect(withOAuthQuery('/sso', location)).toBe(`/sso${query}`);
  });

  it('handles a route without a query', () => {
    expect(getOAuthQueryString({hash: '#/login'})).toBe('');
    expect(withOAuthQuery('/sso', {hash: '#/login'})).toBe('/sso');
  });

  it('does not forward unrelated query parameters as an OAuth request', () => {
    expect(withOAuthQuery('/sso', {hash: '#/login?unrelated=value'})).toBe('/sso');
  });
});
