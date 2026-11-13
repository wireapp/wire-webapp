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

import {getSafeErrorDetails, redactSensitiveData, sanitizeLogMessage} from '../commons/util/StringUtil';

describe('redactSensitiveData', () => {
  it('redacts Bearer token in plain strings', () => {
    const input = 'Authorization: Bearer abcd1234.DEF456ghi==';
    const output = redactSensitiveData(input);
    expect(output).toBe('Authorization: Bearer [REDACTED]');
  });

  it('redacts Authorization header in object', () => {
    const input = {
      headers: {
        Authorization: 'Bearer my.secret.token',
      },
    };
    const output = redactSensitiveData(input);
    expect(output.headers.Authorization).toBe('Bearer [REDACTED]');
  });

  it('does not modify unrelated strings', () => {
    const input = 'This is safe';
    const output = redactSensitiveData(input);
    expect(output).toBe('This is safe');
  });

  it('does not modify unrelated objects', () => {
    const input = {foo: 'bar'};
    const output = redactSensitiveData(input);
    expect(output).toEqual({foo: 'bar'});
  });
});

describe('sanitizeLogMessage', () => {
  it('redacts query parameters, cookies, and JSON web tokens', () => {
    const jwtLikeValue = ['eyJhbGciOiJub25lIn0', 'eyJzdWIiOiIxIn0', 'signature'].join('.');
    const input = `wss://example.com/events?access_token=access-token&sync_marker=sync-marker Cookie: session=cookie-value ${jwtLikeValue}`;

    const actualSanitizedMessage = sanitizeLogMessage(input);
    const expectedSanitizedMessage = 'wss://example.com/events?[REDACTED] Cookie: [REDACTED] [REDACTED]';

    expect(actualSanitizedMessage).toBe(expectedSanitizedMessage);
  });

  it('removes newlines and limits the message length', () => {
    const actualSanitizedMessage = sanitizeLogMessage(`first line\n${'x'.repeat(250)}`);

    expect(actualSanitizedMessage).toHaveLength(200);
    expect(actualSanitizedMessage).toContain('first line ');
  });
});

describe('getSafeErrorDetails', () => {
  it('returns a safe error name and message', () => {
    const actualErrorDetails = getSafeErrorDetails(
      Object.assign(new Error('Bearer secret-token'), {name: 'RequestError'}),
    );

    expect(actualErrorDetails).toEqual({
      errorMessage: '"Bearer [REDACTED]"',
      errorName: 'RequestError',
    });
  });
});
