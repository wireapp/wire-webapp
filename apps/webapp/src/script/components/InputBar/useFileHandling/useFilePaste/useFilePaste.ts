/*
 * Wire
 * Copyright (C) 2022 Wire Swiss GmbH
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

import {useCallback, useEffect} from 'react';

import {checkFileSharingPermission} from 'Components/Conversation/utils/checkFileSharingPermission';
import {t} from 'Util/LocalizerUtil';
import {formatLocale} from 'Util/TimeUtil';
import {getFileExtension} from 'Util/util';

interface UseFilePasteParams {
  onFilePasted: (file: File) => void;
  isFileNameKept?: boolean;
}

export const useFilePaste = ({onFilePasted, isFileNameKept}: UseFilePasteParams) => {
  const processClipboardFiles = useCallback(
    (files: FileList): void => {
      const [pastedFile] = files;

      if (!pastedFile) {
        return;
      }
      const {lastModified} = pastedFile;

      const date = formatLocale(lastModified || new Date(), 'PP, pp');
      const fileName = isFileNameKept
        ? pastedFile.name
        : `${t('conversationSendPastedFile', {date})}.${getFileExtension(pastedFile.name)}`;

      const newFile = new File([pastedFile], fileName, {
        type: pastedFile.type,
      });

      onFilePasted(newFile);
    },
    [onFilePasted, isFileNameKept],
  );

  const handlePasteEvent = useCallback(
    (event: ClipboardEvent) => {
      if (event.clipboardData?.types.includes('text/plain')) {
        return;
      }
      // Avoid copying the filename into the input field
      event.preventDefault();
      const files = event.clipboardData?.files;

      if (files) {
        const permissionHandler = checkFileSharingPermission(processClipboardFiles);
        permissionHandler(files);
      }
    },
    [processClipboardFiles],
  );

  useEffect(() => {
    document.addEventListener('paste', handlePasteEvent);
    return () => document.removeEventListener('paste', handlePasteEvent);
  }, [handlePasteEvent]);
};
