/*
 * Wire
 * Copyright (C) 2024 Wire Swiss GmbH
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

import {useEffect, useState} from 'react';

import {isNull} from '@sindresorhus/is';
import {amplify} from 'amplify';

import {WebAppEvents} from '@wireapp/webapp-events';

import type {Translate} from 'Util/localizerUtil';

import {useFilePaste} from './useFilePaste/useFilePaste';

interface UseFileHandlingProps {
  uploadDroppedFiles: (files: File[]) => void;
  uploadImages: (images: File[]) => void;
  isFileUploadAllowed: boolean;
  isFileNameKept?: boolean;
  translate: Translate;
}

export const useFileHandling = ({
  uploadDroppedFiles,
  uploadImages,
  isFileUploadAllowed,
  isFileNameKept,
  translate,
}: UseFileHandlingProps) => {
  const [pastedFile, setPastedFile] = useState<File | null>(null);

  useFilePaste({
    onFilePasted: file => {
      if (isFileUploadAllowed) {
        setPastedFile(file);
      }
    },
    isFileNameKept,
    translate,
  });

  const clearPastedFile = () => {
    return setPastedFile(null);
  };

  const sendPastedFile = () => {
    if (isFileUploadAllowed && !isNull(pastedFile)) {
      uploadDroppedFiles([pastedFile]);
      clearPastedFile();
    }
  };

  const sendImageOnEnterClick = (event: KeyboardEvent) => {
    if (event.key === 'Enter' && !event.shiftKey && !event.altKey && !event.metaKey) {
      sendPastedFile();
    }
  };

  useEffect(() => {
    if (isNull(pastedFile) || !isFileUploadAllowed) {
      return () => {
        return undefined;
      };
    }

    window.addEventListener('keydown', sendImageOnEnterClick);

    return () => {
      window.removeEventListener('keydown', sendImageOnEnterClick);
    };
  }, [pastedFile, isFileUploadAllowed]);

  useEffect(() => {
    const uploadImagesIfAllowed = (images: File[]) => {
      if (isFileUploadAllowed) {
        uploadImages(images);
      }
    };
    amplify.subscribe(WebAppEvents.CONVERSATION.IMAGE.SEND, uploadImagesIfAllowed);

    return () => {
      amplify.unsubscribe(WebAppEvents.CONVERSATION.IMAGE.SEND, uploadImagesIfAllowed);
    };
  }, [isFileUploadAllowed, uploadImages]);

  return {
    pastedFile,
    clearPastedFile,
    sendPastedFile,
  };
};
