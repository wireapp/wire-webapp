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


import {toError} from 'Util/toError';

describe('toError', () => {
  it('returns error instances unchanged', () => {
    const error = new Error('Server Error');

    const actual = toError(error);

    expect(actual).toBe(error);
  });

  it('wraps string values into errors', () => {
    const actual = toError('Server Error');

    expect(actual.message).toBe('Server Error');
  });

  it('wraps objects with a message into errors', () => {
    const source = {message: 'Server Error'};

    const actual = toError(source);

    expect(actual.message).toBe('Server Error');
    expect(actual.cause).toBe(source);
  });

  it('wraps objects without a message into unknown errors', () => {
    const source = {code: 500};

    const actual = toError(source);

    expect(actual.message).toBe('Unknown error');
    expect(actual.cause).toBe(source);
  });

  it('wraps objects with a non-string message into unknown errors', () => {
    const source = {message: 500};

    const actual = toError(source);

    expect(actual.message).toBe('Unknown error');
    expect(actual.cause).toBe(source);
  });

  it('wraps non-string primitive values into unknown errors', () => {
    const source = 500;

    const actual = toError(source);

    expect(actual.message).toBe('Unknown error');
    expect(actual.cause).toBe(source);
  });
});
