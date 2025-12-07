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

import {partition} from 'Util/ArrayUtil';

import {Config} from '../Config';

export const allowsAllFiles = (): boolean => {
  const allowedExtensions = Config.getConfig().FEATURE.ALLOWED_FILE_UPLOAD_EXTENSIONS;
  return allowedExtensions.some(extension => ['*', '.*', '*.*'].includes(extension));
};

export const hasAllowedExtension = (fileName: string): boolean => {
  const allowedExtensions = Config.getConfig().FEATURE.ALLOWED_FILE_UPLOAD_EXTENSIONS;

  // Creates a regex like this: (\.txt|\.pdf)$
  const fileExtRegex = new RegExp(`(\\${allowedExtensions.join('|\\')})$`);
  return fileExtRegex.test(fileName.toLowerCase());
};

export const isAllowedFile = (name: string, type: string): boolean => {
  const allowedImages = [...Config.getConfig().ALLOWED_IMAGE_TYPES];
  const [imageFileExtensions, imageContentTypes] = partition(allowedImages, allowedImageType =>
    allowedImageType.startsWith('.'),
  );
  if ((imageContentTypes as ReadonlyArray<string>).includes(type)) {
    return true;
  }
  const allowedExtensions = [...imageFileExtensions, ...Config.getConfig().FEATURE.ALLOWED_FILE_UPLOAD_EXTENSIONS];
  const fileExtRegex = new RegExp(`(\\${allowedExtensions.join('|\\')})$`);
  return fileExtRegex.test(name.toLowerCase());
};

export const getFileExtensionOrName = (fileName: string): string => fileName.match(/(\.?[^.]*)$/)[0];

const EDITABLE_FILE_EXTENSIONS = ['odf', 'docx', 'xlsx', 'pptx'];

export const isFileEditable = (fileExtension: string): boolean => {
  return EDITABLE_FILE_EXTENSIONS.includes(fileExtension.toLowerCase());
};
