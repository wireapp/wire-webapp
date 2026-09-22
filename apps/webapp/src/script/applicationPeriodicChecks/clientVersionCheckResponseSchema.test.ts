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
import {result} from 'true-myth';

import {
  clientVersionCheckResponseSchema,
  invalidClientVersionCheckRequestHttpStatusCode,
  reloadClientVersionCheckAction,
  successfulClientVersionCheckHttpStatusCode,
  upgradeRequiredHttpStatusCode,
  validateClientVersionCheckResponse,
} from './clientVersionCheckResponseSchema';

describe('clientVersionCheckResponseSchema', () => {
  const unsupportedClientVersionCheckHttpStatusCode = 500;

  it.each([
    {httpStatusCode: successfulClientVersionCheckHttpStatusCode},
    {httpStatusCode: invalidClientVersionCheckRequestHttpStatusCode},
    {
      httpStatusCode: upgradeRequiredHttpStatusCode,
      responseBody: {action: reloadClientVersionCheckAction},
    },
  ])('accepts valid client version check response %#', response => {
    expect(clientVersionCheckResponseSchema.safeParse(response).success).toBe(true);
  });

  it.each([
    {httpStatusCode: upgradeRequiredHttpStatusCode},
    {httpStatusCode: upgradeRequiredHttpStatusCode, responseBody: {action: 'logout'}},
    {httpStatusCode: unsupportedClientVersionCheckHttpStatusCode},
  ])('rejects invalid client version check response %#', response => {
    expect(clientVersionCheckResponseSchema.safeParse(response).success).toBe(false);
  });
});

describe('validateClientVersionCheckResponse()', () => {
  const unsupportedClientVersionCheckHttpStatusCode = 500;

  it('returns Result ok for HTTP 200 response payload', () => {
    const validationResult = validateClientVersionCheckResponse({
      httpStatusCode: successfulClientVersionCheckHttpStatusCode,
    });

    assert(result.isOk(validationResult));

    expect(validationResult.value).toEqual({
      httpStatusCode: successfulClientVersionCheckHttpStatusCode,
    });
  });

  it('returns Result ok for HTTP 400 response payload', () => {
    const validationResult = validateClientVersionCheckResponse({
      httpStatusCode: invalidClientVersionCheckRequestHttpStatusCode,
    });

    assert(result.isOk(validationResult));

    expect(validationResult.value).toEqual({
      httpStatusCode: invalidClientVersionCheckRequestHttpStatusCode,
    });
  });

  it('returns Result ok for HTTP 426 response payload with reload action', () => {
    const validationResult = validateClientVersionCheckResponse({
      httpStatusCode: upgradeRequiredHttpStatusCode,
      responseBody: {action: reloadClientVersionCheckAction},
    });

    assert(result.isOk(validationResult));

    expect(validationResult.value).toEqual({
      httpStatusCode: upgradeRequiredHttpStatusCode,
      responseBody: {action: reloadClientVersionCheckAction},
    });
  });

  it('returns Result err for HTTP 426 response payload with invalid body', () => {
    const validationResult = validateClientVersionCheckResponse({
      httpStatusCode: upgradeRequiredHttpStatusCode,
      responseBody: {action: 'logout'},
    });

    expect(result.isErr(validationResult)).toBe(true);
  });

  it('returns Result err for unsupported status code', () => {
    const validationResult = validateClientVersionCheckResponse({
      httpStatusCode: unsupportedClientVersionCheckHttpStatusCode,
    });

    expect(result.isErr(validationResult)).toBe(true);
  });
});
