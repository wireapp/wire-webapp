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

import {FileTypeIcon} from 'Components/Conversation/common/FileTypeIcon/FileTypeIcon';
import {PrimaryModal} from 'Components/Modals/PrimaryModal';
import {getFileExtension} from 'Util/util';

import {fileNameStyles, itemStyles, listStyles} from './showFileDropzoneErrorModal.styles';

interface ShowFileDropzoneErrorModalParams {
  title: string;
  message: string;
  invalidFiles: File[];
}

export const showFileDropzoneErrorModal = ({title, message, invalidFiles}: ShowFileDropzoneErrorModalParams) => {
  // Timeout needed to display a modal
  setTimeout(() => {
    PrimaryModal.show(PrimaryModal.type.ACKNOWLEDGE, {
      text: {
        message: (
          <>
            {!!invalidFiles.length && <InvalidFilesList invalidFiles={invalidFiles} />}
            <p>{message}</p>
          </>
        ),
        title,
      },
    });
  }, 0);
};

const InvalidFilesList = ({invalidFiles}: {invalidFiles: File[]}) => {
  return (
    <ul css={listStyles}>
      {invalidFiles.map(file => (
        <li key={file.name} css={itemStyles}>
          <FileTypeIcon extension={getFileExtension(file.name)} />
          <span css={fileNameStyles}>{file.name}</span>
        </li>
      ))}
    </ul>
  );
};
