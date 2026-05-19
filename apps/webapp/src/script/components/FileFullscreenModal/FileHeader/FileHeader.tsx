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

import {
  BadgesWithTooltip,
  Button,
  ButtonVariant,
  CloseIcon,
  DownloadIcon,
  DropdownMenu,
  MoreIcon,
  ShowIcon,
} from '@wireapp/react-ui-kit';

import {FileTypeIcon} from 'Components/conversation/common/fileTypeIcon/fileTypeIcon';
import {isInRecycleBin} from 'Components/conversation/conversationCells/common/recycleBin/recycleBin';
import {EditIcon} from 'Components/icon';
import {iconStyles} from 'Components/messagesList/message/contentMessage/asset/multipartAssets/fileAssetCard/common/fileAssetOptions/fileAssetOptions.styles';
import {MessageTime} from 'Components/messagesList/message/messageTime';
import {useFileHistoryModal} from 'Components/modals/fileHistoryModal/hooks/useFileHistoryModal';
import {useRelativeTimestamp} from 'Hooks/useRelativeTimestamp';
import {CellsRepository} from 'Repositories/cells/cellsRepository';
import {t} from 'Util/localizerUtil';
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
} from './fileHeader.styles';

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
  onFileContentRefresh: () => void;
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
  onFileContentRefresh,
}: FileHeaderProps) => {
  const timeAgo = useRelativeTimestamp(timestamp);
  const fileNameWithExtension = getFileNameWithExtension(fileName, fileExtension);
  const isRecycleBin = isInRecycleBin();
  const cellsRepository = container.resolve(CellsRepository);
  const {showModal} = useFileHistoryModal();

  const handleFileDownload = async () => {
    if (fileUrl !== undefined && fileUrl.length > 0) {
      const node = await cellsRepository.getNode({uuid: id});
      const resolvedDownloadUrl = node.PreSignedGET?.Url ?? fileUrl;
      await forcedDownloadFile({url: resolvedDownloadUrl, name: fileNameWithExtension});
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
      {isEditable === true && (
        <div css={editModeButtonStyles}>
          <button
            title="Viewing"
            aria-label="Viewing"
            className={isInEditMode !== true ? 'active' : ''}
            onClick={() => onEditModeChange(false)}
          >
            <ShowIcon width={16} height={16} />
            Viewing
          </button>
          {!isRecycleBin && (
            <button
              title="Editing"
              aria-label="Editing"
              className={isInEditMode === true ? 'active' : ''}
              onClick={() => onEditModeChange(true)}
            >
              <EditIcon width={14} height={14} />
              Editing
            </button>
          )}
        </div>
      )}
      <div css={actionButtonsStyles}>
        {!isRecycleBin && (
          <Button
            variant={ButtonVariant.TERTIARY}
            css={downloadButtonStyles}
            onClick={handleFileDownload}
            disabled={fileUrl === undefined || fileUrl.length === 0}
            aria-label={t('cells.imageFullScreenModal.downloadButton')}
          >
            <DownloadIcon />
          </Button>
        )}
        {!isRecycleBin && isEditable === true && (
          <DropdownMenu>
            <DropdownMenu.Trigger asChild>
              <Button variant={ButtonVariant.TERTIARY} css={downloadButtonStyles} aria-label={t('cells.options.label')}>
                <MoreIcon css={iconStyles} />
              </Button>
            </DropdownMenu.Trigger>
            <DropdownMenu.Content>
              <DropdownMenu.Item onClick={() => showModal(id, () => onFileContentRefresh())}>
                {t('cells.options.versionHistory')}
              </DropdownMenu.Item>
            </DropdownMenu.Content>
          </DropdownMenu>
        )}
      </div>
    </header>
  );
};
