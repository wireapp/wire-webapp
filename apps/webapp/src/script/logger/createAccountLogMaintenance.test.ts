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

import {createDeterministicClock} from '@enormora/clock/deterministic-clock';
import {Maybe} from 'true-myth';

import {createAccountLogMaintenance} from './createAccountLogMaintenance';
import {createOriginPrivateFileSystemLogStore, type LogDirectory} from './createOriginPrivateFileSystemLogStore';
import {logDirectoryName, logPersistenceConfiguration} from './logPersistenceConfiguration';

const firstAccountIdentifier = 'a'.repeat(64);
const secondAccountIdentifier = 'b'.repeat(64);

function createTestStorage(): {
  readonly directory: LogDirectory;
  readonly files: Map<string, Uint8Array>;
  readonly failures: {remove: boolean; generationWrite: boolean};
  readonly identifiers: {generation: number; session: number};
} {
  const files = new Map<string, Uint8Array>();
  const failures = {remove: false, generationWrite: false};
  const directory: LogDirectory = {
    async getDirectoryHandle(name) {
      expect(name).toBe(logDirectoryName);

      return directory;
    },
    async *values() {
      for (const name of files.keys()) {
        yield {kind: 'file', name};
      }
      yield {kind: 'directory', name: 'core-crypto'};
    },
    async removeEntry(name) {
      if (failures.remove) {
        throw new Error('Removal interrupted');
      }
      files.delete(name);
    },
    async getFileHandle(name, options) {
      if (!files.has(name)) {
        if (options?.create !== true) {
          throw Object.assign(new Error('Missing entry'), {name: 'NotFoundError'});
        }
        files.set(name, new Uint8Array());
      }

      function contents(): Uint8Array {
        return Maybe.of(files.get(name)).unwrapOrElse(() => {
          throw new Error('Missing test file');
        });
      }

      return {
        async getFile() {
          return {size: contents().byteLength};
        },
        async createSyncAccessHandle() {
          return {
            getSize() {
              return contents().byteLength;
            },
            read(bytes, options) {
              const source = contents().subarray(options.at, options.at + bytes.byteLength);
              bytes.set(source);

              return source.byteLength;
            },
            write(bytes, options) {
              if (failures.generationWrite && name.endsWith('.generation')) {
                throw Object.assign(new Error('Quota exceeded'), {name: 'QuotaExceededError'});
              }
              const previous = contents();
              const next = new Uint8Array(Math.max(previous.byteLength, options.at + bytes.byteLength));
              next.set(previous);
              next.set(bytes, options.at);
              files.set(name, next);

              return bytes.byteLength;
            },
            truncate(sizeBytes) {
              files.set(name, contents().slice(0, sizeBytes));
            },
            flush() {},
            close() {},
          };
        },
      };
    },
  };

  return {directory, files, failures, identifiers: {generation: 0, session: 0}};
}

function createMaintenance(
  storage: ReturnType<typeof createTestStorage>,
): ReturnType<typeof createAccountLogMaintenance> {
  let precedingOperation = Promise.resolve();

  async function runExclusive<Value>(operation: () => Promise<Value>): Promise<Value> {
    const preceding = precedingOperation;
    const released = Promise.withResolvers<void>();
    precedingOperation = released.promise;
    await preceding;
    try {
      return await operation();
    } finally {
      released.resolve();
    }
  }

  return createAccountLogMaintenance({
    async getDirectory() {
      return storage.directory;
    },
    runExclusive,
    createGenerationIdentifier() {
      storage.identifiers.generation += 1;

      return `00000000-0000-4000-8000-${String(storage.identifiers.generation).padStart(12, '0')}`;
    },
    createStore(accountIdentifier) {
      storage.identifiers.session += 1;

      return createOriginPrivateFileSystemLogStore({
        async getDirectory() {
          return storage.directory;
        },
        clock: createDeterministicClock({initialUnixEpochMicroseconds: 1_000_000_000n}),
        configuration: logPersistenceConfiguration,
        sessionIdentifier: `00000000-0000-4000-8000-${String(storage.identifiers.session).padStart(12, '0')}`,
        accountIdentifier,
      });
    },
  });
}

function readLogs(storage: ReturnType<typeof createTestStorage>): readonly string[] {
  return [...storage.files.entries()]
    .filter(entry => {
      const [name] = entry;

      return name.endsWith('.jsonl');
    })
    .map(entry => {
      const [, bytes] = entry;

      return new TextDecoder().decode(bytes);
    });
}

