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

import {useCallback, KeyboardEvent} from 'react';

interface ConversationTabsProps {
  activeTabIndex: number;
  onIndexChange: (index: number) => void;
}

export const ConversationTabs = ({activeTabIndex, onIndexChange}: ConversationTabsProps) => {
  const handleKeyDown = useCallback(
    (event: KeyboardEvent<HTMLButtonElement>) => {
      const tabCount = 2;

      switch (event.key) {
        case 'ArrowRight':
          event.preventDefault();
          const nextTab = (activeTabIndex + 1) % tabCount;
          onIndexChange(nextTab);
          break;
        case 'ArrowLeft':
          event.preventDefault();
          const prevTab = (activeTabIndex - 1 + tabCount) % tabCount;
          onIndexChange(prevTab);
          break;
        case 'Home':
          event.preventDefault();
          onIndexChange(0);
          break;
        case 'End':
          event.preventDefault();
          onIndexChange(tabCount - 1);
          break;
        default:
          break;
      }
    },
    [activeTabIndex, onIndexChange],
  );

  return (
    <div className="conversation-tabs">
      <div className="conversation-tabs__list" role="tablist" aria-label="Conversation tabs">
        <ConversationTab
          id="conversation"
          label="Conversation"
          isActive={activeTabIndex === 0}
          onClick={() => onIndexChange(0)}
          onKeyDown={handleKeyDown}
        />
        <ConversationTab
          id="files"
          label="Files"
          isActive={activeTabIndex === 1}
          onClick={() => onIndexChange(1)}
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
  onClick: () => void;
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
