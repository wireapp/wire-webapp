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

import {container} from 'tsyringe';

import {BadgesWithTooltip, Button, ButtonVariant, CloseIcon, DownloadIcon, ShowIcon} from '@wireapp/react-ui-kit';

import {FileTypeIcon} from 'Components/Conversation/common/FileTypeIcon/FileTypeIcon';
import {EditIcon} from 'Components/Icon';
import {MessageTime} from 'Components/MessagesList/Message/MessageTime';
import {useRelativeTimestamp} from 'Hooks/useRelativeTimestamp';
import {CellsRepository} from 'Repositories/cells/CellsRepository';
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
  editModeButtonStyles,
} from './FileHeader.styles';

interface FileHeaderProps {
  id: string;
  onClose: () => void;
  fileName: string;
  fileExtension: string;
  senderName: string;
  timestamp: number;
  badges?: string[];
  fileUrl?: string;
  isEditable?: boolean;
  isInEditMode?: boolean;
  onEditModeChange: (isEditable: boolean) => void;
}

export const FileHeader = ({
  id,
  onClose,
  fileUrl,
  fileName,
  fileExtension,
  senderName,
  timestamp,
  badges,
  isEditable,
  isInEditMode,
  onEditModeChange,
}: FileHeaderProps) => {
  const timeAgo = useRelativeTimestamp(timestamp);
  const fileNameWithExtension = getFileNameWithExtension(fileName, fileExtension);
  const cellsRepository = container.resolve(CellsRepository);

  const handleFileDownload = async () => {
    if (fileUrl) {
      const node = await cellsRepository.getNode({uuid: id, flags: []});
      await forcedDownloadFile({url: node.PreSignedGET?.Url || fileUrl, name: fileNameWithExtension});
    }
  };

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
      {isEditable && (
        <div css={editModeButtonStyles}>
          <button
            title="Viewing"
            aria-label="Viewing"
            className={!isInEditMode ? 'active' : ''}
            onClick={() => onEditModeChange(false)}
          >
            <ShowIcon width={16} height={16} />
            Viewing
          </button>
          <button
            title="Editing"
            aria-label="Editing"
            className={isInEditMode ? 'active' : ''}
            onClick={() => onEditModeChange(true)}
          >
            <EditIcon width={14} height={14} />
            Editing
          </button>
        </div>
      )}
      <div css={actionButtonsStyles}>
        <Button
          variant={ButtonVariant.TERTIARY}
          css={downloadButtonStyles}
          onClick={handleFileDownload}
          disabled={!fileUrl}
          aria-label={t('cells.imageFullScreenModal.downloadButton')}
        >
          <DownloadIcon />
        </Button>
      </div>
    </header>
  );
};
