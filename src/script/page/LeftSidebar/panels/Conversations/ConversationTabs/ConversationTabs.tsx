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

import {container} from 'tsyringe';

import {
  CallIcon,
  ChannelIcon,
  CollectionIcon,
  ExternalLinkIcon,
  GroupIcon,
  MessageIcon,
  StarIcon,
  SupportIcon,
  TeamIcon,
  Tooltip,
} from '@wireapp/react-ui-kit';

import * as Icon from 'Components/Icon';
import {ConversationRepository} from 'Repositories/conversation/ConversationRepository';
import {Conversation} from 'Repositories/entity/Conversation';
import {User} from 'Repositories/entity/User';
import {TeamState} from 'Repositories/team/TeamState';
import {FEATURES, hasAccessToFeature} from 'Repositories/user/UserPermission';
import {getManageTeamUrl} from 'src/script/externalRoute';
import {ConversationFolderTab} from 'src/script/page/LeftSidebar/panels/Conversations/ConversationTab/ConversationFolderTab';
import {SidebarTabs} from 'src/script/page/LeftSidebar/panels/Conversations/useSidebarStore';
import {Core} from 'src/script/service/CoreSingleton';
import {useKoSubscribableChildren} from 'Util/ComponentUtil';
import {isDataDogEnabled} from 'Util/DataDog';
import {getWebEnvironment} from 'Util/Environment';
import {replaceLink, t} from 'Util/LocalizerUtil';
import {useChannelsFeatureFlag} from 'Util/useChannelsFeatureFlag';

import {
  conversationsTitleWrapper,
  footerDisclaimer,
  footerDisclaimerEllipsis,
  footerDisclaimerTooltip,
  iconStyle,
} from './ConversationTabs.styles';
import {FolderIcon} from './FolderIcon';
import {TeamCreationBanner} from './TeamCreation/TeamCreationBanner';

import {Config} from '../../../../../Config';
import {ContentState} from '../../../../useAppState';
import {ConversationFilterButton} from '../ConversationFilterButton';
import {ConversationTab} from '../ConversationTab';

interface ConversationTabsProps {
  unreadConversations: Conversation[];
  favoriteConversations: Conversation[];
  archivedConversations: Conversation[];
  groupConversations: Conversation[];
  directConversations: Conversation[];
  channelConversations: Conversation[];
  conversationRepository: ConversationRepository;
  onChangeTab: (tab: SidebarTabs, folderId?: string) => void;
  currentTab: SidebarTabs;
  onClickPreferences: (contentState: ContentState) => void;
  showNotificationsBadge?: boolean;
  selfUser: User;
}

