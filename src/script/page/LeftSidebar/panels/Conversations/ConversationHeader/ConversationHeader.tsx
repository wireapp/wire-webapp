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

import {amplify} from 'amplify';

import {Button, ButtonVariant, CircleCloseIcon, Input, SearchIcon} from '@wireapp/react-ui-kit';
import {WebAppEvents} from '@wireapp/webapp-events';

import {Icon} from 'Components/Icon';
import {ConversationLabel} from 'src/script/conversation/ConversationLabelRepository';
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
import {SidebarTabs} from '../Conversations';

interface ConversationHeaderProps {
  currentTab: SidebarTabs;
  selfUser: User;
  showSearchInput?: boolean;
  searchValue?: string;
  setSearchValue: (searchValue: string) => void;
  searchInputPlaceholder: string;
  currentFolder: ConversationLabel;
}

export const ConversationHeader = ({
  currentTab,
  selfUser,
  showSearchInput = false,
  searchValue = '',
  setSearchValue,
  currentFolder,
  searchInputPlaceholder,
}: ConversationHeaderProps) => {
  const {canCreateGroupConversation} = generatePermissionHelpers(selfUser.teamRole());
  const isFolderView = currentTab === SidebarTabs.FOLDER;

  const conversationsHeaderTitle: Partial<Record<SidebarTabs, string>> = {
    [SidebarTabs.RECENT]: t('conversationViewAllConversations'),
    [SidebarTabs.FAVORITES]: t('conversationLabelFavorites'),
    [SidebarTabs.GROUPS]: t('conversationLabelGroups'),
    [SidebarTabs.DIRECTS]: t('conversationLabelDirects'),
    [SidebarTabs.FOLDER]: t('folderViewTooltip'),
    [SidebarTabs.ARCHIVES]: t('conversationFooterArchive'),
    [SidebarTabs.CONNECT]: t('searchConnect'),
  };

  return (
    <>
      <div css={header}>
        <span css={label}>
          {isFolderView && currentFolder ? currentFolder.name : conversationsHeaderTitle[currentTab]}
        </span>

        {currentTab !== SidebarTabs.ARCHIVES && canCreateGroupConversation() && (
          <Button
            variant={ButtonVariant.TERTIARY}
            onClick={() => amplify.publish(WebAppEvents.CONVERSATION.CREATE_GROUP, 'conversation_details')}
            data-uie-name="go-create-group"
            css={button}
          >
            <Icon.Plus />

            {t('conversationGroupCreate')}
          </Button>
        )}
      </div>

      {showSearchInput && (
        <Input
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
        />
      )}
    </>
  );
};
