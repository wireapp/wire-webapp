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

import * as fs from 'fs-extra';
import logdown from 'logdown';
import pkginfo from 'npm-registry-package-info';

import {exec} from 'child_process';
import crypto from 'crypto';
import os from 'os';
import path from 'path';
import {promisify} from 'util';

const execAsync = promisify(exec);

interface CrawlerResult {
  data: {
    [id: string]: {
      homepage?: string;
      license?: string;
      name: string;
      repository?: {
        url: string;
      };
    };
  };
}

interface License {
  license: string;
  link?: string;
  package: string;
  parent?: string;
  platform: string;
}

interface Repository {
  dir: string;
  name: string;
  url: string;
}

const defaultOptions: Required<CollectorOptions> = {
  devDependencies: true,
  filter: [],
  repositories: [],
};

export interface CollectorOptions {
  /** Add devDependencies */
  devDependencies?: boolean;
  /** Which dependencies to filter */
  filter?: string[];
  /** Which repositories to check */
  repositories: string[];
}

export class LicenseCollector {
  private readonly options: Required<CollectorOptions>;
  private readonly logger: logdown.Logger;
  private readonly repositories: Repository[];
  private readonly dependencies: string[];
  private TMP_DIR: string;

  constructor(options: CollectorOptions) {
    this.options = {...defaultOptions, ...options};
    this.logger = logdown('@wireapp/license-collector/LicenseCollector', {
      markdown: false,
    });
    this.logger.state.isEnabled = true;

    if (!this.options.repositories.length) {
      throw new Error('No repositories specified');
    }

    this.dependencies = [];
    this.repositories = this.options.repositories.map(url => ({dir: '', name: '', url}));
    this.TMP_DIR = '';
  }

  private async checkPrerequisites(): Promise<void> {
    const {stderr: stderrVersion} = await execAsync('git --version');

    if (stderrVersion) {
      throw new Error(`No git installation found: ${stderrVersion}`);
    }
  }

  private async clone(): Promise<void> {
    const gitUrlRegex = new RegExp('/(?<name>(.+?))(?:\\.git)?/?$', 'i');

    for (const index in this.repositories) {
      const {url} = this.repositories[index];
      const id = crypto.randomBytes(10).toString('hex');
      const cloneDir = path.join(this.TMP_DIR, id);
      const name = gitUrlRegex.exec(url) || ['', url];
      this.repositories[index].name = name[1];

      this.repositories[index].dir = cloneDir;

      this.logger.info(`${name[1]}: Cloning "${url}" into "${cloneDir}" ...`);

      const {stderr: stderrClone} = await execAsync(`git clone --depth 1 "${url}" "${cloneDir}"`);

      if (stderrClone.includes('fatal')) {
        throw new Error(stderrClone);
      }
    }
  }

  private async createTempDir(): Promise<void> {
    this.TMP_DIR = await fs.mkdtemp(path.join(os.tmpdir(), 'license-collector-'));
  }

  private async findPackageJson(dir: string): Promise<string[]> {
    let candidates: string[] = [];

    dir = path.resolve(dir);

    const fileNames = await fs.readdir(dir);
    const files = fileNames.filter(file => !['node_modules', '.git'].includes(file)).map(file => path.join(dir, file));

    for (const file of files) {
      const lstat = await fs.lstat(file);
      if (lstat.isDirectory()) {
        const moreCandidates = await this.findPackageJson(file);
        candidates = candidates.concat(moreCandidates);
      } else if (file.endsWith('package.json')) {
        candidates.push(file);
      }
    }

    return candidates;
  }

  private async findRepositories(): Promise<void> {
    for (const index in this.repositories) {
      const {dir: cloneDir, name} = this.repositories[index];

      this.logger.info(`${name}: Discovering "package.json" files ...`);

      const packageFiles = await this.findPackageJson(cloneDir);
      const packageFileNames = packageFiles.map(fileName => fileName.replace(new RegExp(cloneDir, 'gm'), ''));

      this.logger.info(`${name}: Found "${packageFileNames.join('", "')}"`);
      this.logger.info(`${name}: Discovering direct dependencies ...`);

      for (const index in packageFiles) {
        let packageJson;

        try {
          packageJson = await fs.readJSON(packageFiles[index]);
        } catch (error) {}

        const dependencies = Object.keys(packageJson.dependencies || []).filter(Boolean);
        const devDependencies = Object.keys(packageJson.devDependencies || []).filter(Boolean);

        const plural = (length: number) => (length === 1 ? 'y' : 'ies');

        this.logger.info(
          `${name}: Found ${dependencies.length} production dependenc${plural(dependencies.length)} and ${
            devDependencies.length
          } dev dependenc${plural(devDependencies.length)} in "${packageFileNames[index]}".`,
        );

        for (const dependency of dependencies) {
          if (!this.dependencies.includes(dependency) && !this.options.filter.includes(dependency)) {
            this.dependencies.push(dependency);
          }
        }

        if (this.options.devDependencies) {
          for (const devDependency of devDependencies) {
            if (!this.dependencies.includes(devDependency) && !this.options.filter.includes(devDependency)) {
              this.dependencies.push(devDependency);
            }
          }
        }
      }
    }
  }

  private format(result: CrawlerResult): License[] {
    const licenses = [];
    const packages = Object.keys(result.data).sort();

    this.logger.info(`Extracted ${packages.length} licenses.`);

    for (const packageName of packages) {
      const currentPackage = result.data[packageName];

      const link = currentPackage.homepage || (currentPackage.repository ? currentPackage.repository.url : 'none');

      const license: License = {
        license: currentPackage.license || 'none',
        link,
        package: packageName,
        platform: 'web/desktop',
      };

      licenses.push(license);
    }

    this.logger.info(`Kept ${licenses.length} licenses after merging.`);

    return licenses;
  }

  private async crawl(): Promise<CrawlerResult> {
    this.logger.info('Extracting all licenses ...');

    const opts: pkginfo.Options = {
      packages: this.dependencies,
    };

    return new Promise((resolve, reject) => {
      return pkginfo(opts, (error: Error | null, data: pkginfo.Data) => {
        return error ? reject(error) : resolve(data);
      });
    });
  }

  public async collect(): Promise<License[]> {
    await this.checkPrerequisites();
    await this.createTempDir();
    await this.clone();
    await this.findRepositories();

    const result = await this.crawl();

    await fs.remove(this.TMP_DIR);

    return this.format(result);
  }
}
