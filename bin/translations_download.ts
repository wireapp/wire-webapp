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

/* eslint-disable no-console */

import https from 'https';
import {join, resolve} from 'path';
import fs from 'fs';
import AdmZip from 'adm-zip';

// @ts-ignore
import sortJson from 'sort-json';

const root = resolve(__dirname, '..');
const destinationPath = resolve(root, 'src', 'i18n');
const zipPath = resolve(root, 'temp', 'i18n', `wire-webapp.zip`);

const getProjectKey = () => {
  const crowdinYaml = join(root, 'keys', 'crowdin.yaml');
  const crowdinYamlContent = fs.readFileSync(crowdinYaml, 'utf8');
  const keyRegex = /api_key: ([0-9a-f]+)/;
  return crowdinYamlContent.match(keyRegex)[1];
};

const projectKey = getProjectKey();

const CROWDIN_API = `https://api.crowdin.com/api/project/wire-webapp`;

const CROWDIN_URL = {
  DOWNLOAD: `${CROWDIN_API}/download/all.zip?key=${projectKey}`,
  EXPORT: `${CROWDIN_API}/export?key=${projectKey}&json`,
};

function fetchUpdates() {
  console.log('Building translations ...');

  return new Promise((resolve, reject) => {
    https.get(CROWDIN_URL.EXPORT, response => {
      if (response.statusCode < 200 || response.statusCode > 299) {
        reject(`Failed to export, status code: ${response.statusCode}`);
      }
      response.on('data', resolve);
      response.on('error', reject);
    });
  });
}

function download() {
  console.log('Downloading built translations ...');

  return new Promise((resolve, reject) => {
    https.get(CROWDIN_URL.DOWNLOAD, response => {
      if (response.statusCode < 200 || response.statusCode > 299) {
        reject(`Failed to download, status code: ${response.statusCode}`);
      }

      response.on('error', reject);

      const writeStream = fs.createWriteStream(zipPath);
      console.log('Writing zip file ...');

      response.pipe(writeStream);

      writeStream.on('finish', () => {
        const zip = new AdmZip(zipPath);
        zip.getEntries().forEach(entry => {
          if (!entry.isDirectory) {
            zip.extractEntryTo(entry, destinationPath, false, true);
          }
        });
        fs.unlinkSync(zipPath);
        resolve();
      });
    });
  });
}

function sortTranslationJson() {
  return fs.readdirSync(destinationPath).forEach(filename => sortJson.overwrite(join(destinationPath, filename)));
}

fetchUpdates()
  .then(download)
  .then(sortTranslationJson)
  .catch(error => {
    console.error(error);
    process.exit(1);
  });
