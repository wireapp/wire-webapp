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

import {Config} from 'src/script/Config';
import {t} from 'Util/LocalizerUtil';

const CONFIG = Config.getConfig();

interface ValidationError {
  title: string;
  message: string;
}

export type ValidationResult = {isValid: true} | {isValid: false; error: ValidationError; invalidFiles: File[]};

interface ValidateFilesParams {
  newFiles: File[];
  currentFiles: File[];
  maxSize: number;
  maxFiles: number;
}

export const validateFiles = ({newFiles, currentFiles, maxSize, maxFiles}: ValidateFilesParams): ValidationResult => {
  const validations = [
    validateFileCount({currentFiles, newFiles, maxFiles}),
    validateFileSize({files: newFiles, maxSize}),
  ];

  const firstError = validations.find(validation => !validation.isValid);

  if (!firstError) {
    return {isValid: true};
  }

  return firstError;
};

interface ValidateFileSizeParams {
  files: File[];
  maxSize: number;
}

export const validateFileSize = ({files, maxSize}: ValidateFileSizeParams): ValidationResult => {
  const bytesMultiplier = 1024;
  const fileMaxSizeInMB = maxSize / bytesMultiplier / bytesMultiplier;
  const imageMaxSizeInMB = CONFIG.MAXIMUM_IMAGE_FILE_SIZE / bytesMultiplier / bytesMultiplier;

  const oversizedImages = files.filter(
    file =>
      (CONFIG.ALLOWED_IMAGE_TYPES as ReadonlyArray<string>).includes(file.type) &&
      file.size > CONFIG.MAXIMUM_IMAGE_FILE_SIZE,
  );

  const oversizedFiles = files.filter(file => file.size > maxSize);

  const getMessage = () => {
    if (oversizedImages.length > 0 && oversizedFiles.length > 0) {
      return t('conversationFileUploadFailedTooLargeFilesAndImagesMessage', {
        maxImageSize: imageMaxSizeInMB,
        maxFileSize: fileMaxSizeInMB,
      });
    }
    if (oversizedImages.length > 0) {
      return t('conversationFileUploadFailedTooLargeImagesMessage', {maxSize: imageMaxSizeInMB});
    }
    return t('conversationFileUploadFailedTooLargeFilesMessage', {maxSize: fileMaxSizeInMB});
  };

  if (oversizedFiles.length > 0 || oversizedImages.length > 0) {
    return {
      isValid: false,
      error: {
        title: t('conversationFileUploadFailedTooLargeFilesHeading'),
        message: getMessage(),
      },
      invalidFiles: [...oversizedFiles, ...oversizedImages],
    };
  }
  return {isValid: true};
};

interface ValidateFileCountParams {
  currentFiles: File[];
  newFiles: File[];
  maxFiles: number;
}

export const validateFileCount = ({currentFiles, newFiles, maxFiles}: ValidateFileCountParams): ValidationResult => {
  if (currentFiles.length + newFiles.length > maxFiles) {
    return {
      isValid: false,
      error: {
        title: t('conversationFileUploadFailedTooManyFilesHeading'),
        message: t('conversationFileUploadFailedTooManyFilesMessage', {maxFiles}),
      },
      invalidFiles: [],
    };
  }
  return {isValid: true};
};
