/*
 * Wire
 * Copyright (C) 2018 Wire Swiss GmbH
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

import fs from 'fs-extra';
import path from 'path';

import {error as StoreEngineError} from '@wireapp/store-engine';
import {createSpec} from '@wireapp/store-engine/src/main/test/createSpec';
import {deleteAllSpec} from '@wireapp/store-engine/src/main/test/deleteAllSpec';
import {deleteSpec} from '@wireapp/store-engine/src/main/test/deleteSpec';
import {purgeSpec} from '@wireapp/store-engine/src/main/test/purgeSpec';
import {readAllPrimaryKeysSpec} from '@wireapp/store-engine/src/main/test/readAllPrimaryKeysSpec';
import {readAllSpec} from '@wireapp/store-engine/src/main/test/readAllSpec';
import {readSpec} from '@wireapp/store-engine/src/main/test/readSpec';
import {updateOrCreateSpec} from '@wireapp/store-engine/src/main/test/updateOrCreateSpec';
import {updateSpec} from '@wireapp/store-engine/src/main/test/updateSpec';

import {FileEngine} from './index';

describe('FileEngine', () => {
  const BASE_DIRECTORY = path.join(process.cwd(), '.tmp');
  const STORE_NAME = 'the-simpsons';
  const TEST_DIRECTORY = path.join(BASE_DIRECTORY, STORE_NAME);

  let engine: FileEngine;

  async function initEngine(shouldCreateNewEngine = true): Promise<FileEngine> {
    const storeEngine = shouldCreateNewEngine ? new FileEngine(BASE_DIRECTORY) : engine;
    await storeEngine.init(STORE_NAME);
    return storeEngine;
  }

  beforeEach(async () => {
    FileEngine.path = path;
    engine = await initEngine();
  });

  afterEach(async () => fs.remove(TEST_DIRECTORY));

  describe('enforcePathRestrictions', () => {
    const enforcePathRestrictions = (givenTrustedRoot: string, givenPath: string) => () =>
      FileEngine.enforcePathRestrictions(givenTrustedRoot, givenPath);
    const expectedError = StoreEngineError.PathValidationError;
    const unixFolder = '/home/marge/test/';
    const windowsFolder = 'C:\\Users\\bart\\Documents\\Database\\';

    it('allows dots inside of primary keys.', () => {
      const tableName = 'amplify';
      const primaryKey = 'z.storage.StorageKey.EVENT.LAST_DATE';

      FileEngine.path = path.posix;
      const actual = FileEngine.enforcePathRestrictions(FileEngine.path.join(unixFolder, tableName), primaryKey);
      expect(actual).toBeDefined();
    });

    it('allows slashes inside of primary keys as long as they do not navigate outside of the base folder.', () => {
      FileEngine.path = path.posix;
      expect(FileEngine.enforcePathRestrictions(unixFolder, 'users/..')).toBeDefined();
      expect(FileEngine.enforcePathRestrictions(unixFolder, 'users/../')).toBeDefined();
      expect(FileEngine.enforcePathRestrictions(unixFolder, 'users/../sandbox')).toBeDefined();
      expect(FileEngine.enforcePathRestrictions(unixFolder, 'users/me')).toBeDefined();
      expect(FileEngine.enforcePathRestrictions(unixFolder, 'a/b/c/d/e/f/g/../../../../ok')).toBeDefined();
      expect(FileEngine.enforcePathRestrictions(unixFolder, 'a/b/c/../../../')).toBeDefined();
      expect(enforcePathRestrictions(unixFolder, 'a/b/c/../../../../')).toThrow();
    });

    it('allows empty strings.', () => {
      const tableName = 'amplify';
      const primaryKey = '';

      FileEngine.path = path.posix;
      const actual = FileEngine.enforcePathRestrictions(FileEngine.path.join(unixFolder, tableName), primaryKey);
      expect(actual).toBeDefined();
    });

    it('throws errors on path traversals.', () => {
      FileEngine.path = path.win32;
      expect(enforcePathRestrictions(windowsFolder, 'malicious\\..\\..\\test\\..\\..')).toThrow();
      expect(enforcePathRestrictions(windowsFolder, '\\malicious\\..\\\\..entry\\..\\..')).toThrow();
      expect(enforcePathRestrictions(windowsFolder, 'malicious\\..\\entry\\..\\..')).toThrow();
      expect(enforcePathRestrictions(windowsFolder, '\\\\server\\..\\..\\..')).toThrow();
      expect(enforcePathRestrictions(windowsFolder, 'malicious\\..\\..\\entry\\..\\')).toThrow();
      expect(enforcePathRestrictions(windowsFolder, '..\\etc')).toThrow();

      FileEngine.path = path.posix;
      expect(enforcePathRestrictions(unixFolder, '../etc')).toThrow();
      expect(enforcePathRestrictions(unixFolder, '/malicious/../../../entry/../test')).toThrow();
      expect(enforcePathRestrictions(unixFolder, 'malicious/../../../entry/..')).toThrow();
      expect(enforcePathRestrictions(unixFolder, 'documents/../../../../../etc/hosts')).toThrow();
      expect(enforcePathRestrictions(unixFolder, 'malicious/../../../entry/../')).toThrow();
      expect(enforcePathRestrictions(unixFolder, '../etc')).toThrow();
      expect(enforcePathRestrictions(unixFolder, 'users/../../tigris')).toThrow();
      expect(enforcePathRestrictions(unixFolder, 'users/../tigris/../../')).toThrow();
    });

    it('throws errors when attempting to use the root folder as a trusted root.', () => {
      FileEngine.path = path.posix;
      expect(enforcePathRestrictions('/', 'etc/hosts')).toThrow();

      FileEngine.path = path.win32;
      expect(enforcePathRestrictions('C:/', '\\Windows\\System32\\drivers\\etc\\hosts')).toThrow();
    });

    it('is applied to all store operations.', async () => {
      const functionNames = [
        'create',
        'delete',
        'deleteAll',
        'read',
        'readAll',
        'readAllPrimaryKeys',
        'update',
        'updateOrCreate',
      ];

      for (const operation of functionNames) {
        try {
          await engine[operation]('../etc', 'primary-key', {});
          throw new Error('Expected error to be thrown.');
        } catch (error) {
          expect(error instanceof expectedError).toBe(true);
        }
      }
    });
  });

  describe('init', () => {
    it('resolves with the directory to which the records will be saved.', async () => {
      const options = {
        fileExtension: '.json',
      };
      engine = new FileEngine(BASE_DIRECTORY);
      const directory = await engine.init(STORE_NAME, options);
      const fileStatus = fs.statSync(directory);
      expect(fileStatus.isDirectory()).toBe(true);
    });
  });

  describe('create', () => {
    describe('create', () => {
      Object.entries(createSpec).map(([description, testFunction]) => {
        it(description, () => testFunction(engine));
      });
    });

    it('accepts custom file extensions.', async () => {
      const options = {
        fileExtension: '.json',
      };
      engine = new FileEngine(BASE_DIRECTORY);
      await engine.init(STORE_NAME, options);

      expect(engine.options.fileExtension).toBe(options.fileExtension);
    });
  });

  describe('delete', () => {
    Object.entries(deleteSpec).map(([description, testFunction]) => {
      it(description, () => testFunction(engine));
    });
  });

  describe('deleteAll', () => {
    Object.entries(deleteAllSpec).map(([description, testFunction]) => {
      it(description, () => testFunction(engine));
    });
  });

  describe('purge', () => {
    Object.entries(purgeSpec).map(([description, testFunction]) => {
      it(description, () => testFunction(engine, initEngine));
    });
  });

  describe('readAllPrimaryKeys', () => {
    Object.entries(readAllPrimaryKeysSpec).map(([description, testFunction]) => {
      it(description, () => testFunction(engine));
    });
  });

  describe('readAll', () => {
    Object.entries(readAllSpec).map(([description, testFunction]) => {
      it(description, () => testFunction(engine));
    });
  });

  describe('read', () => {
    Object.entries(readSpec).map(([description, testFunction]) => {
      it(description, () => testFunction(engine));
    });
  });

  describe('updateOrCreate', () => {
    Object.entries(updateOrCreateSpec).map(([description, testFunction]) => {
      it(description, () => testFunction(engine));
    });
  });

  describe('update', () => {
    Object.entries(updateSpec).map(([description, testFunction]) => {
      it(description, () => testFunction(engine));
    });
  });
});
