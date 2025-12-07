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

import {useMemo} from 'react';

import cx from 'classnames';
import * as Icons from 'Components/Icon';
import {createLabel, LabelType} from 'Repositories/conversation/ConversationLabelRepository';
import {ConversationRepository} from 'Repositories/conversation/ConversationRepository';
import {Conversation} from 'Repositories/entity/Conversation';
import {Config} from 'src/script/Config';
import {useFolderStore} from 'src/script/page/LeftSidebar/panels/Conversations/useFoldersStore';
import {
  SidebarStatus,
  SidebarTabs,
  useSidebarStore,
} from 'src/script/page/LeftSidebar/panels/Conversations/useSidebarStore';
import {ContextMenuEntry, showContextMenu} from 'src/script/ui/ContextMenu';
import {useKoSubscribableChildren} from 'Util/ComponentUtil';
import {t} from 'Util/LocalizerUtil';

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
  const {status: sidebarStatus} = useSidebarStore();
  const {openFolder, isFoldersTabOpen, toggleFoldersTab, expandedFolder} = useFolderStore();
  const {conversationLabelRepository} = conversationRepository;
  const isSideBarOpen = sidebarStatus === SidebarStatus.OPEN;

  function toggleFolder(folderId: string) {
    openFolder(folderId);
    onChangeTab(type, folderId);
  }

  const {labels} = useKoSubscribableChildren(conversationLabelRepository, ['labels']);

  const folders = labels
    .filter(label => label.type !== LabelType.Favorite)
    .map(label => createLabel(label.name, conversationLabelRepository.getLabelConversations(label), label.id))
    .filter(({conversations, name}) => !!conversations().length && !!name);

  const placeholder = useMemo(
    () => (
      <div className="conversations-sidebar-folders--empty">
        {t('conversationFoldersEmptyText')}
        <a href={Config.getConfig().URL.SUPPORT.FOLDERS} target="_blank" rel="noreferrer">
          {t('conversationFoldersEmptyTextLearnMore')}
        </a>
      </div>
    ),
    [],
  );

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

    showContextMenu({event, entries, identifier: 'navigation-folders-menu', placeholder});
  }

  function handleToggleFoldersTab(event: React.MouseEvent<HTMLButtonElement>) {
    if (isSideBarOpen) {
      toggleFoldersTab();
      return;
    }

    openFoldersContextMenu(event);
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
        css={{...(!isSideBarOpen && {padding: '8px 2px 8px 6px'})}}
      >
        <span className="conversations-sidebar-btn--text-wrapper">
          {Icon}
          <span className="conversations-sidebar-btn--text">{label || title}</span>
          <Icons.ChevronIcon className="folders-open-indicator" />
        </span>
      </button>
      <div className={cx('conversations-sidebar-folders', {active: isFoldersTabOpen})}>
        <div className="conversations-sidebar-folders--inner-wrapper" data-uie-name="folder-list">
          {folders.length === 0 && placeholder}
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
                {!!unreadCount && (
                  <span
                    className={cx('conversations-sidebar-btn--badge', {active: isActive})}
                    data-uie-name="unread-badge"
                  />
                )}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};
