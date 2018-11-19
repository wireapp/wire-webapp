#!/usr/bin/env node

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

const fs = require('fs');

if (process.argv.length !== 4) {
  // eslint-disable-next-line no-console
  console.info(
    'Normalize translation files.\n\nUsage:\nnode normalize_translations.js [file with normal string identifiers] [file to normalize]\n\nExample:\nnode bin/normalize_translations.js app/script/localization/webapp.js app/script/localization/translations/webapp-de.js'
  );
  return;
}

const inFileName = process.argv[2];
const outFileName = process.argv[3];

const makeCamelCase = str => str.replace(/_[a-z]/g, letter => letter.replace('_', '').toUpperCase());
const rxPrefix = 'z\\.string\\.(?:[a-z]{2}\\.)?';
const idRegExp = RegExp(`${rxPrefix}(\\S+)`);

const inLines = fs.readFileSync(inFileName, 'utf8').split('\n');
const replacements = inLines.reduce((list, line) => {
  const match = idRegExp.exec(line);
  if (match) {
    list[makeCamelCase(match[1])] = match[1];
  }
  return list;
}, {});

fs.readFile(outFileName, 'utf8', (error, file) => {
  if (error) {
    return console.error(error);
  }
  Object.entries(replacements).forEach(([key, value]) => {
    file = file.replace(RegExp(`(${rxPrefix})${key} `, 'gm'), `$1${value} `);
  });
  fs.writeFileSync(outFileName, file, 'utf8');
});
