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

import {isArray, isString, isUndefined} from '@sindresorhus/is';
import fsExtra from 'fs-extra';
import logdown from 'logdown';

import path from 'node:path';

import type {ConfigurationCopyOptions} from './ConfigurationCopyOptions.mts';
import {
  copyMatchingFiles,
  downloadConfigurationZip,
  executeShellCommand,
  pathHasFileExtension,
  removePathRecursively,
} from './configurationRepositoryAccess.mts';

const defaultConfigurationCopyOptions: Required<ConfigurationCopyOptions> = {
  baseDir: 'config',
  externalDir: '',
  files: {},
  logLevel: 'info',
  forceDownload: false,
  repositoryUrl: 'https://github.com/wireapp/wire-web-config-default#master',
};

export class ConfigurationCopier {
  private readonly options: Required<ConfigurationCopyOptions>;
  private readonly repositoryCloningIsDisabled: boolean = false;
  private readonly repositoryDirectoryCleanupIsDisabled: boolean = false;
  private readonly excludedFileNames: string[] = ['.DS_Store'];
  private readonly logger?: logdown.Logger;

  constructor(options: ConfigurationCopyOptions | undefined, logger?: logdown.Logger) {
    this.logger = logger;
    this.options = {...defaultConfigurationCopyOptions, ...options};
    this.readConfigurationEnvironmentOverrides();

    if (!Boolean(this.options.repositoryUrl) && !Boolean(this.options.externalDir)) {
      throw new Error('Option "repositoryUrl" or "externalDir" required');
    }

    if (Boolean(this.options.externalDir)) {
      this.repositoryCloningIsDisabled = true;
      this.repositoryDirectoryCleanupIsDisabled = true;
      this.options.baseDir = this.options.externalDir;
    }
    this.options.baseDir = path.resolve(this.options.baseDir);
  }

  private readConfigurationEnvironmentOverrides(): void {
    const externalDir = process.env.WIRE_CONFIGURATION_EXTERNAL_DIR;
    const repositoryUrl = process.env.WIRE_CONFIGURATION_REPOSITORY;
    const configurationFiles = process.env.WIRE_CONFIGURATION_FILES;

    if (!isUndefined(externalDir)) {
      this.options.externalDir = String(externalDir);
    }

    if (!isUndefined(repositoryUrl)) {
      this.options.repositoryUrl = String(repositoryUrl);
    }

    if (!isUndefined(configurationFiles)) {
      const configurationFileMappings = this.parseConfigurationFileMappings(configurationFiles);
      Object.assign(this.options.files, configurationFileMappings);
    }
  }

  private parseConfigurationFileMappings(configurationFileMappingsText: string): Record<string, string | string[]> {
    const resolvedConfigurationFileMappings: Record<string, string | string[]> = {};
    const destinationPathArrayPattern = /^\[(.*)\]$/;

    configurationFileMappingsText
      .split(';')
      .map(configurationFileMappingText => {
        return String.raw`${configurationFileMappingText}`.split(/:(?!\\)/);
      })
      .forEach(([sourcePath, destinationPath]) => {
        if (isUndefined(sourcePath) || sourcePath === '' || isUndefined(destinationPath)) {
          return;
        }
        let resolvedDestinationPaths: string | string[] = destinationPath;
        if (destinationPathArrayPattern.test(resolvedDestinationPaths)) {
          resolvedDestinationPaths = destinationPath.replace(destinationPathArrayPattern, '$1').split(',');
        }
        resolvedConfigurationFileMappings[sourcePath] = resolvedDestinationPaths;
      });

    return resolvedConfigurationFileMappings;
  }

  private resolveConfigurationFileMappings(): void {
    const configurationSourcePaths = Object.keys(this.options.files);
    if (!Boolean(configurationSourcePaths.length)) {
      throw new Error('No source files or directories specified.');
    }

    configurationSourcePaths.forEach(configurationSourcePath => {
      const configuredDestinationPaths = this.options.files[configurationSourcePath];
      if (isUndefined(configuredDestinationPaths)) {
        return;
      }

      const sourcePathWithBaseDirectory = path.join(this.options.baseDir, configurationSourcePath);
      const resolvedDestinationPaths = isArray(configuredDestinationPaths)
        ? configuredDestinationPaths.map(destinationPath => {
            return path.resolve(destinationPath);
          })
        : path.resolve(configuredDestinationPaths);

      delete this.options.files[configurationSourcePath];

      this.options.files[sourcePathWithBaseDirectory] = resolvedDestinationPaths;
    });
  }

