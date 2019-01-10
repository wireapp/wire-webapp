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

const {join, resolve} = require('path');
const fs = require('fs');
const {SRC_PATH} = require('../locations');
const SUPPORTED_LOCALE = require(resolve(SRC_PATH, 'script/auth/supportedLocales'));

const root = resolve(__dirname, '..');
const translationsDir = resolve(root, process.argv[2] || '');

function transDir(file) {
  return join(translationsDir, file);
}

function getLocale(filename) {
  const localeRgx = /.+?-([a-zA-Z-]+)\.(po|js)/.exec(filename);
  return localeRgx && localeRgx[1];
}

function removeCountryFromFilename(filename) {
  const newFilename = filename.replace(/(.+?-[a-zA-Z]+)(?:-[a-zA-Z]+)?(\.(po|js))/, '$1$2');
  if (newFilename !== filename) {
    fs.renameSync(transDir(filename), transDir(newFilename));
  }
  return newFilename;
}

function fixApostrophe(file) {
  const lines = fs.readFileSync(file, 'utf8').split('\n');
  const newLines = lines.map(line => {
    const lineRgx = /^([^']*')(.*?)('[^']*)$/.exec(line);
    return lineRgx ? `${lineRgx[1]}${lineRgx[2].replace(/'/g, '’')}${lineRgx[3]}` : line; // eslint-disable-line no-magic-numbers
  });
  fs.writeFileSync(file, newLines.join('\n'));
}

function fixJSHeader(file) {
  const preamble = fs.readFileSync(resolve(__dirname, 'preamble.js'), 'utf8');
  const fileContent = fs.readFileSync(file, 'utf8');
  const fixedFile = fileContent.replace('#X-Generator: crowdin.com\n', preamble);
  fs.writeFileSync(file, fixedFile);
}

function addLanguageProperty(file, language) {
  const zstr = 'z.string.';
  const zstrl = `z.string.${language}.`;
  const zstrRegEx = new RegExp(zstr, 'g');
  const zstrlRegEx = new RegExp(zstrl, 'g');

  let fixedFile = fs.readFileSync(file, 'utf8');
  fixedFile = fixedFile.replace(zstrlRegEx, zstr).replace(zstrRegEx, zstrl);
  fs.writeFileSync(file, fixedFile);
}

function format(file) {
  let fixedFile = fs.readFileSync(file, 'utf8');
  fixedFile = fixedFile.replace(/='/g, " = '");
  fixedFile = fixedFile.replace(/'use=strict';\n/g, '');
  fixedFile = fixedFile.replace(/(\r\n|\r|\n){3}/g, '\n\n');
  fs.writeFileSync(file, fixedFile);
}

function processFiles(files) {
  files.forEach(file => {
    const locale = getLocale(file);
    if (!locale) {
      return;
    }

    const language = locale.split('-')[0];
    if (!SUPPORTED_LOCALE.includes(language)) {
      fs.unlinkSync(transDir(file));
      return;
    }

    const newFilename = removeCountryFromFilename(file);
    fixApostrophe(transDir(newFilename));
    fixJSHeader(transDir(newFilename));
    addLanguageProperty(transDir(newFilename), language);
    format(transDir(newFilename));
  });
}

processFiles(fs.readdirSync(translationsDir));
