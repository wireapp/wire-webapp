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

import {CloseIcon} from '@wireapp/react-ui-kit';

import {FileTypeIcon} from 'Components/Conversation/common/FileTypeIcon/FileTypeIcon';
import {MessageTime} from 'Components/MessagesList/Message/MessageTime';
import {useRelativeTimestamp} from 'Hooks/useRelativeTimestamp';
import {t} from 'Util/LocalizerUtil';

import {
  headerStyles,
  leftColumnStyles,
  closeButtonStyles,
  metadataStyles,
  nameStyles,
  textStyles,
} from './FileHeader.styles';

interface FileHeaderProps {
  onClose: () => void;
  fileName: string;
  fileExtension: string;
  senderName: string;
  timestamp: number;
}

export const FileHeader = ({onClose, fileName, fileExtension, senderName, timestamp}: FileHeaderProps) => {
  const timeAgo = useRelativeTimestamp(timestamp);

  return (
    <header css={headerStyles}>
      <div css={leftColumnStyles}>
        <button
          type="button"
          css={closeButtonStyles}
          aria-label={t('cellsGlobalView.imageFullScreenModalCloseButton')}
          onClick={onClose}
        >
          <CloseIcon />
        </button>
        <div css={metadataStyles}>
          <FileTypeIcon extension={fileExtension} />
          <h3 css={nameStyles}>{fileName}</h3>
          <p css={textStyles}>{senderName}</p>
          <MessageTime timestamp={timestamp} data-timestamp-type="normal" css={textStyles}>
            {timeAgo}
          </MessageTime>
        </div>
      </div>
    </header>
  );
};
