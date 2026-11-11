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

import type {MetaClient} from '../core/client/clientService';
import {CLIENT_ERROR_TYPE, ClientError} from '../error/clientError';
import type {Logger} from '../util/logger';

import {loadLocalClient} from './loadLocalClient';

const createLogger = (): Logger => {
  return {error: jest.fn()} as unknown as Logger;
};

describe('loadLocalClient', () => {
  it('returns the local client', async () => {
    const localClient = {id: 'local-client'} as MetaClient;

    await expect(
      loadLocalClient(() => {
        return Promise.resolve(localClient);
      }, createLogger()),
    ).resolves.toBe(localClient);
  });

  it('reports NO_VALID_CLIENT when there is no local client', async () => {
    await expect(
      loadLocalClient(() => {
        return Promise.resolve(undefined);
      }, createLogger()),
    ).rejects.toEqual(expect.objectContaining({type: CLIENT_ERROR_TYPE.NO_VALID_CLIENT}));
  });

  it('reports DATABASE_FAILURE instead of NO_VALID_CLIENT when the local client cannot be loaded', async () => {
    const logger = createLogger();
    const databaseError = new Error('Internal error opening backing store for indexedDB.open.');

    const result = loadLocalClient(() => {
      return Promise.reject(databaseError);
    }, logger);

    await expect(result).rejects.toBeInstanceOf(ClientError);
    await expect(result).rejects.toEqual(expect.objectContaining({type: CLIENT_ERROR_TYPE.DATABASE_FAILURE}));
    expect(logger.error).toHaveBeenCalledWith(expect.any(String), databaseError);
  });
});
