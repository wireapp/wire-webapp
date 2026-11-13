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

import {isObject, isSafeInteger, isUndefined} from '@sindresorhus/is';
import {Maybe} from 'true-myth';

import {isAccountLogFilename, type LogDirectory, type LogStore} from './createOriginPrivateFileSystemLogStore';
import {isLogAccountIdentifier} from './logAccountIdentifier';
import {logDirectoryName} from './logPersistenceConfiguration';

type AccountLogMaintenanceOptions = {
  readonly getDirectory: () => Promise<LogDirectory>;
  readonly runExclusive: <Value>(operation: () => Promise<Value>) => Promise<Value>;
  readonly createGenerationIdentifier: () => string;
  readonly createStore: (accountIdentifier: string) => LogStore;
};

type AccountLogMaintenance = {
  readonly observeAccountGenerations: () => Promise<void>;
  readonly activateAccount: (accountIdentifier: string) => Promise<LogStore>;
  readonly removeAccount: (accountIdentifier: string) => Promise<void>;
};

const maximumGenerationBytes = 128;

function isMissingEntry(error: unknown): boolean {
  return isObject(error) && 'name' in error && error.name === 'NotFoundError';
}

function getGenerationFilename(accountIdentifier: string): string {
  if (!isLogAccountIdentifier(accountIdentifier)) {
    throw new Error('Invalid log account identifier');
  }

  return `account-${accountIdentifier}.generation`;
}

async function readGeneration(directory: LogDirectory, filename: string): Promise<Maybe<string>> {
  try {
    const file = await directory.getFileHandle(filename);
    const access = await file.createSyncAccessHandle();
    try {
      const sizeBytes = access.getSize();
      if (!isSafeInteger(sizeBytes) || sizeBytes > maximumGenerationBytes || sizeBytes < 1) {
        throw new Error('Invalid account log generation');
      }

      const bytes = new Uint8Array(sizeBytes);
      if (access.read(bytes, {at: 0}) !== sizeBytes) {
        throw new Error('Incomplete account log generation');
      }

      const generation = new TextDecoder().decode(bytes);
      if (!/^(active:[a-f0-9-]{36}(?::[a-f0-9-]{36})?|deleting:[a-f0-9-]{36})$/u.test(generation)) {
        throw new Error('Invalid account log generation');
      }

      return Maybe.just(generation);
    } finally {
      await access.close();
    }
  } catch (error: unknown) {
    if (isMissingEntry(error)) {
      return Maybe.nothing();
    }

    throw error;
  }
}

type WriteGenerationOptions = {
  readonly directory: LogDirectory;
  readonly filename: string;
  readonly generation: string;
};

async function writeGeneration(options: WriteGenerationOptions): Promise<void> {
  const {directory, filename, generation} = options;
  const file = await directory.getFileHandle(filename, {create: true});
  const access = await file.createSyncAccessHandle();
  try {
    const bytes = new TextEncoder().encode(generation);
    // Corrupt or interrupted metadata fails closed on subsequent appends and activation.
    access.truncate(0);
    if (access.write(bytes, {at: 0}) !== bytes.byteLength) {
      throw new Error('Incomplete account log generation write');
    }
    access.flush();
  } finally {
    await access.close();
  }
}

async function removeOwnedFiles(directory: LogDirectory, accountIdentifier: string): Promise<void> {
  for await (const entry of directory.values()) {
    if (entry.kind === 'file' && isAccountLogFilename(entry.name, accountIdentifier)) {
      try {
        await directory.removeEntry(entry.name);
      } catch (error: unknown) {
        if (!isMissingEntry(error)) {
          throw error;
        }
      }
    }
  }
}

function getRevocationIdentifier(generation: string | undefined): string | undefined {
  if (isUndefined(generation)) {
    return undefined;
  }

  const [state, generationIdentifier, revocationIdentifier] = generation.split(':');

  return state === 'deleting' ? generationIdentifier : revocationIdentifier;
}

