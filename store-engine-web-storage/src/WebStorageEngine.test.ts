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

import {createSpec} from '@wireapp/store-engine/src/main/test/createSpec';
import {deleteAllSpec} from '@wireapp/store-engine/src/main/test/deleteAllSpec';
import {deleteSpec} from '@wireapp/store-engine/src/main/test/deleteSpec';
import {purgeSpec} from '@wireapp/store-engine/src/main/test/purgeSpec';
import {readAllPrimaryKeysSpec} from '@wireapp/store-engine/src/main/test/readAllPrimaryKeysSpec';
import {readAllSpec} from '@wireapp/store-engine/src/main/test/readAllSpec';
import {readSpec} from '@wireapp/store-engine/src/main/test/readSpec';
import {updateOrCreateSpec} from '@wireapp/store-engine/src/main/test/updateOrCreateSpec';
import {updateSpec} from '@wireapp/store-engine/src/main/test/updateSpec';
import {WebStorageEngine} from './WebStorageEngine';

const STORE_NAME = 'store-name';

let engine: WebStorageEngine;

async function initEngine(shouldCreateNewEngine = true): Promise<WebStorageEngine> {
  const storeEngine = shouldCreateNewEngine ? new WebStorageEngine() : engine;
  await storeEngine.init(STORE_NAME);
  return storeEngine;
}

describe('WebStorageEngine', () => {
  beforeEach(async () => {
    engine = await initEngine();
  });

  afterEach(() => window.localStorage.clear());

  describe('init', () => {
    it('resolves with direct access to the LocalStorage.', async () => {
      engine = new WebStorageEngine();
      const instance = await engine.init(STORE_NAME);
      expect(instance).toBe(window.localStorage);
    });
  });

  describe('create', () => {
    Object.entries(createSpec).map(([description, testFunction]) => {
      it(description, () => testFunction(engine));
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
