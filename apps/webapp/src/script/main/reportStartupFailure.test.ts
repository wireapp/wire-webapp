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

import {asyncNoop} from 'noop-esm';

import {BASE_ERROR_TYPE, BaseError} from '../error/baseError';

import {reportStartupFailure} from './reportStartupFailure';

describe('reportStartupFailure', () => {
  it('reports startup failure before handling a BaseError', async () => {
    const baseError = new BaseError(BASE_ERROR_TYPE.UNKNOWN, 'Expected startup failure');
    const reportStartup = jest.fn(asyncNoop);
    const handleBaseError = jest.fn(asyncNoop);

    await expect(reportStartupFailure(baseError, {handleBaseError, reportStartup})).resolves.toBeUndefined();

    expect(reportStartup).toHaveBeenCalledWith('failure');
    expect(handleBaseError).toHaveBeenCalledWith(baseError);
    expect(reportStartup.mock.invocationCallOrder[0]).toBeLessThan(handleBaseError.mock.invocationCallOrder[0]);
  });

  it('reports startup failure before rethrowing an unexpected error', async () => {
    const unexpectedError = new Error('Unexpected startup failure');
    const reportStartup = jest.fn(asyncNoop);
    const handleBaseError = jest.fn(asyncNoop);

    await expect(reportStartupFailure(unexpectedError, {handleBaseError, reportStartup})).rejects.toBe(
      unexpectedError,
    );

    expect(reportStartup).toHaveBeenCalledWith('failure');
    expect(handleBaseError).not.toHaveBeenCalled();
  });
});
