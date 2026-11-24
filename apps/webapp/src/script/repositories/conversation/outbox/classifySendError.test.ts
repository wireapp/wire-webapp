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

import {BackendError} from '../../../apiClient/http/backendError';
import {BackendErrorLabel, SyntheticErrorLabel} from '../../../apiClient/http/backendErrorLabel';
import {NetworkError} from '../../../apiClient/http/networkError';
import {RequestCancellationError} from '../../../apiClient/user/userError';

import {classifySendError, type SendErrorClass} from './classifySendError';

function backendError(
  code: number,
  label: BackendErrorLabel | SyntheticErrorLabel = BackendErrorLabel.CLIENT_ERROR,
): BackendError {
  return new BackendError('failed', label, code);
}

function axiosShapedError(status: number | undefined): Error {
  const error = new Error('axios') as Error & {isAxiosError: true; response?: {status: number}};
  error.isAxiosError = true;
  error.response = status === undefined ? undefined : {status};
  return error;
}

function namedError(name: string): Error {
  const error = new Error(name);
  error.name = name;
  return error;
}

const retry: SendErrorClass = {type: 'retry'};
const gone: SendErrorClass = {type: 'gone'};
const cancelled: SendErrorClass = {type: 'cancelled'};
const rejected: SendErrorClass = {type: 'rejected', reason: 'rejected', federation: false};
const removed: SendErrorClass = {type: 'rejected', reason: 'removed', federation: false};
const federation: SendErrorClass = {type: 'rejected', reason: 'rejected', federation: true};

describe('classifySendError', () => {
  const table: [string, unknown, SendErrorClass][] = [
    ['a network error', new NetworkError('offline'), retry],
    ['an axios error without a response', axiosShapedError(undefined), retry],
    ['an aborted request', namedError('AbortError'), retry],
    ['a cancelled axios request', namedError('CanceledError'), retry],
    ['a timeout', namedError('TimeoutError'), retry],
    ['408', backendError(408), retry],
    ['429', backendError(429), retry],
    ['500', backendError(500), retry],
    ['503', backendError(503), retry],
    ['an axios error with a 502 response', axiosShapedError(502), retry],
    ['404', backendError(404), gone],
    ['an axios error with a 404 response', axiosShapedError(404), gone],
    ['403', backendError(403), removed],
    ['400', backendError(400), rejected],
    ['412', backendError(412), rejected],
    ['a federation error with a 5xx code', backendError(533, BackendErrorLabel.FEDERATION_REMOTE_ERROR), federation],
    ['a federation error without a code', new BackendError('failed', BackendErrorLabel.FEDERATION_REMOTE_ERROR), federation],
    ['a cancelled request', new RequestCancellationError('cancelled'), cancelled],
    ['a cancelled request with a 5xx code', new RequestCancellationError('cancelled', undefined, 500), cancelled],
    ['an error without a code', new Error('boom'), rejected],
    ['something that is not an error', 'boom', rejected],
    ['nothing', undefined, rejected],
  ];

  it.each(table)('classifies %s', (_name, error, expected) => {
    expect(classifySendError(error)).toEqual(expected);
  });
});
