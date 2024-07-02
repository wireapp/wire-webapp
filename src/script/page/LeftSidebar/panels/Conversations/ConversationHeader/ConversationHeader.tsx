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

import {KeyboardEvent, useEffect, useRef} from 'react';

import {amplify} from 'amplify';

import {CircleCloseIcon, IconButton, Input, SearchIcon} from '@wireapp/react-ui-kit';
import {WebAppEvents} from '@wireapp/webapp-events';

import * as Icon from 'Components/Icon';
import {ConversationLabel} from 'src/script/conversation/ConversationLabelRepository';
import {SidebarTabs} from 'src/script/page/LeftSidebar/panels/Conversations/state';
import {handleEnterDown} from 'Util/KeyboardUtil';
import {t} from 'Util/LocalizerUtil';

import {
  button,
  header,
  label,
  closeIconStyles,
  searchIconStyles,
  searchInputStyles,
  searchInputWrapperStyles,
} from './ConversationHeader.styles';

import {User} from '../../../../../entity/User';
import {generatePermissionHelpers} from '../../../../../user/UserPermission';

interface ConversationHeaderProps {
  currentTab: SidebarTabs;
  selfUser: User;
  showSearchInput?: boolean;
  searchValue?: string;
  setSearchValue: (searchValue: string) => void;
  searchInputPlaceholder: string;
  currentFolder?: ConversationLabel;
  setIsConversationFilterFocused: (isFocused: boolean) => void;
  onSearchEnterClick: (event: KeyboardEvent<HTMLInputElement>) => void;
}

export const ConversationHeader = ({
  currentTab,
  selfUser,
  showSearchInput = false,
  searchValue = '',
  setSearchValue,
  currentFolder,
  searchInputPlaceholder,
  setIsConversationFilterFocused,
  onSearchEnterClick,
}: ConversationHeaderProps) => {
  const {canCreateGroupConversation} = generatePermissionHelpers(selfUser.teamRole());
  const isFolderView = currentTab === SidebarTabs.FOLDER;

  const inputRef = useRef<HTMLInputElement | null>(null);

  const conversationsHeaderTitle: Partial<Record<SidebarTabs, string>> = {
    [SidebarTabs.RECENT]: t('conversationViewAllConversations'),
    [SidebarTabs.FAVORITES]: t('conversationLabelFavorites'),
    [SidebarTabs.GROUPS]: t('conversationLabelGroups'),
    [SidebarTabs.DIRECTS]: t('conversationLabelDirects'),
    [SidebarTabs.FOLDER]: t('folderViewTooltip'),
    [SidebarTabs.ARCHIVES]: t('conversationFooterArchive'),
    [SidebarTabs.CONNECT]: t('searchConnect'),
  };

  useEffect(() => {
    amplify.subscribe(WebAppEvents.SHORTCUT.SEARCH, () => {
      inputRef?.current?.focus();
    });
  }, []);

  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Escape') {
      setSearchValue('');
    }

    handleEnterDown(event, () => {
      onSearchEnterClick(event);
      setIsConversationFilterFocused(false);
    });
  };

  return (
    <>
      <div css={header}>
        <h2 css={label} data-uie-name="conversation-list-header-title">
          {isFolderView && currentFolder ? currentFolder.name : conversationsHeaderTitle[currentTab]}
        </h2>

        {currentTab !== SidebarTabs.ARCHIVES && canCreateGroupConversation() && (
          <IconButton
            onClick={() => amplify.publish(WebAppEvents.CONVERSATION.CREATE_GROUP, 'conversation_details')}
            data-uie-name="go-create-group"
            css={button}
            title={t('conversationDetailsActionCreateGroup')}
          >
            <Icon.PlusIcon />
          </IconButton>
        )}
      </div>

      {showSearchInput && (
        <Input
          onKeyDown={onKeyDown}
          ref={inputRef}
          className="label-1"
          value={searchValue}
          onFocus={() => setIsConversationFilterFocused(true)}
          onBlur={() => setIsConversationFilterFocused(false)}
          onChange={event => setSearchValue(event.currentTarget.value)}
          startContent={<SearchIcon width={14} height={14} css={searchIconStyles} />}
          endContent={
            searchValue && (
              <CircleCloseIcon className="cursor-pointer" onClick={() => setSearchValue('')} css={closeIconStyles} />
            )
          }
          inputCSS={searchInputStyles}
          wrapperCSS={searchInputWrapperStyles}
          placeholder={searchInputPlaceholder}
          data-uie-name="search-conversations"
        />
      )}
    </>
  );
};
