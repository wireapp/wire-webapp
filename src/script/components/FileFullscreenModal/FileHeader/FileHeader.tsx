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

import {BadgesWithTooltip, Button, ButtonVariant, CloseIcon, DownloadIcon} from '@wireapp/react-ui-kit';

import {FileTypeIcon} from 'Components/Conversation/common/FileTypeIcon/FileTypeIcon';
import {MessageTime} from 'Components/MessagesList/Message/MessageTime';
import {useRelativeTimestamp} from 'Hooks/useRelativeTimestamp';
import {t} from 'Util/LocalizerUtil';
import {forcedDownloadFile, getFileNameWithExtension} from 'Util/util';

import {
  headerStyles,
  leftColumnStyles,
  closeButtonStyles,
  metadataStyles,
  nameStyles,
  textStyles,
  downloadButtonStyles,
  actionButtonsStyles,
} from './FileHeader.styles';

interface FileHeaderProps {
  onClose: () => void;
  fileName: string;
  fileExtension: string;
  senderName: string;
  timestamp: number;
  badges?: string[];
  fileUrl?: string;
}

export const FileHeader = ({
  onClose,
  fileUrl,
  fileName,
  fileExtension,
  senderName,
  timestamp,
  badges,
}: FileHeaderProps) => {
  const timeAgo = useRelativeTimestamp(timestamp);
  const fileNameWithExtension = getFileNameWithExtension(fileName, fileExtension);

  return (
    <header css={headerStyles}>
      <div css={leftColumnStyles}>
        <button
          type="button"
          css={closeButtonStyles}
          aria-label={t('cells.imageFullScreenModal.closeButton')}
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
          {badges && badges.length > 0 && <BadgesWithTooltip items={badges} />}
        </div>
      </div>
      <div css={actionButtonsStyles}>
        <Button
          variant={ButtonVariant.TERTIARY}
          css={downloadButtonStyles}
          onClick={() => forcedDownloadFile({url: fileUrl || '', name: fileNameWithExtension})}
          disabled={!fileUrl}
          aria-label={t('cells.imageFullScreenModal.downloadButton')}
        >
          <DownloadIcon />
        </Button>
      </div>
    </header>
  );
};
