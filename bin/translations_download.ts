#!/usr/bin/env node

/*
 * Wire
 * Copyright (C) 2020 Wire Swiss GmbH
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

import https from 'https';
import * as path from 'path';
import fs from 'fs-extra';
import AdmZip from 'adm-zip';
import sortJson from 'sort-json';

const rootDir = path.resolve(__dirname, '..');
const destinationPath = path.join(rootDir, 'electron/locale');
const zipDir = path.join(rootDir, 'temp/i18n');
const zipPath = path.join(zipDir, 'wire-webapp.zip');

// https://crowdin.com/project/wire-webapp/settings#api
const getProjectAPIKey = () => {
  const crowdinYaml = path.join(rootDir, 'keys/crowdin.yaml');
  const crowdinYamlContent = fs.readFileSync(crowdinYaml, 'utf8');
  const keyRegex = /api_key: ([0-9a-f]+)/;
  return (crowdinYamlContent.match(keyRegex) || [])[1];
};

const projectAPIKey = getProjectAPIKey();

const CROWDIN_API = 'https://api.crowdin.com/api/project/wire-webapp';

const CROWDIN_URL = {
  DOWNLOAD: `${CROWDIN_API}/download/all.zip?key=${projectAPIKey}`,
  EXPORT: `${CROWDIN_API}/export?key=${projectAPIKey}&json`,
};

function fetchUpdates(): Promise<void> {
  console.info('Building translations ...');

  return new Promise((resolve, reject) => {
    https.get(CROWDIN_URL.EXPORT, response => {
      if (!response.statusCode) {
        return reject(new Error('Failed to export, no status code'));
      } else if (response.statusCode < 200 || response.statusCode > 299) {
        return reject(new Error(`Failed to export, status code: ${response.statusCode}`));
      }
      response.on('data', () => resolve());
      response.on('error', error => reject(error));
    });
  });
}

async function download(): Promise<void> {
  console.info('Downloading built translations ...');

  await fs.ensureDir(zipDir);

  await new Promise((resolve, reject) => {
    https.get(CROWDIN_URL.DOWNLOAD, response => {
      if (!response.statusCode) {
        return reject(new Error('Failed to export, no status code'));
      } else if (response.statusCode < 200 || response.statusCode > 299) {
        return reject(new Error(`Failed to export, status code: ${response.statusCode}`));
      }

      response.on('error', reject);

      const writeStream = fs.createWriteStream(zipPath);
      console.info('Writing zip file ...');

      response.pipe(writeStream);

      writeStream.on('error', error => reject(error));

      writeStream.on('finish', () => {
        console.info('Extracting zip file ...');
        const zip = new AdmZip(zipPath);
        zip.getEntries().forEach(entry => {
          if (!entry.isDirectory) {
            console.info(`Writing ${path.join(destinationPath, entry.name)} ...`);
            zip.extractEntryTo(entry, destinationPath, false, true);
          }
        });
        console.info('Deleting zip file ...');
        fs.unlinkSync(zipPath);
        resolve();
      });
    });
  });
}

async function sortTranslationJson(): Promise<void> {
  const filenames = await fs.readdir(destinationPath);
  filenames.forEach(filename => sortJson.overwrite(path.join(destinationPath, filename)));
}

fetchUpdates()
  .then(download)
  .then(sortTranslationJson)
  .catch(error => {
    console.error(error);
    process.exit(1);
  });
