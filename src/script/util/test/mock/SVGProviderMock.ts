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

import fs from 'fs';
import path from 'path';
const parser = new DOMParser();
const mockSVG = parser.parseFromString(
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16"><path d="M0 7v2h7v7h2V9h7V7H9V0H7v7z"/></svg>',
  'image/svg+xml',
);

const mockFileList = fs
  .readdirSync(path.resolve(__dirname, '../../../../../resource/image/icon'))
  .filter(file => file.endsWith('.svg'))
  .reduce((list, file: string) => {
    const iconName = file.substring(file.lastIndexOf('/') + 1).replace(/\.svg$/i, '');
    return Object.assign(list, {[iconName]: mockSVG});
  }, {});

jest.mock('../../../auth/util/SVGProvider', () => mockFileList);
