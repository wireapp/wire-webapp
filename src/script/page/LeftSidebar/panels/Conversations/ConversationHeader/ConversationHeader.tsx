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

import {forwardRef, KeyboardEvent, MutableRefObject, useEffect} from 'react';

import {amplify} from 'amplify';

import {CircleCloseIcon, IconButton, Input, SearchIcon} from '@wireapp/react-ui-kit';
import {WebAppEvents} from '@wireapp/webapp-events';

import * as Icon from 'Components/Icon';
import {useCreateConversationModal} from 'Components/Modals/CreateConversation/hooks/useCreateConversationModal';
import {ConversationLabel} from 'Repositories/conversation/ConversationLabelRepository';
import {User} from 'Repositories/entity/User';
import {generatePermissionHelpers} from 'Repositories/user/UserPermission';
import {SidebarTabs} from 'src/script/page/LeftSidebar/panels/Conversations/useSidebarStore';
import {handleEnterDown, handleEscDown} from 'Util/KeyboardUtil';
import {t} from 'Util/LocalizerUtil';
import {useChannelsFeatureFlag} from 'Util/useChannelsFeatureFlag';

import {
  button,
  closeIconStyles,
  header,
  label,
  searchIconStyles,
  searchInputStyles,
  searchInputWrapperStyles,
} from './ConversationHeader.styles';

interface ConversationHeaderProps {
  currentTab: SidebarTabs;
  selfUser: User;
  showSearchInput?: boolean;
  searchValue?: string;
  setSearchValue: (searchValue: string) => void;
  searchInputPlaceholder: string;
  currentFolder?: ConversationLabel;
  onSearchEnterClick: (event: KeyboardEvent<HTMLInputElement>) => void;
  jumpToRecentSearch: () => void;
  searchInputRef: MutableRefObject<HTMLInputElement | null>;
}

export const ConversationHeaderComponent = ({
  currentTab,
  selfUser,
  showSearchInput = false,
  searchValue = '',
  setSearchValue,
  currentFolder,
  searchInputPlaceholder,
  onSearchEnterClick,
  jumpToRecentSearch,
  searchInputRef,
}: ConversationHeaderProps) => {
  const {canCreateGroupConversation} = generatePermissionHelpers(selfUser.teamRole());
  const {canCreateChannels, isChannelsEnabled} = useChannelsFeatureFlag();
  const canExternalUserCreateChannel = canCreateChannels && isChannelsEnabled && selfUser.isExternal();
  const {showModal} = useCreateConversationModal();
  const isFolderView = currentTab === SidebarTabs.FOLDER;

  const conversationsHeaderTitle: Partial<Record<SidebarTabs, string>> = {
    [SidebarTabs.RECENT]: t('conversationViewAllConversations'),
    [SidebarTabs.FAVORITES]: t('conversationLabelFavorites'),
    [SidebarTabs.GROUPS]: t('conversationLabelGroups'),
    [SidebarTabs.CHANNELS]: t('conversationLabelChannels'),
    [SidebarTabs.DIRECTS]: t('conversationLabelDirects'),
    [SidebarTabs.FOLDER]: t('folderViewTooltip'),
    [SidebarTabs.ARCHIVES]: t('conversationFooterArchive'),
    [SidebarTabs.CONNECT]: t('searchConnect'),
    [SidebarTabs.MEETINGS]: t('meetings.navigation.title'),
  };

  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    handleEscDown(event, () => setSearchValue(''));
    handleEnterDown(event, () => onSearchEnterClick(event));
  };

  useEffect(() => {
    const onSearchShortcut = () => {
      jumpToRecentSearch();
      searchInputRef?.current?.focus();
    };

    amplify.subscribe(WebAppEvents.SHORTCUT.SEARCH, onSearchShortcut);

    return () => {
      amplify.unsubscribe(WebAppEvents.SHORTCUT.SEARCH, onSearchShortcut);
    };
  }, [searchInputRef, jumpToRecentSearch]);

  const showCreateConversationModal = () => {
    if (isChannelsEnabled && canCreateChannels) {
      showModal();
    } else {
      amplify.publish(WebAppEvents.CONVERSATION.CREATE_GROUP, 'conversation_details');
    }
  };

  return (
    <>
      <div css={header}>
        <h2 css={label} data-uie-name="conversation-list-header-title">
          {isFolderView && currentFolder ? currentFolder.name : conversationsHeaderTitle[currentTab]}
        </h2>

        {currentTab !== SidebarTabs.ARCHIVES && (canCreateGroupConversation() || canExternalUserCreateChannel) && (
          <IconButton
            onClick={showCreateConversationModal}
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
          ref={searchInputRef}
          className="label-1"
          value={searchValue}
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

export const ConversationHeader = forwardRef(ConversationHeaderComponent);