describe('account log maintenance', () => {
  it('rejects delayed account binding from a worker that started before removal', async () => {
    const storage = createTestStorage();
    const previousSession = createMaintenance(storage);
    const previousWriter = await previousSession.activateAccount(firstAccountIdentifier);
    await previousWriter.append(['{"old":true}\n']);
    const preAuthenticationSession = createMaintenance(storage);
    await preAuthenticationSession.observeAccountGenerations();

    await previousSession.removeAccount(firstAccountIdentifier);

    await expect(preAuthenticationSession.activateAccount(firstAccountIdentifier)).rejects.toThrow(
      'removed after this worker started',
    );
    const freshSession = createMaintenance(storage);
    const freshWriter = await freshSession.activateAccount(firstAccountIdentifier);
    await freshWriter.append(['{"fresh":true}\n']);

    await expect(preAuthenticationSession.activateAccount(firstAccountIdentifier)).rejects.toThrow(
      'removed after this worker started',
    );
    expect(readLogs(storage)).toEqual(['{"fresh":true}\n']);
    await expect(previousWriter.append(['{"old":true}\n'])).rejects.toThrow('revoked');
  });

  it('preserves logs across account changes and same-account restarts', async () => {
    const storage = createTestStorage();
    const maintenance = createMaintenance(storage);
    const firstWriter = await maintenance.activateAccount(firstAccountIdentifier);
    await firstWriter.append(['{"first":true}\n']);
    const secondWriter = await maintenance.activateAccount(secondAccountIdentifier);
    await secondWriter.append(['{"second":true}\n']);
    const restartedWriter = await maintenance.activateAccount(firstAccountIdentifier);
    await restartedWriter.append(['{"restarted":true}\n']);

    expect(readLogs(storage)).toEqual(['{"first":true}\n', '{"second":true}\n', '{"restarted":true}\n']);
  });

  it('deletes only the selected account and revokes its queued and existing writers', async () => {
    const storage = createTestStorage();
    const maintenance = createMaintenance(storage);
    const firstWriter = await maintenance.activateAccount(firstAccountIdentifier);
    const secondWriter = await maintenance.activateAccount(secondAccountIdentifier);
    await firstWriter.append(['{"first":true}\n']);
    await secondWriter.append(['{"second":true}\n']);
    const legacyFilename = 'log-1000000-00000000-0000-4000-8000-000000000003-1.jsonl';
    storage.files.set(legacyFilename, new TextEncoder().encode('{"unattributed":true}\n'));
    storage.files.set('core-crypto', new TextEncoder().encode('unrelated'));
    storage.files.set(`foreign-account-${firstAccountIdentifier}.jsonl`, new TextEncoder().encode('foreign'));

    const outcomes = await Promise.allSettled([
      maintenance.removeAccount(firstAccountIdentifier),
      firstWriter.append(['{"queued":true}\n']),
    ]);
    expect(
      outcomes.map(outcome => {
        return outcome.status;
      }),
    ).toEqual(['fulfilled', 'rejected']);
    await expect(firstWriter.append(['{"stale":true}\n'])).rejects.toThrow('revoked');
    await secondWriter.append(['{"stillActive":true}\n']);
    await maintenance.removeAccount(firstAccountIdentifier);

    expect(readLogs(storage)).toEqual([
      '{"second":true}\n{"stillActive":true}\n',
      '{"unattributed":true}\n',
      'foreign',
    ]);
    expect(new TextDecoder().decode(storage.files.get('core-crypto'))).toBe('unrelated');
  });

  it('finishes interrupted removal before a new session can append and keeps old workers revoked', async () => {
    const storage = createTestStorage();
    const maintenance = createMaintenance(storage);
    const oldWriter = await maintenance.activateAccount(firstAccountIdentifier);
    const otherWriter = await maintenance.activateAccount(secondAccountIdentifier);
    await oldWriter.append(['{"old":true}\n']);
    storage.failures.remove = true;

    await expect(maintenance.removeAccount(firstAccountIdentifier)).rejects.toThrow('Removal interrupted');
    await expect(oldWriter.append(['{"stale":true}\n'])).rejects.toThrow('revoked');
    const restartedMaintenance = createMaintenance(storage);
    await expect(restartedMaintenance.activateAccount(firstAccountIdentifier)).rejects.toThrow('Removal interrupted');
    await otherWriter.append(['{"other":true}\n']);
    storage.failures.remove = false;
    const newWriter = await restartedMaintenance.activateAccount(firstAccountIdentifier);
    await newWriter.append(['{"new":true}\n']);

    expect(readLogs(storage)).toEqual(['{"other":true}\n', '{"new":true}\n']);
    await expect(oldWriter.append(['{"stale":true}\n'])).rejects.toThrow('revoked');
  });

  it('fails closed on interrupted generation writes without touching other accounts', async () => {
    const storage = createTestStorage();
    const maintenance = createMaintenance(storage);
    const writer = await maintenance.activateAccount(firstAccountIdentifier);
    const otherWriter = await maintenance.activateAccount(secondAccountIdentifier);
    await writer.append(['{"old":true}\n']);
    storage.failures.generationWrite = true;

    await expect(maintenance.removeAccount(firstAccountIdentifier)).rejects.toMatchObject({name: 'QuotaExceededError'});
    await expect(writer.append(['{"stale":true}\n'])).rejects.toThrow('Invalid account log generation');
    await expect(maintenance.activateAccount(firstAccountIdentifier)).rejects.toThrow('Invalid account log generation');
    await otherWriter.append(['{"other":true}\n']);
    storage.failures.generationWrite = false;
    await maintenance.removeAccount(firstAccountIdentifier);

    expect(readLogs(storage)).toEqual(['{"other":true}\n']);
  });

  it('does not create log storage when removing an account without existing logs', async () => {
    const storage = createTestStorage();
    const maintenance = createAccountLogMaintenance({
      async getDirectory() {
        return {
          ...storage.directory,
          async getDirectoryHandle(_name, options) {
            expect(options.create).toBe(false);

            throw Object.assign(new Error('Missing directory'), {name: 'NotFoundError'});
          },
        };
      },
      async runExclusive(operation) {
        return operation();
      },
      createGenerationIdentifier(): never {
        throw new Error('Must not create metadata');
      },
      createStore(): never {
        throw new Error('Must not create a writer');
      },
    });

    await maintenance.removeAccount(firstAccountIdentifier);
    await maintenance.removeAccount(firstAccountIdentifier);

    expect(storage.files.size).toBe(0);
  });
});
