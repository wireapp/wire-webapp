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

import {Button, ButtonVariant, Link, LinkVariant} from '@wireapp/react-ui-kit';
import {WebAppEvents} from '@wireapp/webapp-events';

import {t} from 'Util/LocalizerUtil';

import {button, paragraph, seperator, wrapper} from './EmptyConversationList.styles';

import {Config} from '../../../../../Config';
import {SidebarTabs} from '../Conversations';

interface EmptyConversationListProps {
  currentTab: SidebarTabs;
  onChangeTab: (tab: SidebarTabs) => void;
  searchValue?: string;
}

export const EmptyConversationList = ({currentTab, onChangeTab, searchValue = ''}: EmptyConversationListProps) => {
  const ConnectWithNewUsersButton = () => (
    <Button
      variant={ButtonVariant.TERTIARY}
      onClick={() => onChangeTab(SidebarTabs.CONNECT)}
      data-uie-name="connect-with-new-users"
      css={button}
    >
      {t('conversationConnectWithNewUsers')}
    </Button>
  );

  if (currentTab === SidebarTabs.RECENT) {
    return (
      <div css={wrapper}>
        <div>
          <p css={paragraph}>{searchValue ? t('searchConversationsNoResult') : t('conversationAllWelcomeMessage')}</p>

          <ConnectWithNewUsersButton />

          <span css={seperator}>{t('conversationButtonSeparator')}</span>

          <Button
            variant={ButtonVariant.TERTIARY}
            onClick={() => amplify.publish(WebAppEvents.CONVERSATION.CREATE_GROUP)}
            data-uie-name="go-create-group"
            css={button}
          >
            {t('conversationCreateNewGroup')}
          </Button>
        </div>
      </div>
    );
  }

  if (currentTab === SidebarTabs.FAVORITES) {
    return (
      <div css={wrapper}>
        <div>
          <p css={paragraph}>
            {searchValue ? t('searchConversationsNoResult') : t('conversationFavoritesTabEmptyMessage')}
          </p>

          <Link
            variant={LinkVariant.PRIMARY}
            href={Config.getConfig().URL.SUPPORT.URL_SUPPORT_FOLDERS}
            target="_blank"
            data-uie-name="how-to-label-conversation-as-favorites"
          >
            {t('conversationFavoritesTabEmptyLinkText')}
          </Link>
        </div>
      </div>
    );
  }

  if (currentTab === SidebarTabs.GROUPS) {
    return (
      <div css={wrapper}>
        <div>
          <p css={paragraph}>{searchValue ? t('searchConversationsNoResult') : t('conversationGroupEmptyMessage')}</p>

          <ConnectWithNewUsersButton />

          <span css={seperator}>{t('conversationButtonSeparator')}</span>

          <Button
            variant={ButtonVariant.TERTIARY}
            onClick={() => amplify.publish(WebAppEvents.CONVERSATION.CREATE_GROUP, 'conversation_details')}
            data-uie-name="go-create-group"
            css={button}
          >
            {t('conversationStartNewConversation')}
          </Button>
        </div>
      </div>
    );
  }

  if (currentTab === SidebarTabs.DIRECTS) {
    return (
      <div css={wrapper}>
        <div>
          <p css={paragraph}>{searchValue ? t('searchConversationsNoResult') : t('conversationDirectEmptyMessage')}</p>

          <ConnectWithNewUsersButton />
        </div>
      </div>
    );
  }

  if (currentTab === SidebarTabs.ARCHIVES) {
    return (
      <div css={wrapper}>
        <div>
          <p css={paragraph}>{searchValue ? t('searchConversationsNoResult') : t('conversationsAllArchived')}</p>
        </div>
      </div>
    );
  }

  return null;
};
