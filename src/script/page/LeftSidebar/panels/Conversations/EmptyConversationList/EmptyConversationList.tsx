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

import {button, paragraph, paragraphBold, paragraphGray, seperator, wrapper} from './EmptyConversationList.styles';

import {Config} from '../../../../../Config';
import {SidebarTabs} from '../useSidebarStore';

interface EmptyConversationListProps {
  currentTab: SidebarTabs;
  onChangeTab: (tab: SidebarTabs) => void;
  searchValue?: string;
}

export const EmptyConversationList = ({currentTab, onChangeTab, searchValue = ''}: EmptyConversationListProps) => {
  if (currentTab === SidebarTabs.RECENT || currentTab === SidebarTabs.FOLDER) {
    return (
      <div css={wrapper} className="empty-conversations-list">
        <div>
          <p css={paragraph}>{searchValue ? t('searchConversationsNoResult') : t('conversationAllWelcomeMessage')}</p>

          <ConnectWithNewUsersButton onClick={() => onChangeTab(SidebarTabs.CONNECT)} />

          <span css={seperator}>{t('conversationButtonSeparator')}</span>

          <Button
            variant={ButtonVariant.TERTIARY}
            onClick={() => amplify.publish(WebAppEvents.CONVERSATION.CREATE_GROUP)}
            data-uie-name="go-create-group"
            css={button}
          >
            {t('conversationStartNewConversation')}
          </Button>
        </div>
      </div>
    );
  }

  if (currentTab === SidebarTabs.FAVORITES) {
    return (
      <div css={wrapper} className="empty-conversations-list">
        <div>
          <p css={paragraph}>
            {searchValue ? t('searchConversationsNoResult') : t('conversationFavoritesTabEmptyMessage')}
          </p>

          <Link
            variant={LinkVariant.PRIMARY}
            href={Config.getConfig().URL.SUPPORT.FAVORITES}
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
      <div css={wrapper} className="empty-conversations-list">
        <div>
          <p css={paragraph}>{searchValue ? t('searchConversationsNoResult') : t('conversationGroupEmptyMessage')}</p>

          <ConnectWithNewUsersButton onClick={() => onChangeTab(SidebarTabs.CONNECT)} />

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

  if (currentTab === SidebarTabs.CHANNELS) {
    return (
      <div css={wrapper} className="empty-conversations-list">
        <div>
          <p css={paragraph}>{t('searchChannelsNoResult')}</p>
          <Link
            variant={LinkVariant.PRIMARY}
            href={Config.getConfig().URL.WEBSITE_BASE}
            target="_blank"
            data-uie-name="learn-more-about-channels"
          >
            {t('conversationLearnMoreChannels')}
          </Link>
        </div>
      </div>
    );
  }

  if (currentTab === SidebarTabs.DIRECTS) {
    return (
      <div css={wrapper} className="empty-conversations-list">
        <div>
          <p css={paragraph}>
            {searchValue
              ? t('searchConversationsNoResult')
              : t('conversationDirectEmptyMessage', {brandName: Config.getConfig().BRAND_NAME})}
          </p>

          <ConnectWithNewUsersButton onClick={() => onChangeTab(SidebarTabs.CONNECT)} />
        </div>
      </div>
    );
  }

  if (currentTab === SidebarTabs.ARCHIVES) {
    return (
      <div css={wrapper} className="empty-conversations-list">
        <div>
          {searchValue && <p css={paragraph}>{t('searchConversationsNoResult')}</p>}

          {!searchValue && (
            <div>
              <p css={paragraphBold}>{t('conversationsNothingArchived')}</p>
              <p css={paragraphGray}>{t('conversationsNothingArchivedTip')}</p>
            </div>
          )}
        </div>
      </div>
    );
  }

  return null;
};

type ConnectWithNewUsersButtonProps = {
  onClick: () => void;
};

const ConnectWithNewUsersButton = ({onClick}: ConnectWithNewUsersButtonProps) => (
  <Button variant={ButtonVariant.TERTIARY} onClick={onClick} data-uie-name="connect-with-new-users" css={button}>
    {t('conversationConnectWithNewUsers')}
  </Button>
);
