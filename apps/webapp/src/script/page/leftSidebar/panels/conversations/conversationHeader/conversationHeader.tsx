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

import * as Icon from 'Components/icon';
import {useCreateConversationModal} from 'Components/Modals/CreateConversation/hooks/useCreateConversationModal';
import {ConversationLabel} from 'Repositories/conversation/ConversationLabelRepository';
import {User} from 'Repositories/entity/User';
import {generatePermissionHelpers} from 'Repositories/user/userPermission';
import {SidebarTabs} from 'src/script/page/leftSidebar/panels/conversations/useSidebarStore';
import {useApplicationContext} from 'src/script/page/rootProvider';
import {handleEnterDown, handleEscDown} from 'Util/keyboardUtil';
import {useChannelsFeatureFlag} from 'Util/useChannelsFeatureFlag';

import {
  button,
  collapsedHeader,
  collapsedIconButton,
  collapsedIconRow,
  header,
  label,
  closeIconStyles,
  searchIconStyles,
  searchInputStyles,
  searchInputWrapperStyles,
} from './conversationHeader.styles';

export const conversationsPanelHeadingId = 'conversations-heading';

const focusSearchInputRef = (searchInputRef: MutableRefObject<HTMLInputElement | null>) => {
  requestAnimationFrame(() => {
    searchInputRef.current?.focus();
  });
};

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
  isListCollapsed?: boolean;
  onExpandList?: () => void;
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
  isListCollapsed = false,
  onExpandList,
}: ConversationHeaderProps) => {
  const {translate} = useApplicationContext();
  const {canCreateGroupConversation} = generatePermissionHelpers(selfUser.teamRole());
  const {canCreateChannels, isChannelsEnabled} = useChannelsFeatureFlag();
  const canExternalUserCreateChannel = canCreateChannels && isChannelsEnabled && selfUser.isExternal();
  const {showModal} = useCreateConversationModal();
  const isFolderView = currentTab === SidebarTabs.FOLDER;

  const conversationsHeaderTitle: Partial<Record<SidebarTabs, string>> = {
    [SidebarTabs.RECENT]: translate('conversationViewAllConversations'),
    [SidebarTabs.FAVORITES]: translate('conversationLabelFavorites'),
    [SidebarTabs.GROUPS]: translate('conversationLabelGroups'),
    [SidebarTabs.CHANNELS]: translate('conversationLabelChannels'),
    [SidebarTabs.DIRECTS]: translate('conversationLabelDirects'),
    [SidebarTabs.FOLDER]: translate('folderViewTooltip'),
    [SidebarTabs.ARCHIVES]: translate('conversationFooterArchive'),
    [SidebarTabs.CONNECT]: translate('searchConnect'),
    [SidebarTabs.MEETINGS]: translate('meetings.navigation.title'),
  };

  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    handleEscDown(event, () => setSearchValue(''));
    handleEnterDown(event, () => onSearchEnterClick(event));
  };

  useEffect(() => {
    const onSearchShortcut = () => {
      onExpandList?.();
      jumpToRecentSearch();
      focusSearchInputRef(searchInputRef);
    };

    amplify.subscribe(WebAppEvents.SHORTCUT.SEARCH, onSearchShortcut);

    return () => {
      amplify.unsubscribe(WebAppEvents.SHORTCUT.SEARCH, onSearchShortcut);
    };
  }, [jumpToRecentSearch, onExpandList, searchInputRef]);

  const showCreateConversationModal = () => {
    if (isChannelsEnabled && canCreateChannels) {
      showModal();
    } else {
      amplify.publish(WebAppEvents.CONVERSATION.CREATE_GROUP, 'conversation_details');
    }
  };

  const handleCollapsedSearchClick = () => {
    onExpandList?.();
    focusSearchInputRef(searchInputRef);
  };

  const showCreateButton =
    currentTab !== SidebarTabs.ARCHIVES && (canCreateGroupConversation() || canExternalUserCreateChannel);

  const headerTitle = isFolderView && currentFolder ? currentFolder.name : conversationsHeaderTitle[currentTab];

  if (isListCollapsed) {
    return (
      <>
        <h2 id={conversationsPanelHeadingId} className="visually-hidden">
          {headerTitle}
        </h2>

        <div css={collapsedHeader}>
          {showSearchInput && (
            <div css={collapsedIconRow}>
              <IconButton
                onClick={handleCollapsedSearchClick}
                data-uie-name="search-conversations"
                css={collapsedIconButton}
                title={searchInputPlaceholder}
              >
                <SearchIcon width={14} height={14} />
              </IconButton>
            </div>
          )}

          {showCreateButton && (
            <div css={collapsedIconRow}>
              <IconButton
                onClick={showCreateConversationModal}
                data-uie-name="go-create-group"
                css={collapsedIconButton}
                title={translate('conversationDetailsActionCreateGroup')}
              >
                <Icon.PlusIcon />
              </IconButton>
            </div>
          )}
        </div>
      </>
    );
  }

  return (
    <>
      <div css={header}>
        <h2 id={conversationsPanelHeadingId} css={label} data-uie-name="conversation-list-header-title">
          {headerTitle}
        </h2>

        {showCreateButton && (
          <IconButton
            onClick={showCreateConversationModal}
            data-uie-name="go-create-group"
            css={button}
            title={translate('conversationDetailsActionCreateGroup')}
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
