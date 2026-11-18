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

import {StatusCodes} from 'http-status-codes';

import {getSafeNotificationErrorDetails} from './getSafeNotificationErrorDetails';

import {BackendError} from '../apiClient/http/backendError';

describe('getSafeNotificationErrorDetails', () => {
  it.each(['Services are not set.', 'Button action message has no button action content', 'Network Error'])(
    'preserves the known-safe message "%s"',
    message => {
      const actualDetails = getSafeNotificationErrorDetails(new Error(message));

      expect(actualDetails).toStrictEqual({errorName: 'Error', errorMessage: message});
    },
  );

  it('omits an arbitrary message and preserves a safe error name without mutating the error', () => {
    const sensitiveMessage = 'Could not decrypt private-plaintext using private-key';
    const error = Object.freeze(Object.assign(new Error(sensitiveMessage), {name: 'NotificationError'}));

    const actualDetails = getSafeNotificationErrorDetails(error);

    expect(actualDetails).toStrictEqual({errorName: 'NotificationError'});
    expect(error.message).toBe(sensitiveMessage);
    expect(error.name).toBe('NotificationError');
  });

  it.each([
    {status: StatusCodes.SERVICE_UNAVAILABLE, expectedMessage: 'Backend request failed (HTTP 503)'},
    {status: undefined, expectedMessage: 'Backend request failed'},
  ])('keeps safe backend status details when the status is $status', options => {
    const {status, expectedMessage} = options;
    const sensitiveMessage = 'Request failed for private-account';
    const error = Object.freeze(new BackendError(sensitiveMessage, undefined, status));

    const actualDetails = getSafeNotificationErrorDetails(error);

    expect(actualDetails).toStrictEqual({errorName: 'BackendError', errorMessage: expectedMessage});
    expect(error.message).toBe(sensitiveMessage);
    expect(error.code).toBe(status);
  });

  it.each(['private-plaintext', Object.freeze({name: 'Error', message: 'Bearer secret-token'}), undefined])(
    'omits contents of a non-Error value',
    value => {
      const actualDetails = getSafeNotificationErrorDetails(value);

      expect(actualDetails).toStrictEqual({errorName: 'UnknownError'});
    },
  );

  it.each(['Error: private-account', 'A'.repeat(250)])('replaces an unsafe error name', name => {
    const error = Object.freeze(Object.assign(new Error('Network Error'), {name}));

    const actualDetails = getSafeNotificationErrorDetails(error);

    expect(actualDetails).toStrictEqual({errorName: 'UnknownError', errorMessage: 'Network Error'});
    expect(error.name).toBe(name);
  });
});
