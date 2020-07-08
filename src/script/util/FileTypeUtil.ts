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
  const allowedExtentions = Config.getConfig().FEATURE.ALLOWED_FILE_UPLOAD_EXTENSIONS;
  return allowedExtentions.some(extension => ['*', '.*', '*.*'].includes(extension));
};

export const hasAllowedExtension = (fileName: string): boolean => {
  const allowedExtentions = Config.getConfig().FEATURE.ALLOWED_FILE_UPLOAD_EXTENSIONS;

  // Creates a regex like this: (\.txt|\.pdf)$
  const fileExtRegex = new RegExp(`(\\${allowedExtentions.join('|\\')})$`);
  return fileExtRegex.test(fileName.toLowerCase());
};

export const isAllowedFile = (name: string, type: string): boolean => {
  const [imageFileExtensions, imageContentTypes] = partition(Config.getConfig().ALLOWED_IMAGE_TYPES, allowedImageType =>
    allowedImageType.startsWith('.'),
  );
  if (imageContentTypes.includes(type)) {
    return true;
  }
  const allowedExtentions = [...imageFileExtensions, ...Config.getConfig().FEATURE.ALLOWED_FILE_UPLOAD_EXTENSIONS];
  const fileExtRegex = new RegExp(`(\\${allowedExtentions.join('|\\')})$`);
  return fileExtRegex.test(name.toLowerCase());
};

export const getFileExtensionOrName = (fileName: string): string => fileName.match(/(\.?[^.]*)$/)[0];
