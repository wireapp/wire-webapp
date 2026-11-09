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

import {createDeterministicClock, type DeterministicClock} from '@enormora/clock/deterministic-clock';
import {result} from 'true-myth';

import {
  coreCryptoOpfsRemovalRetryDelaysInMilliseconds,
  coreCryptoSqliteFileSuffixes,
  type CoreCryptoOpfsDirectory,
  removeCoreCryptoOpfsDatabase,
} from './coreCryptoOpfsStorage';

const createClock = (): DeterministicClock => {
  return createDeterministicClock({initialUnixEpochMicroseconds: 0n});
};

const asDirectory = (
  directory: Partial<Record<keyof CoreCryptoOpfsDirectory, CoreCryptoOpfsDirectory[keyof CoreCryptoOpfsDirectory]>>,
): CoreCryptoOpfsDirectory => {
  return directory as CoreCryptoOpfsDirectory;
};

const flushMicrotasks = async (): Promise<void> => {
  for (let index = 0; index < 10; index += 1) {
    await Promise.resolve();
  }
};

describe('removeCoreCryptoOpfsDatabase', () => {
  it('removes the database and every stable V11 SQLite companion file', async () => {
    const removeEntry = jest.fn().mockResolvedValue(undefined);
    const coreCryptoDirectory = asDirectory({removeEntry});
    const opfsRoot = asDirectory({
      getDirectoryHandle: jest.fn().mockResolvedValue(coreCryptoDirectory),
    });

    const outcome = await removeCoreCryptoOpfsDatabase(opfsRoot, 'corecrypto-user', createClock());

    expect(result.isOk(outcome)).toBe(true);
    expect(
      removeEntry.mock.calls.map(([entryName]) => {
        return entryName;
      }),
    ).toEqual(
      coreCryptoSqliteFileSuffixes.map(suffix => {
        return `corecrypto-user${suffix}`;
      }),
    );
  });

  it('succeeds when the CoreCrypto OPFS directory does not exist', async () => {
    const opfsRoot = asDirectory({
      getDirectoryHandle: jest.fn().mockRejectedValue(new DOMException('missing', 'NotFoundError')),
    });

    const outcome = await removeCoreCryptoOpfsDatabase(opfsRoot, 'corecrypto-user', createClock());

    expect(result.isOk(outcome)).toBe(true);
  });

  it('retries while the CoreCrypto worker is releasing a file handle', async () => {
    const clock = createClock();
    let databaseRemovalAttempts = 0;
    const removeEntry = jest.fn(async (entryName: string) => {
      if (entryName !== 'corecrypto-user') {
        return Promise.reject(new DOMException('missing', 'NotFoundError'));
      }
      databaseRemovalAttempts += 1;
      return databaseRemovalAttempts < 3
        ? Promise.reject(new DOMException('still locked', 'NoModificationAllowedError'))
        : Promise.resolve();
    });
    const opfsRoot = asDirectory({
      getDirectoryHandle: jest.fn().mockResolvedValue(asDirectory({removeEntry})),
    });

    const outcomePromise = removeCoreCryptoOpfsDatabase(opfsRoot, 'corecrypto-user', clock).toPromise();
    await flushMicrotasks();
    expect(databaseRemovalAttempts).toBe(1);

    clock.advanceByMilliseconds(coreCryptoOpfsRemovalRetryDelaysInMilliseconds[0]);
    await flushMicrotasks();
    expect(databaseRemovalAttempts).toBe(2);

    clock.advanceByMilliseconds(coreCryptoOpfsRemovalRetryDelaysInMilliseconds[1]);
    const outcome = await outcomePromise;

    expect(result.isOk(outcome)).toBe(true);
    expect(databaseRemovalAttempts).toBe(3);
  });

  it('reports a file which remains locked after every retry', async () => {
    const clock = createClock();
    const removeEntry = jest.fn(async (entryName: string) => {
      return entryName === 'corecrypto-user'
        ? Promise.reject(new DOMException('still locked', 'NoModificationAllowedError'))
        : Promise.reject(new DOMException('missing', 'NotFoundError'));
    });
    const opfsRoot = asDirectory({
      getDirectoryHandle: jest.fn().mockResolvedValue(asDirectory({removeEntry})),
    });

    const outcomePromise = removeCoreCryptoOpfsDatabase(opfsRoot, 'corecrypto-user', clock).toPromise();
    await flushMicrotasks();
    for (const delay of coreCryptoOpfsRemovalRetryDelaysInMilliseconds) {
      clock.advanceByMilliseconds(delay);
      await flushMicrotasks();
    }
    const outcome = await outcomePromise;

    expect(result.isErr(outcome)).toBe(true);
    if (result.isErr(outcome)) {
      expect(outcome.error.message).toBe('Failed to remove CoreCrypto OPFS database "corecrypto-user"');
      expect(outcome.error.cause).toEqual(new DOMException('still locked', 'NoModificationAllowedError'));
    }
    expect(removeEntry).toHaveBeenCalledTimes(coreCryptoSqliteFileSuffixes.length + 6);
  });

  it('reports non-locking deletion failures without retrying', async () => {
    const removalError = new DOMException('permission denied', 'SecurityError');
    const removeEntry = jest.fn(async (entryName: string) => {
      return entryName === 'corecrypto-user'
        ? Promise.reject(removalError)
        : Promise.reject(new DOMException('missing', 'NotFoundError'));
    });
    const opfsRoot = asDirectory({
      getDirectoryHandle: jest.fn().mockResolvedValue(asDirectory({removeEntry})),
    });

    const outcome = await removeCoreCryptoOpfsDatabase(opfsRoot, 'corecrypto-user', createClock());

    expect(result.isErr(outcome)).toBe(true);
    if (result.isErr(outcome)) {
      expect(outcome.error.cause).toBe(removalError);
    }
    expect(removeEntry).toHaveBeenCalledTimes(coreCryptoSqliteFileSuffixes.length);
  });
});
