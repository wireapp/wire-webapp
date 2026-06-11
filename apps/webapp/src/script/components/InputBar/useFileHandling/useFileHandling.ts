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

import {useCallback, useEffect, useState} from 'react';

import {amplify} from 'amplify';

import {WebAppEvents} from '@wireapp/webapp-events';

import {useFilePaste} from './useFilePaste/useFilePaste';

interface UseFileHandlingProps {
  uploadDroppedFiles: (files: File[]) => void;
  uploadImages: (images: File[]) => void;
  isFileNameKept?: boolean;
  createPastedFileName: (date: string, originalFileName: string) => string;
  restrictedFileSharingMessage: string;
  restrictedFileSharingTitle: string;
}

export const useFileHandling = ({
  uploadDroppedFiles,
  uploadImages,
  isFileNameKept,
  createPastedFileName,
  restrictedFileSharingMessage,
  restrictedFileSharingTitle,
}: UseFileHandlingProps) => {
  const [pastedFile, setPastedFile] = useState<File | null>(null);

  useFilePaste({
    onFilePasted: file => {
      setPastedFile(file);
    },
    isFileNameKept,
    createPastedFileName,
    restrictedFileSharingMessage,
    restrictedFileSharingTitle,
  });

  const clearPastedFile = useCallback(() => {
    setPastedFile(null);
  }, []);

  const sendPastedFile = useCallback(() => {
    if (pastedFile) {
      uploadDroppedFiles([pastedFile]);
      clearPastedFile();
    }
  }, [clearPastedFile, pastedFile, uploadDroppedFiles]);

  const sendImageOnEnterClick = useCallback(
    (event: KeyboardEvent) => {
      if (event.key === 'Enter' && !event.shiftKey && !event.altKey && !event.metaKey) {
        void sendPastedFile();
      }
    },
    [sendPastedFile],
  );

  useEffect(() => {
    if (!pastedFile) {
      return () => undefined;
    }

    window.addEventListener('keydown', sendImageOnEnterClick);

    return () => {
      window.removeEventListener('keydown', sendImageOnEnterClick);
    };
  }, [pastedFile, sendImageOnEnterClick]);

  useEffect(() => {
    amplify.subscribe(WebAppEvents.CONVERSATION.IMAGE.SEND, uploadImages);

    return () => {
      amplify.unsubscribeAll(WebAppEvents.CONVERSATION.IMAGE.SEND);
    };
  }, [uploadImages]);

  return {
    pastedFile,
    clearPastedFile,
    sendPastedFile,
  };
};
