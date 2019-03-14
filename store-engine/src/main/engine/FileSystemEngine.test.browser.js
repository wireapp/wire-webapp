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

import {FileSystemEngine} from '@wireapp/store-engine';

const fs = require('bro-fs');

describe('FileSystemEngine', () => {
  const STORE_NAME = 'store-name';

  let engine = undefined;

  async function initEngine(shouldCreateNewEngine = true) {
    const storeEngine = shouldCreateNewEngine ? new FileSystemEngine() : engine;
    await storeEngine.init(STORE_NAME);
    return storeEngine;
  }

  beforeEach(async done => {
    engine = await initEngine();
    done();
  });

  afterEach(async done => {
    await fs.rmdir(STORE_NAME);
    done();
  });

  describe('"init"', () => {
    it('resolves with a browser-specific URL to the filesystem.', async done => {
      const fileSystem = await engine.init();
      expect(fileSystem.root.toURL().startsWith('filesystem:')).toBe(true);
      done();
    });
  });

  describe('"append"', () => {
    Object.entries(require('../test/shared/append')).map(([description, testFunction]) => {
      it(description, done => testFunction(done, engine));
    });
  });

  describe('"create"', () => {
    Object.entries(require('../test/shared/create')).map(([description, testFunction]) => {
      it(description, done => testFunction(done, engine));
    });
  });

  describe('"delete"', () => {
    Object.entries(require('../test/shared/delete')).map(([description, testFunction]) => {
      it(description, done => testFunction(done, engine));
    });
  });

  describe('"deleteAll"', () => {
    Object.entries(require('../test/shared/deleteAll')).map(([description, testFunction]) => {
      it(description, done => testFunction(done, engine));
    });
  });

  describe('"purge"', () => {
    Object.entries(require('../test/shared/purge')).map(([description, testFunction]) => {
      it(description, done => testFunction(done, engine, initEngine));
    });
  });

  describe('"read"', () => {
    Object.entries(require('../test/shared/read')).map(([description, testFunction]) => {
      it(description, done => testFunction(done, engine));
    });
  });

  describe('"readAll"', () => {
    Object.entries(require('../test/shared/readAll')).map(([description, testFunction]) => {
      it(description, done => testFunction(done, engine));
    });
  });

  describe('"readAllPrimaryKeys"', () => {
    Object.entries(require('../test/shared/readAllPrimaryKeys')).map(([description, testFunction]) => {
      it(description, done => testFunction(done, engine));
    });
  });

  describe('"update"', () => {
    Object.entries(require('../test/shared/update')).map(([description, testFunction]) => {
      it(description, done => testFunction(done, engine));
    });
  });

  describe('"updateOrCreate"', () => {
    Object.entries(require('../test/shared/updateOrCreate')).map(([description, testFunction]) => {
      it(description, done => testFunction(done, engine));
    });
  });
});
