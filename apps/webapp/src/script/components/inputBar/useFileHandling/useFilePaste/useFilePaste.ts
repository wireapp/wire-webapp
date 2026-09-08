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

import {checkFileSharingPermission} from 'Components/conversation/utils/checkFileSharingPermission';
import type {Translate} from 'Util/localizerUtil';
import {formatLocale} from 'Util/timeUtil';
import {getFileExtension, sanitizeFilename} from 'Util/util';

interface UseFilePasteParams {
  onFilePasted: (file: File) => void;
  isFileNameKept?: boolean;
  translate: Translate;
}

export const useFilePaste = ({onFilePasted, isFileNameKept, translate}: UseFilePasteParams) => {
  const processClipboardFiles = useCallback(
    (files: FileList | File[]): void => {
      const pastedFile = Array.isArray(files) ? files[0] : files.item(0);

      if (pastedFile == null) {
        return;
      }
      const {lastModified} = pastedFile;

      const date = formatLocale(lastModified > 0 ? lastModified : new Date(), 'PP, pp');
      const rawFileName =
        isFileNameKept === true
          ? pastedFile.name
          : `${translate('conversationSendPastedFile', {date})}.${getFileExtension(pastedFile.name)}`;

      // Sanitize the filename to avoid encoding issues with locale-specific characters
      const fileName = sanitizeFilename(rawFileName);

      const newFile = new File([pastedFile], fileName, {
        type: pastedFile.type,
      });

      onFilePasted(newFile);
    },
    [onFilePasted, isFileNameKept, translate],
  );

  const handlePasteEvent = useCallback(
    (event: ClipboardEvent) => {
      if ((event.clipboardData?.types.includes('text/plain') ?? false) === true) {
        return;
      }
      // Avoid copying the filename into the input field
      event.preventDefault();
      const files = event.clipboardData?.files;

      if (files !== undefined && files.length > 0) {
        const permissionHandler = checkFileSharingPermission(processClipboardFiles, translate);
        permissionHandler(files);
      }
    },
    [processClipboardFiles, translate],
  );

  useEffect(() => {
    document.addEventListener('paste', handlePasteEvent);
    return () => document.removeEventListener('paste', handlePasteEvent);
  }, [handlePasteEvent]);
};
