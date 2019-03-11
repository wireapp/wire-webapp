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

import fs from 'fs-extra';
import logdown from 'logdown';
import path from 'path';

import {CopyConfigOptions} from './CopyConfigOptions';
import * as utils from './utils';

const defaultOptions: Required<CopyConfigOptions> = {
  externalDir: '',
  files: {},
  repositoryUrl: 'https://github.com/wireapp/wire-web-config-default#master',
};

export class CopyConfig {
  private readonly options: Required<CopyConfigOptions>;
  private readonly logger: logdown.Logger;
  private readonly baseDir: string = 'config';
  private readonly noClone: boolean = false;
  private readonly noCleanup: boolean = false;
  private readonly filterFiles: string[] = ['.DS_Store'];

  constructor(filesOrOptions: CopyConfigOptions) {
    this.options = {...defaultOptions, ...filesOrOptions};
    this.readEnvVars();

    if (this.options.externalDir) {
      this.noClone = true;
      this.noCleanup = true;
      this.baseDir = this.options.externalDir;
    }
    this.baseDir = path.resolve(this.baseDir);

    this.logger = logdown('@wireapp/copy-config/CopyConfig', {
      markdown: false,
    });
    this.logger.state.isEnabled = true;
  }

  private readEnvVars(): void {
    const setString = (variable: string | undefined, optionKey: keyof CopyConfigOptions) =>
      typeof variable !== 'undefined' && (this.options[optionKey] = String(variable));

    setString(process.env.WIRE_CONFIGURATION_EXTERNAL_DIR, 'externalDir');
    setString(process.env.WIRE_CONFIGURATION_REPOSITORY, 'repositoryUrl');
    if (typeof process.env.WIRE_CONFIGURATION_FILES !== 'undefined') {
      const files = this.getFilesFromString(process.env.WIRE_CONFIGURATION_FILES);
      Object.assign(this.options.files, files);
    }
  }

  private getFilesFromString(files: string): {[source: string]: string | string[]} {
    const resolvedPaths: {[source: string]: string | string[]} = {};
    const fileArrayRegex = /^\[(.*)\]$/;

    files
      .split(';')
      .map(fileTuple => String.raw`${fileTuple}`.split(/:(?!\\)/))
      .forEach(([source, dest]) => {
        let destination: string | string[] = dest;
        if (fileArrayRegex.test(destination)) {
          destination = dest.replace(fileArrayRegex, '$1').split(',');
        }
        resolvedPaths[source] = destination;
      });

    return resolvedPaths;
  }

  private resolveFiles(): void {
    const filesArray = Object.keys(this.options.files);
    if (!filesArray.length) {
      throw new Error('No source files or directories specified.');
    }

    filesArray.forEach(source => {
      const destination = this.options.files[source];

      const joinedSource = path.join(this.baseDir, source);
      const resolvedDestination =
        destination instanceof Array ? destination.map(dest => path.resolve(dest)) : path.resolve(destination);

      delete this.options.files[source];

      this.options.files[joinedSource] = resolvedDestination;
    });
  }

  public async copyDirOrFile(source: string, destination: string): Promise<string[]> {
    const filter = (src: string): boolean => {
      for (const fileName in this.filterFiles) {
        if (src.endsWith(fileName)) {
          return false;
        }
      }
      return true;
    };

    const isGlob = (path: string) => /\*$/.test(path);

    if (utils.isFile(destination) && !utils.isFile(source)) {
      throw new Error('Cannot copy a directory into a file.');
    }

    if (isGlob(source)) {
      this.logger.info(`Resolving "${source}"`);

      const copiedFiles = await utils.copyAsync(source, destination);

      for (const copiedFile of copiedFiles) {
        const [copiedFrom, copiedTo] = copiedFile.history;
        this.logger.info(`Copying "${copiedFrom}" -> "${copiedTo}"`);
      }

      return copiedFiles.map(file => file.path);
    }

    if (utils.isFile(source) && !utils.isFile(destination)) {
      destination = path.join(destination, path.basename(source));
    }

    this.logger.info(`Copying "${source}" -> "${destination}"`);

    // Info: "fs.copy" creates all sub-folders which are needed along the way:
    // see https://github.com/jprichardson/node-fs-extra/blob/7.0.1/lib/copy/copy.js#L43
    await fs.copy(source, destination, {filter, overwrite: true, recursive: true});

    return [destination];
  }

  private async clone(): Promise<void> {
    const repositoryData = this.options.repositoryUrl.split('#');
    let bareUrl = repositoryData[0];
    const branch = repositoryData[1] || 'master';
    const {stderr: stderrVersion} = await utils.execAsync('git --version');
    let isHttpUrl = bareUrl.startsWith('http');

    if (!isHttpUrl && stderrVersion) {
      this.logger.error(`No git installation found: ${stderrVersion}. Trying to download the zip file ...`);
      bareUrl = bareUrl
        .replace(/^git(@|:\/\/)/, 'https://')
        .replace(':', '/')
        .replace(/\.git$/, '');
      isHttpUrl = true;
    }

    if (!this.noCleanup) {
      this.logger.info(`Removing clone directory before cloning ...`);
      await utils.rimrafAsync(this.baseDir);
    }

    if (isHttpUrl) {
      const url = `${bareUrl}/archive/${branch}.zip`;
      this.logger.info(`Downloading "${url}" ...`);
      await utils.downloadFileAsync(url, this.baseDir);
    } else {
      this.logger.info(`Cloning "${bareUrl}" (branch "${branch}") ...`);
      const command = `git clone --depth 1 -b ${branch} ${bareUrl} ${this.baseDir}`;

      const {stderr: stderrClone} = await utils.execAsync(command);

      if (stderrClone.includes('fatal')) {
        throw new Error(stderrClone);
      }
    }
  }

  public async copy(): Promise<string[]> {
    let copiedFiles: string[] = [];

    if (!this.noClone) {
      await this.clone();
    }

    this.resolveFiles();

    for (const file in this.options.files) {
      const destination = this.options.files[file];
      if (destination instanceof Array) {
        const results = await Promise.all(destination.map(dest => this.copyDirOrFile(file, dest)));
        results.forEach(result => (copiedFiles = copiedFiles.concat(result)));
      } else {
        const result = await this.copyDirOrFile(file, destination);
        copiedFiles = copiedFiles.concat(result);
      }
    }

    return copiedFiles.sort();
  }
}
