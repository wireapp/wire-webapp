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

import {AxiosError} from 'axios';
import {Dexie} from 'dexie';
import {Maybe, result, task} from 'true-myth';

import {BackendError} from '../apiClient/http/backendError';
import {BackendErrorLabel} from '../apiClient/http/backendErrorLabel';
import type {MetaClient} from '../core/client/clientService';
import {LowDiskSpaceError} from '../core/storage/engine/error/lowDiskSpaceError';
import {BASE_ERROR_TYPE} from '../error/baseError';
import {CLIENT_ERROR_TYPE, ClientError} from '../error/clientError';
import type {Logger} from '../util/logger';

import {loadLocalClient} from './loadLocalClient';

// The webapp's global Axios mock omits error constructors and classification.
jest.unmock('axios');

function createLogger(): Logger {
  return {error: jest.fn()} as unknown as Logger;
}

describe('loadLocalClient', () => {
  it('returns the local client', async () => {
    const localClient = {id: 'local-client'} as MetaClient;

    await expect(
      loadLocalClient(() => {
        return task.resolve(Maybe.just(localClient));
      }, createLogger()),
    ).resolves.toEqual(result.ok(localClient));
  });

  it('reports NO_VALID_CLIENT when there is no local client', async () => {
    await expect(
      loadLocalClient(() => {
        return task.resolve(Maybe.nothing());
      }, createLogger()),
    ).resolves.toEqual(result.err(expect.objectContaining({type: CLIENT_ERROR_TYPE.NO_VALID_CLIENT})));
  });

  it.each([
    [new Dexie.OpenFailedError('Cannot open IndexedDB'), CLIENT_ERROR_TYPE.DATABASE_FAILURE],
    [new DOMException('IndexedDB read failed', 'UnknownError'), CLIENT_ERROR_TYPE.DATABASE_FAILURE],
    [new LowDiskSpaceError(), CLIENT_ERROR_TYPE.DATABASE_FAILURE],
    [new BackendError('Server error', BackendErrorLabel.SERVER_ERROR, 500), CLIENT_ERROR_TYPE.REQUEST_FAILURE],
    [new AxiosError('Network unavailable'), CLIENT_ERROR_TYPE.REQUEST_FAILURE],
    [new Error('Client service is not initialized.'), BASE_ERROR_TYPE.UNKNOWN],
  ])('preserves the cause and safely classifies %s as %s', async (originalError, errorType) => {
    const logger = createLogger();

    const loadResult = await loadLocalClient(() => {
      return task.reject(originalError);
    }, logger);

    expect(loadResult.isErr).toBe(true);
    if (loadResult.isErr) {
      expect(loadResult.error).toBeInstanceOf(ClientError);
      expect(loadResult.error.type).toBe(errorType);
      expect(loadResult.error.cause).toBe(originalError);
    }
    expect(logger.error).toHaveBeenCalledWith('Failed to load the local client', {error: originalError});
  });
});
