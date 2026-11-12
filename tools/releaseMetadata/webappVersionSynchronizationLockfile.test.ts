/*
 * Wire
 * Copyright (C) 2026 Wire Swiss GmbH
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 */

import assert from 'node:assert';

import {isPlainObject} from '@sindresorhus/is';

import {
  updateWebAppVersionSynchronizationLockfile,
  validateWebAppVersionSynchronizationLockfileChange,
} from './webappVersionSynchronizationLockfile.ts';

function createLockfileDocument(version: string): Readonly<Record<string, unknown>> {
  return {
    name: 'example-webapp',
    version,
    lockfileVersion: 3,
    requires: true,
    packages: {
      '': {name: 'example-webapp', version, dependencies: {example: '2.0.0'}},
      'node_modules/example': {
        version: '2.0.0',
        resolved: 'https://example.com/package.tgz',
        integrity: 'sha512-example',
      },
    },
  };
}

describe('WebApp version synchronization lockfile', () => {
  it('updates both root version fields while preserving dependency metadata and the original document', () => {
    const lockfileDocument = createLockfileDocument('1.0.0');
    const originalLockfileDocument = structuredClone(lockfileDocument);
    const actualResult = updateWebAppVersionSynchronizationLockfile({
      lockfileDocument,
      currentVersion: '1.0.0',
      targetVersion: '1.2.0',
    });

    assert(actualResult.isOk);
    expect(actualResult.value).toEqual(createLockfileDocument('1.2.0'));
    expect(JSON.stringify(actualResult.value)).toBe(JSON.stringify(createLockfileDocument('1.2.0')));
    expect(lockfileDocument).toEqual(originalLockfileDocument);
  });

  it.each([
    undefined,
    [],
    {version: '1.0.0', lockfileVersion: 3},
    {...createLockfileDocument('1.0.0'), lockfileVersion: 2},
    {...createLockfileDocument('1.0.0'), version: '0.9.0'},
    {...createLockfileDocument('1.0.0'), packages: {}},
    {...createLockfileDocument('1.0.0'), packages: {'': {version: '0.9.0'}}},
  ])('rejects a malformed or inconsistent lockfile: %j', lockfileDocument => {
    const actualResult = updateWebAppVersionSynchronizationLockfile({
      lockfileDocument,
      currentVersion: '1.0.0',
      targetVersion: '1.2.0',
    });

    assert(actualResult.isErr);
    expect(actualResult.error.message).toContain('package-lock.json');
  });

  it('rejects an invalid target version', () => {
    const actualResult = updateWebAppVersionSynchronizationLockfile({
      lockfileDocument: createLockfileDocument('1.0.0'),
      currentVersion: '1.0.0',
      targetVersion: 'invalid',
    });

    assert(actualResult.isErr);
  });

  it('accepts precisely the expected lockfile version changes', () => {
    const actualResult = validateWebAppVersionSynchronizationLockfileChange({
      baseLockfileDocument: createLockfileDocument('1.0.0'),
      updatedLockfileDocument: createLockfileDocument('1.2.0'),
      currentVersion: '1.0.0',
      targetVersion: '1.2.0',
    });

    assert(actualResult.isOk);
  });

  it('rejects a dependency version change', () => {
    const updatedLockfileDocument = createLockfileDocument('1.2.0');
    const lockedPackages = updatedLockfileDocument.packages;
    assert(isPlainObject(lockedPackages));
    const lockedExampleDependency = lockedPackages['node_modules/example'];
    assert(isPlainObject(lockedExampleDependency));
    const actualResult = validateWebAppVersionSynchronizationLockfileChange({
      baseLockfileDocument: createLockfileDocument('1.0.0'),
      updatedLockfileDocument: {
        ...updatedLockfileDocument,
        packages: {
          ...lockedPackages,
          'node_modules/example': {...lockedExampleDependency, version: '3.0.0'},
        },
      },
      currentVersion: '1.0.0',
      targetVersion: '1.2.0',
    });

    assert(actualResult.isErr);
  });

  it('rejects a dependency integrity change even when every WebApp version is correct', () => {
    const baseLockfileDocument = createLockfileDocument('1.0.0');
    const updatedLockfileResult = updateWebAppVersionSynchronizationLockfile({
      lockfileDocument: baseLockfileDocument,
      currentVersion: '1.0.0',
      targetVersion: '1.2.0',
    });
    assert(updatedLockfileResult.isOk);
    const updatedLockfileDocument = updatedLockfileResult.value;
    const lockedPackages = updatedLockfileDocument.packages;
    assert(isPlainObject(lockedPackages));
    const lockedExampleDependency = lockedPackages['node_modules/example'];
    assert(isPlainObject(lockedExampleDependency));
    const actualResult = validateWebAppVersionSynchronizationLockfileChange({
      baseLockfileDocument,
      updatedLockfileDocument: {
        ...updatedLockfileDocument,
        packages: {
          ...lockedPackages,
          'node_modules/example': {...lockedExampleDependency, integrity: 'sha512-changed'},
        },
      },
      currentVersion: '1.0.0',
      targetVersion: '1.2.0',
    });

    assert(actualResult.isErr);
  });

  it.each([
    {...createLockfileDocument('1.2.0'), requires: false},
    {...createLockfileDocument('1.2.0'), packages: {'': {version: '1.2.0'}, 'apps/webapp': {version: '1.2.0'}}},
    createLockfileDocument('1.0.0'),
    undefined,
  ])('rejects unrelated metadata changes or stale versions: %j', updatedLockfileDocument => {
    const actualResult = validateWebAppVersionSynchronizationLockfileChange({
      baseLockfileDocument: createLockfileDocument('1.0.0'),
      updatedLockfileDocument,
      currentVersion: '1.0.0',
      targetVersion: '1.2.0',
    });

    assert(actualResult.isErr);
  });
});