export const ConversationTabs = ({
  unreadConversations,
  favoriteConversations,
  archivedConversations,
  groupConversations,
  conversationRepository,
  directConversations,
  onChangeTab,
  currentTab,
  onClickPreferences,
  showNotificationsBadge = false,
  selfUser,
  channelConversations,
}: ConversationTabsProps) => {
  const {isChannelsEnabled, isChannelsFeatureEnabled} = useChannelsFeatureFlag();
  const core = container.resolve(Core);
  const teamState = container.resolve(TeamState);
  const totalUnreadConversations = unreadConversations.length;
  const {teamRole} = useKoSubscribableChildren(selfUser, ['teamRole']);
  const {isCellsEnabled: isCellsEnabledForTeam} = useKoSubscribableChildren(teamState, ['isCellsEnabled']);

  const totalUnreadFavoriteConversations = favoriteConversations.filter(favoriteConversation =>
    favoriteConversation.hasUnread(),
  ).length;

  const totalUnreadArchivedConversations = archivedConversations.filter(conversation =>
    conversation.hasUnread(),
  ).length;

  const filterUnreadAndArchivedConversations = (conversation: Conversation) =>
    !conversation.is_archived() && conversation.hasUnread();

  const isTeamCreationEnabled =
    Config.getConfig().FEATURE.ENABLE_TEAM_CREATION &&
    core.backendFeatures.version >= Config.getConfig().MIN_TEAM_CREATION_SUPPORTED_API_VERSION;

  const channelConversationsLength = channelConversations.filter(filterUnreadAndArchivedConversations).length;
  const groupConversationsLength = groupConversations.filter(filterUnreadAndArchivedConversations).length;

  const conversationTabs = [
    {
      type: SidebarTabs.RECENT,
      title: t('conversationViewTooltip'),
      dataUieName: 'go-recent-view',
      Icon: <MessageIcon />,
      unreadConversations: unreadConversations.length,
    },
    {
      type: SidebarTabs.FAVORITES,
      title: t('conversationLabelFavorites'),
      dataUieName: 'go-favorites-view',
      Icon: <StarIcon />,
      unreadConversations: totalUnreadFavoriteConversations,
    },
    {
      type: SidebarTabs.GROUPS,
      title: t('conversationLabelGroups'),
      dataUieName: 'go-groups-view',
      Icon: <GroupIcon height={20} width={20} />,
      unreadConversations: isChannelsEnabled
        ? groupConversationsLength
        : groupConversationsLength + channelConversationsLength,
    },
    {
      type: SidebarTabs.DIRECTS,
      title: t('conversationLabelDirects'),
      dataUieName: 'go-directs-view',
      Icon: <Icon.PeopleIcon />,
      unreadConversations: directConversations.filter(filterUnreadAndArchivedConversations).length,
    },
    {
      type: SidebarTabs.FOLDER,
      title: t('folderViewTooltip'),
      dataUieName: 'go-folders-view',
      Icon: <FolderIcon />,
      unreadConversations: totalUnreadConversations,
    },
    {
      type: SidebarTabs.ARCHIVES,
      title: t('tooltipConversationsArchived', {number: archivedConversations.length}),
      label: t('conversationFooterArchive'),
      dataUieName: 'go-archive',
      Icon: <Icon.ArchiveIcon />,
      unreadConversations: totalUnreadArchivedConversations,
    },
  ];

  if (isChannelsEnabled && (channelConversations.some(channel => !channel.is_archived()) || isChannelsFeatureEnabled)) {
    conversationTabs.splice(2, 0, {
      type: SidebarTabs.CHANNELS,
      title: t('conversationLabelChannels'),
      dataUieName: 'go-channels-view',
      Icon: <ChannelIcon />,
      unreadConversations: channelConversationsLength,
    });
  }
  const manageTeamUrl = getManageTeamUrl();
  const replaceWireLink = replaceLink('https://app.wire.com', '', '');

  const showCellsTab = Config.getConfig().FEATURE.ENABLE_CELLS && isCellsEnabledForTeam;

  return (
    <>
      <div
        role="tablist"
        aria-label={t('accessibility.headings.sidebar')}
        aria-owns="tab-1 tab-2 tab-3 tab-4 tab-5 tab-6 tab-7"
        className="conversations-sidebar-list"
      >
        <div className="conversations-sidebar-title" css={conversationsTitleWrapper}>
          <span>{t('videoCallOverlayConversations')}</span>
          <ConversationFilterButton />
        </div>

        {conversationTabs.map((conversationTab, index) => {
          if (conversationTab.type === SidebarTabs.FOLDER) {
            return (
              <ConversationFolderTab
                {...conversationTab}
                unreadConversations={unreadConversations}
                conversationRepository={conversationRepository}
                key={conversationTab.type}
                conversationTabIndex={index + 1}
                onChangeTab={onChangeTab}
                isActive={conversationTab.type === currentTab}
              />
            );
          }

          return (
            <ConversationTab
              {...conversationTab}
              key={conversationTab.type}
              conversationTabIndex={index + 1}
              onChangeTab={onChangeTab}
              isActive={conversationTab.type === currentTab}
            />
          );
        })}

        <div className="conversations-sidebar-divider" />

        <div className="conversations-sidebar-title" css={{marginBlock: '32px 0'}}>
          {t('conversationFooterContacts')}
        </div>

        <ConversationTab
          title={t('searchConnect')}
          label={t('searchConnect')}
          type={SidebarTabs.CONNECT}
          Icon={<Icon.AddParticipantsIcon />}
          onChangeTab={onChangeTab}
          conversationTabIndex={conversationTabs.length + 1}
          dataUieName="go-people"
          isActive={currentTab === SidebarTabs.CONNECT}
        />

        {showCellsTab && (
          <>
            <div className="conversations-sidebar-divider" />

            <div className="conversations-sidebar-title" css={{marginBlock: '32px 0'}}>
              {t('cells.sidebar.heading')}
            </div>

            <ConversationTab
              title={t('cells.sidebar.title')}
              label={t('cells.sidebar.title')}
              type={SidebarTabs.CELLS}
              Icon={<CollectionIcon />}
              onChangeTab={onChangeTab}
              conversationTabIndex={conversationTabs.length + 2}
              dataUieName="go-cells"
              isActive={currentTab === SidebarTabs.CELLS}
            />
          </>
        )}

        <div className="conversations-sidebar-divider" />

        <div className="conversations-sidebar-title" css={{marginBlock: '32px 0'}}>
          {t('meetings.navigation.parent.label')}
        </div>

        <ConversationTab
          title={t('meetings.navigation.title')}
          label={t('meetings.navigation.label')}
          type={SidebarTabs.MEETINGS}
          Icon={<CallIcon />}
          onChangeTab={onChangeTab}
          conversationTabIndex={conversationTabs.length + 1}
          dataUieName="go-meetings"
          isActive={currentTab === SidebarTabs.MEETINGS}
        />
      </div>

      <div
        role="tablist"
        aria-label={t('accessibility.headings.sidebar.footer')}
        aria-owns="tab-1 tab-2"
        className="conversations-sidebar-list-footer"
      >
        {isTeamCreationEnabled && !teamState.isInTeam(selfUser) && <TeamCreationBanner />}

        {!getWebEnvironment().isProduction && isDataDogEnabled() && (
          <div css={footerDisclaimer}>
            <Tooltip
              css={footerDisclaimerTooltip}
              body={
                <div
                  dangerouslySetInnerHTML={{
                    __html: t(
                      'conversationInternalEnvironmentDisclaimer',
                      {url: 'https://app.wire.com'},
                      replaceWireLink,
                    ),
                  }}
                />
              }
            >
              <Icon.ExclamationMark css={iconStyle} />
            </Tooltip>

            <div
              css={footerDisclaimerEllipsis}
              dangerouslySetInnerHTML={{
                __html: t('conversationInternalEnvironmentDisclaimer', {url: 'https://app.wire.com'}, replaceWireLink),
              }}
            />
          </div>
        )}

        <ConversationTab
          title={t('preferencesHeadline')}
          label={t('preferencesHeadline')}
          type={SidebarTabs.PREFERENCES}
          Icon={<Icon.SettingsIcon />}
          onChangeTab={tab => {
            onChangeTab(tab);
            onClickPreferences(ContentState.PREFERENCES_ACCOUNT);
          }}
          conversationTabIndex={1}
          dataUieName="go-preferences"
          showNotificationsBadge={showNotificationsBadge}
          isActive={currentTab === SidebarTabs.PREFERENCES}
        />

        {hasAccessToFeature(FEATURES.MANAGE_TEAM, teamRole) && (
          <a
            rel="nofollow noopener noreferrer"
            target="_blank"
            href={manageTeamUrl}
            type="button"
            className="conversations-sidebar-btn"
            title={t('preferencesAccountManageTeam')}
            data-uie-name="go-team-management"
          >
            <span className="conversations-sidebar-btn--text-wrapper">
              <TeamIcon />
              <span className="conversations-sidebar-btn--text"> {t('preferencesAccountManageTeam')}</span>
              <ExternalLinkIcon className="external-link-icon" />
            </span>
          </a>
        )}

        <a
          rel="nofollow noopener noreferrer"
          target="_blank"
          href={Config.getConfig().URL.SUPPORT.INDEX}
          id="tab-2"
          type="button"
          className="conversations-sidebar-btn"
          title={t('preferencesAboutSupport')}
          data-uie-name="go-support"
        >
          <span className="conversations-sidebar-btn--text-wrapper">
            <SupportIcon viewBox="0 0 16 16" />
            <span className="conversations-sidebar-btn--text">{t('preferencesAboutSupport')}</span>
            <ExternalLinkIcon className="external-link-icon" />
          </span>
        </a>
      </div>
    </>
  );
};
