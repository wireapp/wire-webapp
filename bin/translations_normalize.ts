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
// @ts-ignore
import authTranslations from '../temp/i18n/src/script/strings.json';
import webappTranslations from '../src/i18n/en-US.json';

interface Translation {
  defaultMessage: string;
  id: string;
}

type Translations = Record<string, string>;

const normalizedAuthTranslations = authTranslations.reduce(
  (accumulator: Translations, object: Translation): Translations => {
    accumulator[object.id] = object.defaultMessage;
    return accumulator;
  },
  {},
);

const mergedTranslations = {...webappTranslations, ...normalizedAuthTranslations};

fs.outputJson('src/i18n/en-US.json', mergedTranslations, {spaces: 2}).catch(err => console.error(err));
