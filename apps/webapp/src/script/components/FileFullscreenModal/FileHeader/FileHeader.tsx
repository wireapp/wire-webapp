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

import {ChannelAvatar, GroupAvatar} from 'Components/avatar';
import {FileTypeIcon} from 'Components/Conversation/common/FileTypeIcon/FileTypeIcon';
import {
  CELLS_ACTION,
  useCellsActionPermissions,
} from 'Components/Conversation/ConversationCells/common/CellsSelfUserDriveRole/CellsSelfUserDriveRoleContext';
import {CellsViewerAccessLabel} from 'Components/Conversation/ConversationCells/common/CellsViewerAccessLabel';
import {isInRecycleBin} from 'Components/Conversation/ConversationCells/common/recycleBin/recycleBin';
import {EditIcon} from 'Components/icon';
import {iconStyles} from 'Components/MessagesList/Message/ContentMessage/asset/MultipartAssets/FileAssetCard/common/FileAssetOptions/FileAssetOptions.styles';
import {MessageTime} from 'Components/MessagesList/Message/MessageTime';
import {useFileHistoryModal} from 'Components/Modals/FileHistoryModal/hooks/useFileHistoryModal';
import {createRelativeTimestampFormatter, useRelativeTimestamp} from 'Hooks/useRelativeTimestamp';
import {CellsRepository} from 'Repositories/cells/cellsRepository';
import type {Conversation} from 'Repositories/entity/Conversation';
import {useApplicationContext} from 'src/script/page/rootProvider';
import {useKoSubscribableChildren} from 'Util/componentUtil';
import {useChannelsFeatureFlag} from 'Util/useChannelsFeatureFlag';
import {forcedDownloadFile, getFileNameWithExtension} from 'Util/util';

import {
  headerStyles,
  leftColumnStyles,
  closeButtonStyles,
  metadataStyles,
  metadataTextStyles,
  nameStyles,
  sourceConversationIconStyles,
  sourceConversationMetadataStyles,
  textStyles,
  timeStyles,
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
  fallbackConversationName?: string;
  sourceConversation?: Conversation;
  badges?: string[];
  fileUrl?: string;
  isEditable?: boolean;
  isInEditMode?: boolean;
  showViewOnlyLabel?: boolean;
  onEditModeChange: (isEditable: boolean) => void;
  onFileContentRefresh: () => void;
}

type ConversationIconType = 'channel' | 'group';

export const getConversationIconType = ({
  isChannel,
  isChannelsEnabled,
}: {
  isChannel: boolean;
  isChannelsEnabled: boolean;
}): ConversationIconType => (isChannel && isChannelsEnabled ? 'channel' : 'group');

export const FileHeader = ({
  id,
  onClose,
  fileUrl,
  fileName,
  fileExtension,
  senderName,
  timestamp,
  fallbackConversationName,
  sourceConversation,
  badges,
  isEditable,
  isInEditMode,
  showViewOnlyLabel = false,
  onEditModeChange,
  onFileContentRefresh,
}: FileHeaderProps) => {
  const {translate} = useApplicationContext();
  const canPerformCellsAction = useCellsActionPermissions();
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
          <div css={metadataTextStyles}>
            <h3 css={nameStyles}>{fileName}</h3>
            {(sourceConversation !== undefined ||
              (fallbackConversationName !== undefined && fallbackConversationName.length > 0)) && (
              <ConversationLabel conversation={sourceConversation} fallbackName={fallbackConversationName ?? ''} />
            )}
            <span css={textStyles}>{senderName}</span>
            <MessageTime timestamp={timestamp} data-timestamp-type="normal" css={timeStyles}>
              {timeAgo}
            </MessageTime>
          </div>
          {badges && badges.length > 0 && <BadgesWithTooltip items={badges} />}
        </div>
      </div>
      {isEditable === true && !showViewOnlyLabel && (
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
          {!isRecycleBin && canPerformCellsAction(CELLS_ACTION.EDIT) && (
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
        {showViewOnlyLabel && (
          <CellsViewerAccessLabel
            label={translate('cells.imageFullScreenModal.viewerAccessLabel')}
            iconUieName="file-header-view-only-icon"
          />
        )}
        {!showViewOnlyLabel && !isRecycleBin && canPerformCellsAction(CELLS_ACTION.DOWNLOAD) && (
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
        {!showViewOnlyLabel &&
          !isRecycleBin &&
          isEditable === true &&
          canPerformCellsAction(CELLS_ACTION.VIEW_VERSION_HISTORY) && (
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

const ConversationLabel = ({conversation, fallbackName}: {conversation?: Conversation; fallbackName: string}) => {
  if (conversation === undefined) {
    return <FallbackConversationLabel fallbackName={fallbackName} />;
  }

  return <ConversationEntityLabel conversation={conversation} fallbackName={fallbackName} />;
};

const FallbackConversationLabel = ({fallbackName}: {fallbackName: string}) => (
  <span css={sourceConversationMetadataStyles}>
    <span css={sourceConversationIconStyles} aria-hidden="true">
      <GroupAvatar size="small" />
    </span>
    <span css={textStyles}>{fallbackName}</span>
  </span>
);

const ConversationEntityLabel = ({conversation, fallbackName}: {conversation: Conversation; fallbackName: string}) => {
  const {isChannelsEnabled} = useChannelsFeatureFlag();
  const {isChannel, display_name: displayName} = useKoSubscribableChildren(conversation, ['isChannel', 'display_name']);
  const name = displayName || fallbackName;
  const iconType = getConversationIconType({isChannel, isChannelsEnabled});

  return (
    <span css={sourceConversationMetadataStyles}>
      <span css={sourceConversationIconStyles} aria-hidden="true">
        {iconType === 'channel' ? (
          <ChannelAvatar conversationID={conversation.id} isLocked={false} size="small" />
        ) : (
          <GroupAvatar conversationID={conversation.id} size="small" />
        )}
      </span>
      <span css={textStyles}>{name}</span>
    </span>
  );
};
