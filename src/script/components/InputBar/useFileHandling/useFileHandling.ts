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

import {t} from 'Util/LocalizerUtil';
import {formatLocale} from 'Util/TimeUtil';
import {getFileExtension} from 'Util/util';

interface UseFileHandlingProps {
  uploadDroppedFiles: (files: File[]) => void;
}

export const useFileHandling = ({uploadDroppedFiles}: UseFileHandlingProps) => {
  const [pastedFile, setPastedFile] = useState<File | null>(null);

  const clearPastedFile = () => setPastedFile(null);

  const sendPastedFile = () => {
    if (pastedFile) {
      uploadDroppedFiles([pastedFile]);
      clearPastedFile();
    }
  };

  const handlePasteFiles = (files: FileList): void => {
    const [pastedFile] = files;

    if (!pastedFile) {
      return;
    }
    const {lastModified} = pastedFile;

    const date = formatLocale(lastModified || new Date(), 'PP, pp');
    const fileName = `${t('conversationSendPastedFile', {date})}.${getFileExtension(pastedFile.name)}`;

    const newFile = new File([pastedFile], fileName, {
      type: pastedFile.type,
    });

    setPastedFile(newFile);
  };

  const sendImageOnEnterClick = (event: KeyboardEvent) => {
    if (event.key === 'Enter' && !event.shiftKey && !event.altKey && !event.metaKey) {
      sendPastedFile();
    }
  };

  useEffect(() => {
    if (!pastedFile) {
      return () => undefined;
    }

    window.addEventListener('keydown', sendImageOnEnterClick);

    return () => {
      window.removeEventListener('keydown', sendImageOnEnterClick);
    };
  }, [pastedFile]);

  return {
    pastedFile,
    clearPastedFile,
    sendPastedFile,
    handlePasteFiles,
  };
};
