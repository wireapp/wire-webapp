/*
 * Wire
 * Copyright (C) 2026 Wire Swiss GmbH
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

import assert from 'node:assert';

import {commandFailureWithCause, commandSuccess, errorMessage, redactSecret} from './releaseAppearanceCommandResult.ts';

describe('release appearance command result helpers', (): void => {
  it('creates a successful result', (): void => {
    const result = commandSuccess('value');

    assert(result.isOk);
    expect(result.value).toBe('value');
  });

  it('creates a failed result with its cause', (): void => {
    const cause = new Error('cause');
    const result = commandFailureWithCause<string>('failure', cause);

    assert(result.isErr);
    expect(result.error.message).toBe('failure');
    expect(result.error.cause).toBe(cause);
  });

  it.each([
    [new Error('known failure'), 'known failure'],
    ['unexpected value', 'Unknown failure'],
  ])('normalizes an error message', function normalizesErrorMessage(error: unknown, expectedMessage: string): void {
    expect(errorMessage(error)).toBe(expectedMessage);
  });

  it('redacts a secret from a message', (): void => {
    expect(redactSecret('token is secret', 'secret')).toBe('token is [REDACTED]');
    expect(redactSecret('nothing to redact', '')).toBe('nothing to redact');
  });
});
