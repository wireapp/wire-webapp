/*
 * Wire
 * Copyright (C) 2019 Wire Swiss GmbH
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

//@ts-check

const path = require('path');
const fs = require('fs-extra');

const {CopyConfig} = require('../../dist');
const TEMP_DIR = path.resolve(__dirname, '..', '..', '.temp/');
const ERROR_NOTFOUND = -2;

describe('CopyConfig', () => {
  afterEach(() => fs.remove(TEMP_DIR));

  it('copies a single file', async () => {
    const copyConfig = new CopyConfig({
      externalDir: '.',
      files: {
        './spec/helpers/test1.txt': TEMP_DIR,
      },
    });

    const copiedResult = await copyConfig.copy();

    expect(copiedResult.length).toBe(1);

    const copiedFiles = fs.readdirSync(TEMP_DIR);
    expect(copiedFiles.includes('spec')).toBe(true);
  });

  it('copies all files', async () => {
    const copyConfig = new CopyConfig({
      externalDir: '.',
      files: {
        './spec/helpers/**': TEMP_DIR,
      },
    });

    const copiedResult = await copyConfig.copy();

    expect(copiedResult.length).toBe(1 + 1);

    const copiedFiles = fs.readdirSync(TEMP_DIR);

    expect(copiedFiles.includes('test1.txt')).toBe(true);
    expect(copiedFiles.includes('test2.txt')).toBe(true);
  });

  it('reports errors', async () => {
    const copyConfig = new CopyConfig({
      externalDir: '.',
      files: {
        'non-existant': TEMP_DIR,
      },
    });

    try {
      await copyConfig.copy();
      fail('Should throw');
    } catch (error) {
      expect(error.errno).toBe(ERROR_NOTFOUND);
    }
  });

  it('reads environment variables', async () => {
    process.env.WIRE_CONFIGURATION_EXTERNAL_DIR = 'externalDir';
    process.env.WIRE_CONFIGURATION_FILES = `./spec/helpers/**:${TEMP_DIR};./spec/helpers/test1.txt:[${TEMP_DIR}/test1.txt,${TEMP_DIR}/test2.txt]`;

    const copyConfig = new CopyConfig({
      files: {},
    });

    expect(copyConfig.options.externalDir.endsWith('externalDir')).toBe(true);
    expect(copyConfig.options.files).toEqual({
      './spec/helpers/**': TEMP_DIR,
      './spec/helpers/test1.txt': [`${TEMP_DIR}/test1.txt`, `${TEMP_DIR}/test2.txt`],
    });

    delete process.env.WIRE_CONFIGURATION_EXTERNAL_DIR;
    delete process.env.WIRE_CONFIGURATION_FILES;
  });
});