  public async copyConfigurationFileOrDirectory(
    configurationSourcePath: string,
    configurationDestinationPath: string,
  ): Promise<string[]> {
    const excludedFileNames = this.excludedFileNames;

    function shouldCopySourcePath(sourcePath: string): boolean {
      for (const excludedFileIndex in excludedFileNames) {
        if (sourcePath.endsWith(excludedFileIndex)) {
          return false;
        }
      }
      return true;
    }

    function sourcePatternHasWildcardSuffix(sourcePattern: string): boolean {
      return /\*$/.test(sourcePattern);
    }

    if (pathHasFileExtension(configurationDestinationPath) && !pathHasFileExtension(configurationSourcePath)) {
      throw new Error('Cannot copy a directory into a file.');
    }

    if (sourcePatternHasWildcardSuffix(configurationSourcePath)) {
      this.logger?.info(`Resolving "${configurationSourcePath}"`);

      const copiedVinylFiles = await copyMatchingFiles(configurationSourcePath, configurationDestinationPath);

      for (const copiedVinylFile of copiedVinylFiles) {
        const [copiedSourcePath, copiedDestinationPath] = copiedVinylFile.history;
        this.logger?.debug(`Copying "${copiedSourcePath}" -> "${copiedDestinationPath}"`);
      }

      return copiedVinylFiles.map(copiedVinylFile => {
        return copiedVinylFile.path;
      });
    }

    if (pathHasFileExtension(configurationSourcePath) && !pathHasFileExtension(configurationDestinationPath)) {
      configurationDestinationPath = path.join(configurationDestinationPath, path.basename(configurationSourcePath));
    }

    this.logger?.debug(`Copying "${configurationSourcePath}" -> "${configurationDestinationPath}"`);

    // Info: "fs.copy" creates all sub-folders which are needed along the way:
    // see https://github.com/jprichardson/node-fs-extra/blob/7.0.1/lib/copy/copy.js#L43
    // by default, fs.copy() copies folders recursively
    await fsExtra.copy(configurationSourcePath, configurationDestinationPath, {
      filter: shouldCopySourcePath,
      overwrite: true,
    });

    return [configurationDestinationPath];
  }

  private async cloneConfigurationRepository(): Promise<void> {
    const repositoryUrlParts = this.options.repositoryUrl.split('#');
    let repositoryBaseUrl = repositoryUrlParts[0] ?? '';
    const repositoryBranch = repositoryUrlParts[1] ?? 'master';
    const {stderr: gitVersionErrorOutput} = await executeShellCommand('git --version');

    if (!this.repositoryDirectoryCleanupIsDisabled) {
      await this.removeConfigurationRepositoryDirectory();
    }

    if (Boolean(gitVersionErrorOutput)) {
      this.logger?.error(
        `No git installation found: (error: "${gitVersionErrorOutput}"). Trying to download the zip file...`,
      );
    }

    if (Boolean(gitVersionErrorOutput) || this.options.forceDownload) {
      if (repositoryBaseUrl.startsWith('git')) {
        const gitProtocolRegex = new RegExp('^git(?::\\/\\/([^@]+@)?|@)([^:]+):(.*)(?:\\.git)?');
        repositoryBaseUrl = repositoryBaseUrl.replace(gitProtocolRegex, 'https://$1$2/$3');
      }
      const configurationArchiveUrl = `${repositoryBaseUrl}/archive/${repositoryBranch}.zip`;
      this.logger?.info(`Downloading "${configurationArchiveUrl}" ...`);
      await downloadConfigurationZip(configurationArchiveUrl, this.options.baseDir);
    } else {
      this.logger?.info(`Cloning "${repositoryBaseUrl}" (branch "${repositoryBranch}") ...`);
      const gitCloneCommand = `git clone --depth 1 -b ${repositoryBranch} ${repositoryBaseUrl} ${this.options.baseDir}`;

      const {stderr: gitCloneErrorOutput} = await executeShellCommand(gitCloneCommand);

      if (gitCloneErrorOutput.includes('fatal')) {
        throw new Error(gitCloneErrorOutput);
      }
    }
  }

  private async removeConfigurationRepositoryDirectory(): Promise<void> {
    this.logger?.debug(`Cleaning up "${this.options.baseDir}" ...`);
    await removePathRecursively(this.options.baseDir);
  }

  public async copyConfigurationFiles(): Promise<string[]> {
    let copiedDestinationPaths: string[] = [];

    if (!this.repositoryCloningIsDisabled) {
      await this.cloneConfigurationRepository();
    }

    this.resolveConfigurationFileMappings();

    for (const configurationSourcePath in this.options.files) {
      const configuredDestinationPaths = this.options.files[configurationSourcePath];
      if (isUndefined(configuredDestinationPaths)) {
        continue;
      }
      if (isArray(configuredDestinationPaths)) {
        const copiedPathGroups = await Promise.all(
          configuredDestinationPaths.map(configurationDestinationPath => {
            return this.copyConfigurationFileOrDirectory(configurationSourcePath, configurationDestinationPath);
          }),
        );
        copiedPathGroups.forEach(copiedPathsForDestination => {
          copiedDestinationPaths = copiedDestinationPaths.concat(copiedPathsForDestination);
        });
      } else if (isString(configuredDestinationPaths)) {
        const copiedPathsForDestination = await this.copyConfigurationFileOrDirectory(
          configurationSourcePath,
          configuredDestinationPaths,
        );
        copiedDestinationPaths = copiedDestinationPaths.concat(copiedPathsForDestination);
      }
    }

    if (!this.repositoryDirectoryCleanupIsDisabled) {
      await this.removeConfigurationRepositoryDirectory();
    }

    return copiedDestinationPaths.toSorted();
  }
}
