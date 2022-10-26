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

export interface CopyConfigOptions {
  /**
   * The directory to clone or download into.
   *
   * @example `./config`
   */
  baseDir?: string;
  /**
   * An external directory to copy from.
   * Disables cloning to and initial deletion of the source directory.
   *
   * @example `/home/user/externalDir`
   */
  externalDir?: string;
  /**
   * Which files to copy (`{source: destination}`)
   *
   * @example
   * {
   *   '/path/to/source.txt': '/path/to/destination.txt',
   *   '/path/to/source/': '/path/to/destination/',
   *   '/path/to/anotherDir/*': [
   *     '/path/to/thirdDir/', '/path/to/destinationDir/
   *   ']
   * }
   */
  files?: Record<string, string | string[]>;
  /** Force using HTTPS download over `git clone` */
  forceDownload?: boolean;
  /**
   * From where to clone the configuration.
   *
   * @example `https://github.com/wireapp/wire-web-config-default#v0.7.1`
   */
  repositoryUrl: string;
}
