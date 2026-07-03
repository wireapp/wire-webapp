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

import {useMemo} from 'react';

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

import {FileTypeIcon} from 'Components/Conversation/common/FileTypeIcon/FileTypeIcon';
import {isInRecycleBin} from 'Components/Conversation/ConversationCells/common/recycleBin/recycleBin';
import {EditIcon} from 'Components/icon';
import {iconStyles} from 'Components/MessagesList/Message/ContentMessage/asset/MultipartAssets/FileAssetCard/common/FileAssetOptions/FileAssetOptions.styles';
import {MessageTime} from 'Components/MessagesList/Message/MessageTime';
import {useFileHistoryModal} from 'Components/Modals/FileHistoryModal/hooks/useFileHistoryModal';
import {createRelativeTimestampFormatter, useRelativeTimestamp} from 'Hooks/useRelativeTimestamp';
import {CellsRepository} from 'Repositories/cells/cellsRepository';
import {useApplicationContext} from 'src/script/page/rootProvider';
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
  const {translate} = useApplicationContext();
  const relativeTimestampFormatter = useMemo(() => {
    return createRelativeTimestampFormatter({
      justNow: translate('conversationJustNow'),
      today: translate('conversationToday'),
      yesterday: translate('conversationYesterday'),
    });
  }, [translate]);
  const timeAgo = useRelativeTimestamp(timestamp, false, relativeTimestampFormatter);
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
          aria-label={translate('cells.imageFullScreenModal.closeButton')}
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
          {badges !== null && badges !== undefined && badges.length > 0 && <BadgesWithTooltip items={badges} />}
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
            aria-label={translate('cells.imageFullScreenModal.downloadButton')}
          >
            <DownloadIcon />
          </Button>
        )}
        {!isRecycleBin && isEditable === true && (
          <DropdownMenu>
            <DropdownMenu.Trigger asChild>
              <Button
                variant={ButtonVariant.TERTIARY}
                css={downloadButtonStyles}
                aria-label={translate('cells.options.label')}
              >
                <MoreIcon css={iconStyles} />
              </Button>
            </DropdownMenu.Trigger>
            <DropdownMenu.Content>
              <DropdownMenu.Item onClick={() => showModal(id, () => onFileContentRefresh())}>
                {translate('cells.options.versionHistory')}
              </DropdownMenu.Item>
            </DropdownMenu.Content>
          </DropdownMenu>
        )}
      </div>
    </header>
  );
};
