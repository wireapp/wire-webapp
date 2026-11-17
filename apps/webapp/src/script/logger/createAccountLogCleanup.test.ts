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

import {Maybe} from 'true-myth';

import type {QualifiedId} from '../apiClient/user/qualifiedId';

import {createAccountLogCleanup} from './createAccountLogCleanup';
import type {LogDirectory} from './createOriginPrivateFileSystemLogStore';
import {logDirectoryFactory, qualifiedAccountIdentityFactory} from './test/logDeletionTestFactories';

function createDependencies(): Parameters<typeof createAccountLogCleanup>[0] {
  return {
    isElectron: false,
    persistence: Maybe.nothing(),
    hashQualifiedId: jest.fn(async () => {
      return 'a'.repeat(64);
    }),
    getDirectory: jest.fn(async (): Promise<LogDirectory> => {
      throw {name: 'NotFoundError'};
    }),
    reportFailure: jest.fn(),
  };
}

describe('account log cleanup', () => {
  it('deletes previously persisted logs with persistence disabled', async () => {
    const dependencies = createDependencies();
    const filename = `log-1-${'b'.repeat(36)}-1-${'a'.repeat(64)}.jsonl`;
    const files = new Set([filename]);
    const directory: LogDirectory = logDirectoryFactory.build({
      async getDirectoryHandle() {
        return directory;
      },
      async *values() {
        for (const name of files) {
          yield {name, kind: 'file' as const};
        }
      },
      async removeEntry(name) {
        files.delete(name);
      },
    });
    const getDirectory = jest.fn(async () => {
      return directory;
    });
    await createAccountLogCleanup({...dependencies, getDirectory})(Maybe.just(qualifiedAccountIdentityFactory.build()));
    expect(dependencies.hashQualifiedId).toHaveBeenCalledWith({domain: 'example.com', id: 'account'});
    expect(getDirectory).toHaveBeenCalledTimes(1);
    expect(files.size).toBe(0);
    expect(dependencies.reportFailure).not.toHaveBeenCalled();
  });

  it('never touches browser storage or persistence in Electron', async () => {
    const dependencies = createDependencies();
    const dispose = jest.fn();
    await createAccountLogCleanup({...dependencies, isElectron: true, persistence: Maybe.just({dispose})})(
      Maybe.just(qualifiedAccountIdentityFactory.build()),
    );
    expect(dispose).not.toHaveBeenCalled();
    expect(dependencies.hashQualifiedId).not.toHaveBeenCalled();
    expect(dependencies.getDirectory).not.toHaveBeenCalled();
  });

  it.each([
    Maybe.nothing<Readonly<QualifiedId>>(),
    Maybe.just(qualifiedAccountIdentityFactory.build({domain: ''})),
    Maybe.just(qualifiedAccountIdentityFactory.build({id: ''})),
  ])('does not delete logs for missing or invalid identities', async qualifiedId => {
    const dependencies = createDependencies();
    await createAccountLogCleanup(dependencies)(qualifiedId);
    expect(dependencies.getDirectory).not.toHaveBeenCalled();
    expect(dependencies.reportFailure).toHaveBeenCalledWith();
  });

  it('reports storage failures without rejecting logout', async () => {
    const dependencies = createDependencies();
    const getDirectory = jest.fn(async (): Promise<never> => {
      throw new Error('Sensitive storage error');
    });
    await expect(
      createAccountLogCleanup({...dependencies, getDirectory})(Maybe.just(qualifiedAccountIdentityFactory.build())),
    ).resolves.toBeUndefined();
    expect(dependencies.reportFailure).toHaveBeenCalledTimes(1);
    expect(dependencies.reportFailure).toHaveBeenCalledWith();
  });
});
