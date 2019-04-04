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
 */

import path from 'path';

import axios from 'axios';
import FormData from 'form-data';
import fs from 'fs-extra';
import JSZip from 'jszip';

import {TWO_HUNDRED_MB_IN_BYTES} from './deploy-utils';

const HOCKEY_API_URL = 'https://rink.hockeyapp.net/api/2/apps';

interface HockeyOptions {
  hockeyAppId: string;
  hockeyToken: string;
  version: string;
}

interface HockeyUploadOptions extends HockeyOptions {
  filePath: string;
  hockeyVersionId: number | string;
}

interface HockeyAPIVersionData {
  config_url: string;
  id: string;
  public_url: string;
  shortversion: string;
  status: 1 | 2;
  timestamp: number;
  title: string;
  version: string;
}

/** @see https://support.hockeyapp.net/kb/api/ */
interface HockeyAPIOptions {
  /** optional, release notes as Textile or Markdown (after 5k characters notes are truncated) */
  notes?: string;
  /**
   * optional, type of release notes:
   * * `0`: Textile
   * * `1`: Markdown
   */
  notes_type?: 0 | 1;
  /**
   * optional, download status (can only be set with full-access tokens):
   * * `1`: Don't allow users to download or install the version
   * * `2`: Available for download or installation
   */
  status?: 1 | 2;
}

/** @see https://support.hockeyapp.net/kb/api/api-versions#create-version */
interface HockeyAPICreateVersionOptions extends HockeyAPIOptions {
  /** optional, set to CFBundleShortVersionString (iOS and OS X) or to versionName (Android) */
  bundle_short_version?: string;
  /** mandatory, set to CFBundleVersion (iOS and OS X) or to versionCode (Android) */
  bundle_version: string;
}

/** @see https://support.hockeyapp.net/kb/api/api-versions#update-version */
interface HockeyAPIUpdateVersionOptions extends HockeyAPIOptions {
  /**
   * optional, notify testers (can only be set with full-access tokens):
   * * `0`: Don't notify testers
   * * `1`: Notify all testers that can install this app
   */
  notify?: 0 | 1;
}

function zip(originalFile: string, zipFile: string): Promise<string> {
  const resolvedOriginal = path.resolve(originalFile);
  const resolvedZip = path.resolve(zipFile);

  const jszipOptions = {
    compressionOptions: {level: 9},
    streamFiles: true,
  };

  return new Promise((resolve, reject) => {
    const readStream = fs.createReadStream(resolvedOriginal).on('error', reject);
    const writeStream = fs
      .createWriteStream(resolvedZip)
      .on('error', reject)
      .on('finish', () => resolve(resolvedZip));
    const jszip = new JSZip().file(path.basename(resolvedOriginal), readStream);

    jszip
      .generateNodeStream(jszipOptions)
      .pipe(writeStream)
      .on('error', reject);
  });
}

async function createVersion(options: HockeyOptions): Promise<HockeyAPIVersionData> {
  const {hockeyAppId, hockeyToken, version} = options;
  const [majorVersion, minorVersion, patchVersion] = version.split('.');

  const hockeyUrl = `${HOCKEY_API_URL}/${hockeyAppId}/app_versions/new`;

  const headers = {
    'X-HockeyAppToken': hockeyToken,
  };

  const postData: HockeyAPICreateVersionOptions = {
    bundle_short_version: `${majorVersion}.${minorVersion}`,
    bundle_version: patchVersion,
    notes: 'Jenkins Build',
  };

  try {
    const response = await axios.post<HockeyAPIVersionData>(hockeyUrl, postData, {headers});
    return response.data;
  } catch (error) {
    console.error(error);
    throw new Error(
      `Hockey version creation failed with status code "${error.response.status}": "${error.response.statusText}"`
    );
  }
}

async function uploadVersion(options: HockeyUploadOptions): Promise<void> {
  const {filePath, hockeyAppId, hockeyToken, hockeyVersionId} = options;
  const resolvedFile = path.resolve(filePath);

  const hockeyUrl = `${HOCKEY_API_URL}/${hockeyAppId}/app_versions/${hockeyVersionId}`;

  const postData: HockeyAPIUpdateVersionOptions = {
    notify: 0,
    status: 2,
  };

  const readStream = fs.createReadStream(resolvedFile).on('error', error => {
    throw error;
  });
  const formData = new FormData();

  Object.entries(postData).forEach(([key, value]) => formData.append(key, value));
  formData.append('files', readStream);

  const headers = {
    ...formData.getHeaders(),
    'X-HockeyAppToken': hockeyToken,
  };

  try {
    await axios.put<void>(hockeyUrl, formData, {headers, maxContentLength: TWO_HUNDRED_MB_IN_BYTES});
  } catch (error) {
    console.error(error);
    throw new Error(
      `Hockey version upload failed with status code "${error.response.status}": "${error.response.statusText}"`
    );
  }
}

export {createVersion, HockeyOptions, HockeyAPIVersionData, HockeyUploadOptions, uploadVersion, zip};
