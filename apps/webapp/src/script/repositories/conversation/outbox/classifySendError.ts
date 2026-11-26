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

import {isObject} from '@sindresorhus/is';
import {StatusCodes as HTTP_STATUS} from 'http-status-codes';

import type {FailedReason} from './FailedReason';

import {BackendErrorLabel} from '../../../apiClient/http/backendErrorLabel';
import {NetworkError} from '../../../apiClient/http/networkError';
import {RequestCancellationError} from '../../../apiClient/user/userError';

export type SendErrorClass =
  /** Nothing is known to be wrong with the message: try again */
  | {type: 'retry'}
  /** The conversation no longer exists */
  | {type: 'gone'}
  /** The user cancelled the upload */
  | {type: 'cancelled'}
  /** Sending again won't help */
  | {type: 'rejected'; reason: Extract<FailedReason, 'rejected' | 'removed'>; federation: boolean};

const ABORT_ERROR_NAMES = new Set(['AbortError', 'CanceledError', 'TimeoutError']);

// Local, so that this file stays out of the import cycles around the entities

function getLabel(error: unknown): unknown {
  return isObject(error) && 'label' in error ? error.label : undefined;
}

/** An axios error has a `response` once the server answered; its absence means nothing came back */
function isAxiosShaped(error: unknown): error is {response?: {status?: number}} {
  return isObject(error) && (('isAxiosError' in error && error.isAxiosError === true) || 'response' in error);
}

function hasNoResponse(error: unknown): boolean {
  if (error instanceof NetworkError) {
    return true;
  }
  if (error instanceof Error && ABORT_ERROR_NAMES.has(error.name)) {
    return true;
  }
  return isAxiosShaped(error) && error.response === undefined;
}

function getHttpStatus(error: unknown): number | undefined {
  if (isObject(error) && 'code' in error && typeof error.code === 'number') {
    return error.code;
  }
  return isAxiosShaped(error) ? error.response?.status : undefined;
}

/** Says what a failed send means for the message; what `sendMessageToBackend` throws goes in unchanged */
export function classifySendError(error: unknown): SendErrorClass {
  if (error instanceof RequestCancellationError) {
    return {type: 'cancelled'};
  }

  // A federation error carries a 5xx code, but waiting won't fix it
  if (getLabel(error) === BackendErrorLabel.FEDERATION_REMOTE_ERROR) {
    return {type: 'rejected', reason: 'rejected', federation: true};
  }

  if (hasNoResponse(error)) {
    return {type: 'retry'};
  }

  const status = getHttpStatus(error);
  if (status !== undefined) {
    if (
      status === HTTP_STATUS.REQUEST_TIMEOUT ||
      status === HTTP_STATUS.TOO_MANY_REQUESTS ||
      status >= HTTP_STATUS.INTERNAL_SERVER_ERROR
    ) {
      return {type: 'retry'};
    }
    if (status === HTTP_STATUS.NOT_FOUND) {
      return {type: 'gone'};
    }
    if (status === HTTP_STATUS.FORBIDDEN) {
      return {type: 'rejected', reason: 'removed', federation: false};
    }
  }

  return {type: 'rejected', reason: 'rejected', federation: false};
}
