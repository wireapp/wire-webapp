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

import fsExtra from 'fs-extra';

import path from 'node:path';

import {downloadConfigurationZip} from './configurationRepositoryAccess.mts';

import {ConfigurationCopier} from './ConfigurationCopier.mts';
const CONFIGURATION_TOOL_DIRECTORY = path.resolve(__dirname);
const CONFIGURATION_TEST_OUTPUT_DIRECTORY = path.resolve(CONFIGURATION_TOOL_DIRECTORY, '../../target/configuration-test');
const SPEC_FIXTURES_DIRECTORY = 'spec/fixtures';

jest.mock('./configurationRepositoryAccess.mts', () => {
  return {
    ...jest.requireActual('./configurationRepositoryAccess.mts'),
    downloadConfigurationZip: jest.fn().mockReturnValue(Promise.resolve()),
  };
});

describe('ConfigurationCopier', () => {
  afterEach(() => {
    return fsExtra.remove(CONFIGURATION_TEST_OUTPUT_DIRECTORY);
  });

  describe('constructor', () => {
    it('can be configured using environment variables', async () => {
      process.env.WIRE_CONFIGURATION_EXTERNAL_DIR = 'externalDir';
      process.env.WIRE_CONFIGURATION_FILES = `${SPEC_FIXTURES_DIRECTORY}/**:${CONFIGURATION_TEST_OUTPUT_DIRECTORY};${SPEC_FIXTURES_DIRECTORY}/test1.txt:[${CONFIGURATION_TEST_OUTPUT_DIRECTORY}/test1.txt,${CONFIGURATION_TEST_OUTPUT_DIRECTORY}/test2.txt]`;

      const configurationCopier = new ConfigurationCopier({
        files: {},
        repositoryUrl: '',
      });

      // @ts-ignore
      expect(configurationCopier.options.externalDir.endsWith('externalDir')).toBe(true);
      // @ts-ignore
      expect(configurationCopier.options.files).toEqual({
        [`${SPEC_FIXTURES_DIRECTORY}/**`]: CONFIGURATION_TEST_OUTPUT_DIRECTORY,
        [`${SPEC_FIXTURES_DIRECTORY}/test1.txt`]: [
          `${CONFIGURATION_TEST_OUTPUT_DIRECTORY}/test1.txt`,
          `${CONFIGURATION_TEST_OUTPUT_DIRECTORY}/test2.txt`,
        ],
      });

      delete process.env.WIRE_CONFIGURATION_EXTERNAL_DIR;
      delete process.env.WIRE_CONFIGURATION_FILES;
    });
  });

  describe('copy', () => {
    it('copies a single file', async () => {
      const configurationCopier = new ConfigurationCopier({
        externalDir: CONFIGURATION_TOOL_DIRECTORY,
        files: {
          [`${SPEC_FIXTURES_DIRECTORY}/test1.txt`]: `${CONFIGURATION_TEST_OUTPUT_DIRECTORY}/test1.txt`,
        },
        repositoryUrl: '',
      });

      const copiedDestinationPaths = await configurationCopier.copyConfigurationFiles();

      expect(copiedDestinationPaths.length).toBe(1);

      const copiedFileNames = fsExtra.readdirSync(CONFIGURATION_TEST_OUTPUT_DIRECTORY);
      expect(copiedFileNames.includes('test1.txt')).toBe(true);
    });

    it('copies dot files', async () => {
      const configurationCopier = new ConfigurationCopier({
        externalDir: CONFIGURATION_TOOL_DIRECTORY,
        files: {
          [`${SPEC_FIXTURES_DIRECTORY}/.env.test`]: `${CONFIGURATION_TEST_OUTPUT_DIRECTORY}/.env`,
        },
        repositoryUrl: '',
      });

      const copiedDestinationPaths = await configurationCopier.copyConfigurationFiles();

      expect(copiedDestinationPaths.length).toBe(1);
    });

    it('copies all files', async () => {
      const configurationCopier = new ConfigurationCopier({
        externalDir: CONFIGURATION_TOOL_DIRECTORY,
        files: {
          [`${SPEC_FIXTURES_DIRECTORY}/**`]: CONFIGURATION_TEST_OUTPUT_DIRECTORY,
        },
        repositoryUrl: '',
      });

      const copiedDestinationPaths = await configurationCopier.copyConfigurationFiles();

      expect(copiedDestinationPaths.length).toBe(2);

      const copiedFileNames = fsExtra.readdirSync(CONFIGURATION_TEST_OUTPUT_DIRECTORY);

      expect(copiedFileNames.includes('test1.txt')).toBe(true);
      expect(copiedFileNames.includes('test2.txt')).toBe(true);
    });

    it('reports errors', async () => {
      const configurationCopier = new ConfigurationCopier({
        externalDir: CONFIGURATION_TOOL_DIRECTORY,
        files: {
          'non-existant': CONFIGURATION_TEST_OUTPUT_DIRECTORY,
        },
        repositoryUrl: '',
      });

      await expect(configurationCopier.copyConfigurationFiles()).rejects.toMatchObject({code: 'ENOENT'});
    });

    it('overwrites destination files', async () => {
      await fsExtra.ensureDir(CONFIGURATION_TEST_OUTPUT_DIRECTORY);
      await fsExtra.writeFile(path.join(CONFIGURATION_TEST_OUTPUT_DIRECTORY, 'test1.txt'), '');

      const configurationCopier = new ConfigurationCopier({
        externalDir: CONFIGURATION_TOOL_DIRECTORY,
        files: {
          [`${SPEC_FIXTURES_DIRECTORY}/test1.txt`]: `${CONFIGURATION_TEST_OUTPUT_DIRECTORY}/test1.txt`,
        },
        repositoryUrl: '',
      });

      const copiedDestinationPaths = await configurationCopier.copyConfigurationFiles();

      expect(copiedDestinationPaths.length).toBe(1);
    });

    it('downloads zip archives from an https url', async () => {
      await fsExtra.ensureDir(CONFIGURATION_TEST_OUTPUT_DIRECTORY);
      await fsExtra.writeFile(path.join(CONFIGURATION_TEST_OUTPUT_DIRECTORY, 'test1.txt'), '');

      const configurationRepositoryUrl = 'https://github.com/wireapp/wire-web-config-default#master';
      const configurationArchiveUrl = 'https://github.com/wireapp/wire-web-config-default/archive/master.zip';

      const configurationCopier = new ConfigurationCopier({
        baseDir: path.join(CONFIGURATION_TEST_OUTPUT_DIRECTORY, 'config'),
        files: {
          './package.json': CONFIGURATION_TEST_OUTPUT_DIRECTORY,
        },
        forceDownload: true,
        repositoryUrl: configurationRepositoryUrl,
      });

      jest.spyOn(configurationCopier, 'copyConfigurationFileOrDirectory').mockReturnValue(Promise.resolve([]));

      await configurationCopier.copyConfigurationFiles();

      expect(downloadConfigurationZip).toHaveBeenCalledWith(configurationArchiveUrl, expect.any(String));
    });
  });

  it('downloads zip archives from a git url', async () => {
    await fsExtra.ensureDir(CONFIGURATION_TEST_OUTPUT_DIRECTORY);
    await fsExtra.writeFile(path.join(CONFIGURATION_TEST_OUTPUT_DIRECTORY, 'test1.txt'), '');

    const gitConfigurationRepositoryUrl = 'git@github.com:wireapp/wire-web-config-default#master';
    const configurationArchiveUrl = 'https://github.com/wireapp/wire-web-config-default/archive/master.zip';

    const configurationCopier = new ConfigurationCopier({
      baseDir: path.join(CONFIGURATION_TEST_OUTPUT_DIRECTORY, 'config'),
      files: {
        './package.json': CONFIGURATION_TEST_OUTPUT_DIRECTORY,
      },
      forceDownload: true,
      repositoryUrl: gitConfigurationRepositoryUrl,
    });

    jest.spyOn(configurationCopier, 'copyConfigurationFileOrDirectory').mockReturnValue(Promise.resolve([]));

    await configurationCopier.copyConfigurationFiles();

    expect(downloadConfigurationZip).toHaveBeenCalledWith(configurationArchiveUrl, expect.any(String));
  });

  describe('parseConfigurationFileMappings', () => {
    it('is compatible with Windows paths', () => {
      const configurationFileMappingsText = 'C:\\source:D:\\target';

      const configurationCopier = new ConfigurationCopier({
        externalDir: CONFIGURATION_TOOL_DIRECTORY,
        files: {},
        repositoryUrl: '',
      });

      // @ts-ignore
      const resolvedConfigurationFileMappings = configurationCopier.parseConfigurationFileMappings(
        configurationFileMappingsText,
      );
      expect(Object.keys(resolvedConfigurationFileMappings)[0]).toBe('C:\\source');
      expect(Object.values(resolvedConfigurationFileMappings)[0]).toBe('D:\\target');
    });
  });
});
