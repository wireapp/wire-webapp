/*
 * Wire
 * Copyright (C) 2025 Wire Swiss GmbH
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

import {FileType} from './fileType';

const extensions: Record<Exclude<FileType, 'other'>, string[]> = {
  pdf: ['pdf'],
  document: ['docx', 'doc', 'dotx', 'dot', 'odt', 'ott', 'rtf', 'pages', 'wps', 'tex', 'odf'],
  archive: ['zip', 'rar', '7z', 'tar', 'gz', 'bz2', 'xz', 'iso'],
  audio: ['mp3', 'wav', 'ogg', 'm4a', 'flac', 'aac', 'wma', 'aiff', 'opus'],
  video: ['mov', 'mp4', 'm4v', 'ogv', 'webm', 'avi', 'wmv'],
  spreadsheet: ['xlsx', 'xls', 'xltx', 'xlt', 'ods', 'ots', 'csv', 'numbers', 'dif'],
  code: [
    'xml',
    'html',
    'htm',
    'js',
    'json',
    'css',
    'php',
    'phtml',
    'sparql',
    'py',
    'cs',
    'java',
    'jsp',
    'sql',
    'cgi',
    'pl',
    'inc',
    'xsl',
    'sh',
    'bat',
    'ts',
    'tsx',
    'jsx',
    'rb',
    'kt',
    'swift',
    'go',
    'rs',
    'yml',
    'yaml',
  ],
  presentation: ['pptx', 'ppt', 'ppsx', 'pps', 'odp', 'otp', 'key', 'gslides'],
  image: ['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg', 'bmp', 'tiff', 'ico'],
  text: ['txt', 'md', 'log'],
};

export const getFileTypeFromExtension = (extension: string): FileType => {
  const ext = extension.toLowerCase().replace(/^\./, '');

  // eslint-disable-next-line id-length
  const type = Object.entries(extensions).find(([_, exts]) => exts.includes(ext))?.[0] as FileType | undefined;

  return type ?? 'other';
};