export function createAccountLogMaintenance(options: AccountLogMaintenanceOptions): AccountLogMaintenance {
  const {getDirectory, runExclusive, createGenerationIdentifier, createStore} = options;
  let observedGenerations: Maybe<ReadonlyMap<string, string>> = Maybe.nothing();

  async function captureGenerations(directory: LogDirectory): Promise<void> {
    const generations = new Map<string, string>();
    for await (const entry of directory.values()) {
      if (entry.kind !== 'file' || !/^account-[a-f0-9]{64}\.generation$/u.test(entry.name)) {
        continue;
      }

      try {
        const generation = await readGeneration(directory, entry.name);
        if (generation.isJust) {
          generations.set(entry.name, generation.value);
        }
      } catch {
        // A corrupt account marker must not disable unrelated accounts; binding that account still fails closed.
      }
    }
    observedGenerations = Maybe.just(generations);
  }

  async function observeAccountGenerations(): Promise<void> {
    await runExclusive(async () => {
      try {
        const directory = await (await getDirectory()).getDirectoryHandle(logDirectoryName, {create: false});
        await captureGenerations(directory);
      } catch (error: unknown) {
        if (!isMissingEntry(error)) {
          throw error;
        }
        observedGenerations = Maybe.just(new Map());
      }
    });
  }

  async function activateAccount(accountIdentifier: string): Promise<LogStore> {
    const filename = getGenerationFilename(accountIdentifier);

    return runExclusive(async () => {
      const directory = await (await getDirectory()).getDirectoryHandle(logDirectoryName, {create: true});
      if (observedGenerations.isNothing) {
        await captureGenerations(directory);
      }
      const previousGeneration = await readGeneration(directory, filename);
      let generation = previousGeneration.unwrapOr('');
      const revocationIdentifier = getRevocationIdentifier(generation);
      const observedGeneration = observedGenerations.unwrapOr(new Map<string, string>()).get(filename);
      if (!isUndefined(revocationIdentifier) && revocationIdentifier !== getRevocationIdentifier(observedGeneration)) {
        throw new Error('Account logs were removed after this worker started');
      }
      if (previousGeneration.isNothing || generation.startsWith('deleting:')) {
        // Finish interrupted removal before allowing a fresh authenticated session to write.
        if (generation.startsWith('deleting:')) {
          await removeOwnedFiles(directory, accountIdentifier);
        }
        const revocationSuffix = isUndefined(revocationIdentifier) ? '' : `:${revocationIdentifier}`;
        // Retain the last revocation even after reactivation, so delayed old bindings stay rejected.
        generation = `active:${createGenerationIdentifier()}${revocationSuffix}`;
        await writeGeneration({directory, filename, generation});
      }

      const store = createStore(accountIdentifier);
      const expectedGeneration = generation;

      return {
        async append(lines): Promise<void> {
          await runExclusive(async () => {
            const currentGeneration = await readGeneration(directory, filename);
            if (currentGeneration.isNothing || currentGeneration.value !== expectedGeneration) {
              throw new Error('Account log writer was revoked');
            }

            await store.append(lines);
          });
        },
      };
    });
  }

  async function removeAccount(accountIdentifier: string): Promise<void> {
    const filename = getGenerationFilename(accountIdentifier);
    await runExclusive(async () => {
      let directory: LogDirectory;
      try {
        directory = await (await getDirectory()).getDirectoryHandle(logDirectoryName, {create: false});
      } catch (error: unknown) {
        if (isMissingEntry(error)) {
          return;
        }

        throw error;
      }

      // Persist revocation before removing files, so old workers cannot recreate them after this lock releases.
      await writeGeneration({directory, filename, generation: `deleting:${createGenerationIdentifier()}`});
      await removeOwnedFiles(directory, accountIdentifier);
    });
  }

  return {activateAccount, removeAccount, observeAccountGenerations};
}
