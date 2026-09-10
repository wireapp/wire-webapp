/*
 * Wire
 * Copyright (C) 2026 Wire Swiss GmbH
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

import type {ReactNode} from 'react';

import {container} from 'tsyringe';

import {
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

import {openDebugToolbar} from 'Components/configToolbar/debugToolbarEvents';
import * as Icon from 'Components/icon';
import {ConversationRepository} from 'Repositories/conversation/ConversationRepository';
import {Conversation} from 'Repositories/entity/Conversation';
import {User} from 'Repositories/entity/User';
import {TeamState} from 'Repositories/team/TeamState';
import {FEATURES, hasAccessToFeature} from 'Repositories/user/userPermission';
import {getManageTeamUrl} from 'src/script/externalRoute';
import {reactTranslationRenderingFeatureToggleName} from 'src/script/featureToggles/startupFeatureToggleNames';
import {ConversationFolderTab} from 'src/script/page/leftSidebar/panels/conversations/conversationTab/conversationFolderTab';
import {
  isTabVisible,
  SidebarTabs,
  useSidebarStore,
} from 'src/script/page/leftSidebar/panels/conversations/useSidebarStore';
import {useApplicationContext} from 'src/script/page/rootProvider';
import {Core} from 'src/script/service/coreSingleton';
import {useKoSubscribableChildren} from 'Util/componentUtil';
import {isDataDogEnabled} from 'Util/dataDog';
import {getWebEnvironment} from 'Util/environment';
import {replaceLink} from 'Util/localizerUtil';
import {createReactTranslationMarker, renderReactTranslation} from 'Util/localizerUtil/reactLocalizerUtil';
import type {Translate} from 'Util/localizerUtil/translationTypes';
import {useChannelsFeatureFlag} from 'Util/useChannelsFeatureFlag';
import {useMeetingsFeatureFlag} from 'Util/useMeetingsFeatureFlag';

import {
  conversationsTitleWrapper,
  footerDisclaimer,
  footerDisclaimerEllipsis,
  footerDisclaimerTooltip,
  iconStyle,
} from './conversationTabs.styles';
import {FolderIcon} from './folderIcon';
import {MeetingsConversationTab} from './meetingsConversationTab';
import {SettingsTab} from './settingsTab';
import {TeamCreationBanner} from './teamCreation/teamCreationBanner';

import {Config} from '../../../../../Config';
import {ContentState} from '../../../../useAppState';
import {ConversationTab} from '../conversationTab';
import {conversationFilters} from '../helpers';
import {TabAndFilterSettings} from '../tabAndFilterSettings';

const wireCloudUrl = 'https://app.wire.com';
const environmentDisclaimerUrlMarker = createReactTranslationMarker('environment-disclaimer-url');
const environmentDisclaimerLinkMarker = createReactTranslationMarker('environment-disclaimer-link');

type RenderEnvironmentDisclaimerOptions = {
  readonly isReactTranslationRenderingEnabled: boolean;
  readonly translate: Translate;
};

type RenderedEnvironmentDisclaimer =
  | {
      readonly kind: 'react';
      readonly content: ReactNode[];
    }
  | {
      readonly kind: 'legacy';
      readonly html: string;
    };

function renderEnvironmentDisclaimer(options: RenderEnvironmentDisclaimerOptions): RenderedEnvironmentDisclaimer {
  const {isReactTranslationRenderingEnabled, translate} = options;

  if (isReactTranslationRenderingEnabled) {
    const translatedText = translate(
      'conversationInternalEnvironmentDisclaimer',
      {url: environmentDisclaimerUrlMarker.substitution},
      {
        '/link': environmentDisclaimerLinkMarker.end,
        link: environmentDisclaimerLinkMarker.start,
      },
    );

    return {
      kind: 'react',
      content: renderReactTranslation({
        translatedText,
        componentReplacements: [
          {
            start: environmentDisclaimerLinkMarker.start,
            end: environmentDisclaimerLinkMarker.end,
            render(children): ReactNode {
              return (
                <a href={wireCloudUrl} data-uie-name="" className="" rel="nofollow noopener noreferrer" target="_blank">
                  {children}
                </a>
              );
            },
          },
        ],
        nodeReplacements: [],
        valueReplacements: [
          {
            marker: environmentDisclaimerUrlMarker,
            runtimeText: wireCloudUrl,
          },
        ],
      }),
    };
  }

  const replaceWireLink = replaceLink(wireCloudUrl, '', '');
  const translatedText = translate('conversationInternalEnvironmentDisclaimer', {url: wireCloudUrl}, replaceWireLink);

  return {
    kind: 'legacy',
    html: translatedText,
  };
}

function renderEnvironmentDisclaimerTooltipBody(environmentDisclaimer: RenderedEnvironmentDisclaimer): ReactNode {
  if (environmentDisclaimer.kind === 'react') {
    return <div>{environmentDisclaimer.content}</div>;
  }

  return (
    <div
      dangerouslySetInnerHTML={{
        __html: environmentDisclaimer.html,
      }}
    />
  );
}

function renderEnvironmentDisclaimerFooterContent(environmentDisclaimer: RenderedEnvironmentDisclaimer): ReactNode {
  if (environmentDisclaimer.kind === 'react') {
    return <div css={footerDisclaimerEllipsis}>{environmentDisclaimer.content}</div>;
  }

  return (
    <div
      css={footerDisclaimerEllipsis}
      dangerouslySetInnerHTML={{
        __html: environmentDisclaimer.html,
      }}
    />
  );
}

function renderEnvironmentDisclaimerSection(options: RenderEnvironmentDisclaimerOptions): ReactNode {
  const renderedEnvironmentDisclaimer = renderEnvironmentDisclaimer(options);

  return (
    <div css={footerDisclaimer}>
      <Tooltip
        css={footerDisclaimerTooltip}
        body={renderEnvironmentDisclaimerTooltipBody(renderedEnvironmentDisclaimer)}
      >
        <Icon.ExclamationMark css={iconStyle} />
      </Tooltip>

      {renderEnvironmentDisclaimerFooterContent(renderedEnvironmentDisclaimer)}
    </div>
  );
}

interface ConversationTabsProps {
  unreadConversations: Conversation[];
  favoriteConversations: Conversation[];
  archivedConversations: Conversation[];
  groupConversations: Conversation[];
  directConversations: Conversation[];
  channelConversations: Conversation[];
  draftConversations: Conversation[];
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
  draftConversations,
  onChangeTab,
  currentTab,
  onClickPreferences,
  showNotificationsBadge = false,
  selfUser,
  channelConversations,
}: ConversationTabsProps) => {
  const {isFeatureToggleEnabled, translate} = useApplicationContext();
  const {visibleTabs} = useSidebarStore();
  const {isChannelsEnabled, shouldShowChannelTab} = useChannelsFeatureFlag();
  const core = container.resolve(Core);
  const teamState = container.resolve(TeamState);
  const totalUnreadConversations = unreadConversations.length;
  const {teamRole} = useKoSubscribableChildren(selfUser, ['teamRole']);
  const {isCellsEnabled: isCellsEnabledForTeam} = useKoSubscribableChildren(teamState, ['isCellsEnabled']);
  const {isMeetingsEnabled} = useMeetingsFeatureFlag();
  const isDebugEnabled = Config.getConfig().FEATURE.ENABLE_DEBUG;

  const totalUnreadFavoriteConversations = favoriteConversations.filter(favoriteConversation =>
    favoriteConversation.hasUnread(),
  ).length;

  const totalUnreadArchivedConversations = archivedConversations.filter(conversation =>
    conversation.hasUnread(),
  ).length;

  const filterUnreadAndArchivedConversations = (conversation: Conversation) =>
    conversationFilters.notArchived(conversation) && conversationFilters.hasUnread(conversation);

  const isTeamCreationEnabled =
    Config.getConfig().FEATURE.ENABLE_TEAM_CREATION &&
    core.backendFeatures.version >= Config.getConfig().MIN_TEAM_CREATION_SUPPORTED_API_VERSION;

  const channelConversationsLength = channelConversations.filter(filterUnreadAndArchivedConversations).length;
  const groupConversationsLength = groupConversations.filter(filterUnreadAndArchivedConversations).length;
  const unreadCount = unreadConversations.filter(conversationFilters.notArchived).length;
  const mentionsCount = unreadConversations.filter(
    conv => conversationFilters.notArchived(conv) && conversationFilters.hasMentions(conv),
  ).length;
  const repliesCount = unreadConversations.filter(
    conv => conversationFilters.notArchived(conv) && conversationFilters.hasReplies(conv),
  ).length;
  const draftsCount = draftConversations.filter(conversationFilters.notArchived).length;
  const pingsCount = unreadConversations.filter(
    conv => conversationFilters.notArchived(conv) && conversationFilters.hasPings(conv),
  ).length;
  const directConversationsLength = directConversations.filter(filterUnreadAndArchivedConversations).length;

  const channelsTab = shouldShowChannelTab
    ? [
        {
          type: SidebarTabs.CHANNELS,
          title: translate('conversationLabelChannels'),
          dataUieName: 'go-channels-view',
          Icon: <ChannelIcon />,
          unreadConversations: channelConversationsLength,
        },
      ]
    : [];

  const conversationTabs = [
    {
      type: SidebarTabs.RECENT,
      title: translate('conversationViewTooltip'),
      dataUieName: 'go-recent-view',
      Icon: <MessageIcon />,
      unreadConversations: unreadConversations.length,
    },
    {
      type: SidebarTabs.FAVORITES,
      title: translate('conversationLabelFavorites'),
      dataUieName: 'go-favorites-view',
      Icon: <StarIcon />,
      unreadConversations: totalUnreadFavoriteConversations,
    },
    {
      type: SidebarTabs.UNREAD,
      title: translate('conversationLabelUnread'),
      dataUieName: 'go-unread-view',
      Icon: <Icon.MarkAsUnreadIcon />,
      unreadConversations: unreadCount,
    },
    {
      type: SidebarTabs.MENTIONS,
      title: translate('conversationLabelMentions'),
      dataUieName: 'go-mentions-view',
      Icon: <Icon.MentionIcon />,
      unreadConversations: mentionsCount,
    },
    {
      type: SidebarTabs.PINGS,
      title: translate('conversationLabelPings'),
      dataUieName: 'go-pings-view',
      Icon: <Icon.PingIcon />,
      unreadConversations: pingsCount,
    },
    {
      type: SidebarTabs.REPLIES,
      title: translate('conversationLabelReplies'),
      dataUieName: 'go-replies-view',
      Icon: <Icon.ReplyIcon />,
      unreadConversations: repliesCount,
    },
    {
      type: SidebarTabs.DRAFTS,
      title: translate('conversationLabelDrafts'),
      dataUieName: 'go-drafts-view',
      Icon: <Icon.DraftMessageIcon />,
      unreadConversations: draftsCount,
    },
    ...channelsTab,
    {
      type: SidebarTabs.GROUPS,
      title: translate('conversationLabelGroups'),
      dataUieName: 'go-groups-view',
      Icon: <GroupIcon height={20} width={20} />,
      unreadConversations: isChannelsEnabled
        ? groupConversationsLength
        : groupConversationsLength + channelConversationsLength,
    },
    {
      type: SidebarTabs.DIRECTS,
      title: translate('conversationLabelDirects'),
      dataUieName: 'go-directs-view',
      Icon: <Icon.PeopleIcon />,
      unreadConversations: directConversationsLength,
    },
    {
      type: SidebarTabs.FOLDER,
      title: translate('folderViewTooltip'),
      dataUieName: 'go-folders-view',
      Icon: <FolderIcon />,
      unreadConversations: totalUnreadConversations,
    },
    {
      type: SidebarTabs.ARCHIVES,
      title: translate('tooltipConversationsArchived', {number: archivedConversations.length}),
      label: translate('conversationFooterArchive'),
      dataUieName: 'go-archive',
      Icon: <Icon.ArchiveIcon />,
      unreadConversations: totalUnreadArchivedConversations,
    },
  ];

  // Filter tabs based on visibility preferences
  const visibleConversationTabs = conversationTabs.filter(tab => isTabVisible(tab.type, visibleTabs));

  const manageTeamUrl = getManageTeamUrl();
  const isReactTranslationRenderingEnabled = isFeatureToggleEnabled(reactTranslationRenderingFeatureToggleName);

  const showCellsTab = Config.getConfig().FEATURE.ENABLE_CELLS && isCellsEnabledForTeam;
  const connectTabIndex = visibleConversationTabs.length + 1;
  const cellsTabIndex = connectTabIndex + 1;
  const meetingsTabIndex = connectTabIndex + 1 + (showCellsTab ? 1 : 0);

  return (
    <>
      <div
        role="tablist"
        aria-label={translate('accessibility.headings.sidebar')}
        aria-owns="tab-1 tab-2 tab-3 tab-4 tab-5 tab-6 tab-7"
        className="conversations-sidebar-list"
      >
        <div className="conversations-sidebar-title" css={conversationsTitleWrapper}>
          <span>{translate('videoCallOverlayConversations')}</span>
          <TabAndFilterSettings />
        </div>

        {visibleConversationTabs.map((conversationTab, index) => {
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
          {translate('conversationFooterContacts')}
        </div>

        <ConversationTab
          title={translate('searchConnect')}
          label={translate('searchConnect')}
          type={SidebarTabs.CONNECT}
          Icon={<Icon.AddParticipantsIcon />}
          onChangeTab={onChangeTab}
          conversationTabIndex={connectTabIndex}
          dataUieName="go-people"
          isActive={currentTab === SidebarTabs.CONNECT}
        />

        {showCellsTab && (
          <>
            <div className="conversations-sidebar-divider" />

            <div className="conversations-sidebar-title" css={{marginBlock: '32px 0'}}>
              {translate('cells.sidebar.heading')}
            </div>

            <ConversationTab
              title={translate('cells.sidebar.title')}
              label={translate('cells.sidebar.title')}
              type={SidebarTabs.CELLS}
              Icon={<CollectionIcon />}
              onChangeTab={onChangeTab}
              conversationTabIndex={cellsTabIndex}
              dataUieName="go-cells"
              isActive={currentTab === SidebarTabs.CELLS}
            />
          </>
        )}

        {isMeetingsEnabled && (
          <>
            <div className="conversations-sidebar-divider" />

            <div className="conversations-sidebar-title" css={{marginBlock: '32px 0'}}>
              {translate('meetings.navigation.parent.label')}
            </div>

            <MeetingsConversationTab
              onChangeTab={onChangeTab}
              conversationTabIndex={meetingsTabIndex}
              isActive={currentTab === SidebarTabs.MEETINGS}
            />
          </>
        )}
      </div>

      <div
        role="tablist"
        aria-label={translate('accessibility.headings.sidebar.footer')}
        aria-owns="tab-1 tab-2"
        className="conversations-sidebar-list-footer"
      >
        {isTeamCreationEnabled && !teamState.isInTeam(selfUser) && <TeamCreationBanner />}

        {!getWebEnvironment().isProduction &&
          isDataDogEnabled() &&
          renderEnvironmentDisclaimerSection({isReactTranslationRenderingEnabled, translate})}

        <SettingsTab
          settingsLabel={translate('preferencesHeadline')}
          isDebugEnabled={isDebugEnabled}
          onOpenDeveloperMenu={openDebugToolbar}
          onOpenPreferences={() => {
            onChangeTab(SidebarTabs.PREFERENCES);
            onClickPreferences(ContentState.PREFERENCES_ACCOUNT);
          }}
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
            title={translate('preferencesAccountManageTeam')}
            data-uie-name="go-team-management"
          >
            <span className="conversations-sidebar-btn--text-wrapper">
              <TeamIcon />
              <span className="conversations-sidebar-btn--text"> {translate('preferencesAccountManageTeam')}</span>
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
          title={translate('preferencesAboutSupport')}
          data-uie-name="go-support"
        >
          <span className="conversations-sidebar-btn--text-wrapper">
            <SupportIcon viewBox="0 0 16 16" />
            <span className="conversations-sidebar-btn--text">{translate('preferencesAboutSupport')}</span>
            <ExternalLinkIcon className="external-link-icon" />
          </span>
        </a>
      </div>
    </>
  );
};
