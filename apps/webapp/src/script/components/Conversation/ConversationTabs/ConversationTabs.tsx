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

import {useCallback, KeyboardEvent, MouseEvent, useEffect} from 'react';

import {QualifiedId} from '@wireapp/api-client/lib/user';

import {generateConversationUrl} from 'src/script/router/routeGenerator';
import {createNavigate, createNavigateKeyboard} from 'src/script/router/routerBindings';
import {KEY} from 'Util/KeyboardUtil';
import {t} from 'Util/LocalizerUtil';

interface ConversationTabsProps {
  activeTabIndex: number;
  onIndexChange: (index: number) => void;
  conversationQualifiedId: QualifiedId;
}

const FILE_PATH = 'files';

export const ConversationTabs = ({activeTabIndex, onIndexChange, conversationQualifiedId}: ConversationTabsProps) => {
  const filesUrl = generateConversationUrl({...conversationQualifiedId, filePath: FILE_PATH});
  const messagesUrl = generateConversationUrl(conversationQualifiedId);

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

  return (
    <div className="conversation-tabs">
      <div className="conversation-tabs__list" role="tablist" aria-label={t('conversationTabs')}>
        <ConversationTab
          id="conversation"
          label="Conversation"
          isActive={activeTabIndex === 0}
          onClick={event => {
            createNavigate(messagesUrl)(event);
            onIndexChange(0);
          }}
          onKeyDown={handleKeyDown}
        />
        <ConversationTab
          id="files"
          label={t('conversationDetailsActionCellsTitle')}
          isActive={activeTabIndex === 1}
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
  onClick: (event: MouseEvent<HTMLButtonElement>) => void;
  onKeyDown: (event: KeyboardEvent<HTMLButtonElement>) => void;
}

const ConversationTab = ({id, label, isActive, onClick, onKeyDown}: ConversationTabProps) => {
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
      {label}
    </button>
  );
};
