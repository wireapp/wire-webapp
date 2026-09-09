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

import {useCallback, KeyboardEvent, MouseEvent, useEffect, useState} from 'react';

import {QualifiedId} from '@wireapp/api-client/lib/user';

import {SharedDriveUploadCompletedIcon, SharedDriveUploadSpinnerIcon} from '@wireapp/react-ui-kit';

import {useApplicationContext} from 'src/script/page/rootProvider';
import {generateConversationUrl} from 'src/script/router/routeGenerator';
import {createNavigate, createNavigateKeyboard} from 'src/script/router/routerBindings';
import {KEY} from 'Util/keyboardUtil';

import type {SharedDriveUploadController} from '../conversationCells/sharedDriveUploadController';
import {
  getLatestSharedDriveUploadStatus,
  type SharedDriveUploadStatusKind,
} from '../conversationCells/sharedDriveUploadStatus';

interface ConversationTabsProps {
  activeTabIndex: number;
  onIndexChange: (index: number) => void;
  conversationQualifiedId: QualifiedId;
  sharedDriveUploadController: SharedDriveUploadController;
  isUploadStatusIndicatorEnabled: boolean;
}

const FILE_PATH = 'files';

const toConversationQualifiedIdString = ({id, domain}: QualifiedId): string => `${id}@${domain}`;

export const ConversationTabs = ({
  activeTabIndex,
  onIndexChange,
  conversationQualifiedId,
  sharedDriveUploadController,
  isUploadStatusIndicatorEnabled,
}: ConversationTabsProps) => {
  const {translate} = useApplicationContext();
  const filesUrl = generateConversationUrl({...conversationQualifiedId, filePath: FILE_PATH});
  const messagesUrl = generateConversationUrl(conversationQualifiedId);
  const conversationQualifiedIdString = toConversationQualifiedIdString(conversationQualifiedId);
  const readUploadStatusKind = useCallback(
    () => getLatestSharedDriveUploadStatus(sharedDriveUploadController, conversationQualifiedIdString)?.kind ?? null,
    [sharedDriveUploadController, conversationQualifiedIdString],
  );
  const [uploadStatusKind, setUploadStatusKind] = useState<SharedDriveUploadStatusKind | null>(readUploadStatusKind);

  const handleKeyDown = useCallback(
    (event: KeyboardEvent<HTMLButtonElement>) => {
      const tabCount = 2;

      switch (event.key) {
        case KEY.ARROW_RIGHT:
          event.preventDefault();
          const nextTab = (activeTabIndex + 1) % tabCount;
          onIndexChange(nextTab);
          createNavigateKeyboard(nextTab === 0 ? messagesUrl : filesUrl, false, ['*'])(event);
          break;
        case KEY.ARROW_LEFT:
          event.preventDefault();
          const prevTab = (activeTabIndex - 1 + tabCount) % tabCount;
          onIndexChange(prevTab);
          createNavigateKeyboard(prevTab === 0 ? messagesUrl : filesUrl, false, ['*'])(event);
          break;
        default:
          break;
      }
    },
    [activeTabIndex, onIndexChange, messagesUrl, filesUrl],
  );

  const handleHashChange = useCallback(() => {
    const currentPath = window.location.hash;

    if (currentPath.includes(FILE_PATH)) {
      onIndexChange(1);
    } else {
      onIndexChange(0);
    }
  }, [onIndexChange]);

  useEffect(() => {
    handleHashChange();
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, [handleHashChange]);

  useEffect(() => {
    const updateUploadStatusKind = () => setUploadStatusKind(readUploadStatusKind());
    updateUploadStatusKind();
    return sharedDriveUploadController.subscribe(updateUploadStatusKind);
  }, [readUploadStatusKind, sharedDriveUploadController]);

  return (
    <div className="conversation-tabs">
      <div className="conversation-tabs__list" role="tablist" aria-label={translate('conversationTabs')}>
        <ConversationTab
          id="conversation"
          label={translate('cells.tableRow.conversationName')}
          isActive={activeTabIndex === 0}
          onClick={event => {
            createNavigate(messagesUrl)(event);
            onIndexChange(0);
          }}
          onKeyDown={handleKeyDown}
        />
        <ConversationTab
          id="files"
          label={translate('conversationDetailsActionCellsTitle')}
          isActive={activeTabIndex === 1}
          uploadStatusKind={isUploadStatusIndicatorEnabled ? uploadStatusKind : null}
          onClick={event => {
            createNavigate(filesUrl)(event);
            onIndexChange(1);
          }}
          onKeyDown={handleKeyDown}
        />
      </div>
    </div>
  );
};

interface ConversationTabProps {
  id: string;
  label: string;
  isActive: boolean;
  uploadStatusKind?: SharedDriveUploadStatusKind | null;
  onClick: (event: MouseEvent<HTMLButtonElement>) => void;
  onKeyDown: (event: KeyboardEvent<HTMLButtonElement>) => void;
}

const ConversationTab = ({id, label, isActive, uploadStatusKind = null, onClick, onKeyDown}: ConversationTabProps) => {
  return (
    <button
      id={`conversation-tab-${id}`}
      role="tab"
      aria-selected={isActive}
      aria-controls={`conversation-tabpanel-${id}`}
      tabIndex={isActive ? 0 : -1}
      onClick={onClick}
      onKeyDown={onKeyDown}
      className="conversation-tabs__button"
    >
      <span className="conversation-tabs__button-content">
        {label}
        {uploadStatusKind && <SharedDriveTabUploadStatusIcon kind={uploadStatusKind} />}
      </span>
    </button>
  );
};

const SharedDriveTabUploadStatusIcon = ({kind}: {kind: SharedDriveUploadStatusKind}) => {
  if (kind === 'uploading') {
    return (
      <SharedDriveUploadSpinnerIcon
        className="conversation-tabs__upload-status-icon conversation-tabs__upload-status-icon--uploading"
        width={16}
        height={16}
        data-uie-name="shared-drive-tab-upload-uploading"
        data-testid="shared-drive-tab-upload-uploading"
        aria-hidden="true"
      />
    );
  }

  return (
    <SharedDriveUploadCompletedIcon
      className="conversation-tabs__upload-status-icon"
      width={16}
      height={16}
      data-uie-name="shared-drive-tab-upload-completed"
      data-testid="shared-drive-tab-upload-completed"
      aria-hidden="true"
    />
  );
};
