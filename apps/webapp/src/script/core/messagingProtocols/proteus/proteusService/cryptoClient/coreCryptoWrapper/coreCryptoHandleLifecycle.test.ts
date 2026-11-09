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

import {result} from 'true-myth';

import {releaseCoreCryptoHandles} from './coreCryptoHandleLifecycle';

describe('releaseCoreCryptoHandles', () => {
  it('releases PKI, CoreCrypto, and Database handles before reopening', () => {
    const operations: string[] = [];
    const releaseResult = releaseCoreCryptoHandles({
      pkiEnvironment: {
        uniffiDestroy: () => {
          return operations.push('pki');
        },
      },
      instance: {
        uniffiDestroy: () => {
          return operations.push('core-crypto');
        },
      },
      database: {
        uniffiDestroy: () => {
          return operations.push('database');
        },
      },
    });

    if (result.isOk(releaseResult)) {
      operations.push('reopen');
    }

    expect(result.isOk(releaseResult)).toBe(true);
    expect(operations).toEqual(['pki', 'core-crypto', 'database', 'reopen']);
  });

  it('attempts every release and preserves the first failure', () => {
    const operations: string[] = [];
    const pkiFailure = new Error('pki release failed');
    const releaseResult = releaseCoreCryptoHandles({
      pkiEnvironment: {
        uniffiDestroy: () => {
          operations.push('pki');
          throw pkiFailure;
        },
      },
      instance: {
        uniffiDestroy: () => {
          return operations.push('core-crypto');
        },
      },
      database: {
        uniffiDestroy: () => {
          return operations.push('database');
        },
      },
    });

    expect(operations).toEqual(['pki', 'core-crypto', 'database']);
    expect(result.isErr(releaseResult)).toBe(true);
    if (result.isErr(releaseResult)) {
      expect(releaseResult.error.message).toBe('Failed to destroy the CoreCrypto PKI environment');
      expect(releaseResult.error.cause).toBe(pkiFailure);
    }
  });
});
