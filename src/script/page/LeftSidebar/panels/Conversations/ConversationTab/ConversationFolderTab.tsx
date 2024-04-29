/*
 * Wire
 * Copyright (C) 2024 Wire Swiss GmbH
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

import cx from 'classnames';

import {Config} from 'src/script/Config';
import {createLabel} from 'src/script/conversation/ConversationLabelRepository';
import {ConversationRepository} from 'src/script/conversation/ConversationRepository';
import {Conversation} from 'src/script/entity/Conversation';
import {useFolderState, useSidebarStore} from 'src/script/page/LeftSidebar/panels/Conversations/state';
import {ContextMenuEntry, showContextMenu} from 'src/script/ui/ContextMenu';
import {t} from 'Util/LocalizerUtil';

import {SidebarTabs} from '../Conversations';

interface ConversationFolderTabProps {
  title: string;
  label?: string;
  type: SidebarTabs;
  conversationTabIndex: number;
  onChangeTab: (tab: SidebarTabs, folderId?: string) => void;
  Icon: JSX.Element;
  dataUieName: string;
  unreadConversations: Conversation[];
  conversationRepository: ConversationRepository;
  isActive?: boolean;
}

export const ConversationFolderTab = ({
  title,
  label,
  type,
  conversationTabIndex,
  onChangeTab,
  Icon,
  conversationRepository,
  unreadConversations = [],
  dataUieName,
}: ConversationFolderTabProps) => {
  const {isOpen: isSidebarOpen, setIsOpen: setIsSidebarOpen} = useSidebarStore();
  const {openFolder, isFoldersTabOpen, toggleFoldersTab, expandedFolder} = useFolderState();
  const {conversationLabelRepository} = conversationRepository;

  function toggleFolder(folderId: string) {
    openFolder(folderId);
    onChangeTab(type, folderId);
  }

  const folders = conversationLabelRepository
    .getLabels()
    .map(label => createLabel(label.name, conversationLabelRepository.getLabelConversations(label), label.id))
    .filter(({conversations}) => !!conversations().length);

  function openFoldersContextMenu(event: React.MouseEvent<HTMLButtonElement>) {
    const entries: ContextMenuEntry[] = folders.map(folder => ({
      click: () => {
        openFolder(folder.id);
        onChangeTab(type, folder.id);
      },
      identifier: `folder-${folder.id}`,
      label: folder.name,
    }));

    const boundingRect = event.currentTarget.getBoundingClientRect();

    event.clientX = boundingRect.right + 4;
    event.clientY = boundingRect.top;

    showContextMenu(event, entries, 'navigation-folders-menu');
  }

  function handleToggleFoldersTab(event: React.MouseEvent<HTMLButtonElement>) {
    if (isSidebarOpen) {
      toggleFoldersTab();
      return;
    }

    if (folders.length === 0) {
      setIsSidebarOpen(true);
      return;
    }

    if (folders.length !== 0) {
      openFoldersContextMenu(event);
    }
  }

  function getTotalUnreadConversationMessages(conversations: Conversation[]) {
    let total = 0;

    conversations.forEach(conversation => {
      const exists = unreadConversations.some(conv => conv.id === conversation.id);
      if (exists) {
        total += 1;
      }
    });

    return total;
  }

  return (
    <div className={cx('conversations-sidebar-folders-wrapper', {active: isFoldersTabOpen})}>
      <button
        id={`tab-${conversationTabIndex}`}
        type="button"
        role="tab"
        className="conversations-sidebar-btn"
        onClick={handleToggleFoldersTab}
        title={title}
        data-uie-name={dataUieName}
      >
        <span className="conversations-sidebar-btn--text-wrapper">
          {Icon}
          <span className="conversations-sidebar-btn--text">{label || title}</span>
        </span>
      </button>
      <div className={cx('conversations-sidebar-folders', {active: isFoldersTabOpen})}>
        <div className="conversations-sidebar-folders--inner-wrapper">
          {folders.length === 0 && (
            <div className="conversations-sidebar-folders--empty">
              {t('conversationFoldersEmptyText')}
              <a href={Config.getConfig().URL.SUPPORT.FOLDERS} target="_blank" rel="noreferrer">
                {t('conversationFoldersEmptyTextLearnMore')}
              </a>
            </div>
          )}
          {folders.map(folder => {
            const unreadCount = getTotalUnreadConversationMessages(folder.conversations());
            const isActive = folder.id === expandedFolder;
            return (
              <button
                type="button"
                role="tab"
                title={folder.name}
                data-uie-name={`${dataUieName}-${folder.name}`}
                data-uie-status={isActive ? 'active' : 'inactive'}
                aria-selected={isActive}
                key={folder.id}
                className={cx('conversations-sidebar-folders--item', {active: isActive})}
                onClick={() => toggleFolder(folder.id)}
              >
                <span>{folder.name}</span>
                {!!unreadCount && <span className={cx('conversations-sidebar-btn--badge', {active: isActive})} />}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};
