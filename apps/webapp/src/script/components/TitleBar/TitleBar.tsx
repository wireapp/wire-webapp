/*
 * Wire
 * Copyright (C) 2022 Wire Swiss GmbH
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

import {ReactNode, useCallback, useEffect, useMemo, useRef, useState} from 'react';

import {css} from '@emotion/react';

import {CONVERSATION_ACCESS} from '@wireapp/api-client/lib/conversation/';
import {amplify} from 'amplify';
import cx from 'classnames';
import {container} from 'tsyringe';

import {
  Breadcrumbs,
  CallIcon,
  IconButton,
  IconButtonVariant,
  QUERY,
  TabIndex,
  useMatchMedia,
} from '@wireapp/react-ui-kit';
import {WebAppEvents} from '@wireapp/webapp-events';

import {Avatar, AVATAR_SIZE, GroupAvatar} from 'Components/Avatar';
import {ChannelAvatar} from 'Components/Avatar/ChannelAvatar';
import {ConversationVerificationBadges} from 'Components/Badge';
import {useCallAlertState} from 'Components/calling/useCallAlertState';
import * as Icon from 'Components/icon';
import {LegalHoldDot} from 'Components/LegalHoldDot';
import {ThreadsOutlineIcon} from 'Components/ThreadIcons';
import {useConversationCall} from 'Hooks/useConversationCall';
import {useNoInternetCallGuard} from 'Hooks/useNoInternetCallGuard/useNoInternetCallGuard';
import {CallState} from 'Repositories/calling/CallState';
import {ConversationFilter} from 'Repositories/conversation/ConversationFilter';
import {Conversation} from 'Repositories/entity/Conversation';
import {User} from 'Repositories/entity/User';
import {TeamState} from 'Repositories/team/TeamState';
import {useAppMainState, ViewType} from 'src/script/page/state';
import {ContentState} from 'src/script/page/useAppState';
import {useKoSubscribableChildren} from 'Util/componentUtil';
import {handleKeyDown, KEY} from 'Util/keyboardUtil';
import {t} from 'Util/localizerUtil';
import {matchQualifiedIds} from 'Util/qualifiedId';
import {TIME_IN_MILLIS} from 'Util/timeUtil';
import {useChannelsFeatureFlag} from 'Util/useChannelsFeatureFlag';

import {RightSidebarParams} from '../../page/AppMain';
import {PanelState} from '../../page/RightSidebar';
import {generateConversationUrl} from '../../router/routeGenerator';
import {navigate} from '../../router/Router';
import {CallActions} from '../../view_model/CallingViewModel';
import {ViewModelRepositories} from '../../view_model/MainViewModel';

const threadBreadcrumbNavStyles = css`
  flex: 1;
  min-width: 0;
  overflow: hidden;

  ol {
    min-width: 0;
  }

  button {
    font-size: var(--font-size-medium);
    font-weight: var(--font-weight-semibold);
    color: var(--main-color);
  }

  button:hover {
    color: var(--main-color);
  }

  li:first-child button > * {
    transform: scale(1.0625);
  }

  li:last-child span {
    font-size: var(--font-size-medium);
    font-weight: var(--font-weight-semibold);
    color: var(--accent-color);
  }

  li:last-child span svg {
    width: 16px;
    height: 15px;
  }
`;

interface TitleBarProps {
  callActions: CallActions;
  conversation: Conversation;
  openRightSidebar: (panelState: PanelState, params: RightSidebarParams, compareEntityId?: boolean) => void;
  repositories: ViewModelRepositories;
  selfUser: User;
  teamState: TeamState;
  isRightSidebarOpen?: boolean;
  callState?: CallState;
  isReadOnlyConversation?: boolean;
  withBottomDivider: boolean;
  isSharedDriveSearchViewOpen?: boolean;
  onCloseSharedDriveSearchView?: () => void;
}

export const TitleBar = ({
  repositories,
  conversation,
  callActions,
  selfUser,
  openRightSidebar,
  isRightSidebarOpen = false,
  callState = container.resolve(CallState),
  teamState = container.resolve(TeamState),
  isReadOnlyConversation = false,
  withBottomDivider,
  isSharedDriveSearchViewOpen = false,
  onCloseSharedDriveSearchView,
}: TitleBarProps) => {
  const {
    is1to1,
    isRequest,
    isActiveParticipant,
    isGroupOrChannel,
    isGroup,
    isChannel,
    hasExternal,
    hasDirectGuest,
    hasService,
    hasApps,
    hasFederatedUsers,
    firstUserEntity,
    hasLegalHold,
    display_name: displayName,
  } = useKoSubscribableChildren(conversation, [
    'is1to1',
    'isRequest',
    'isActiveParticipant',
    'isGroupOrChannel',
    'isGroup',
    'isChannel',
    'hasExternal',
    'hasDirectGuest',
    'hasService',
    'hasApps',
    'hasFederatedUsers',
    'firstUserEntity',
    'hasLegalHold',
    'display_name',
  ]);

  const guardCall = useNoInternetCallGuard();
  const {isChannelsEnabled} = useChannelsFeatureFlag();
  const {isCallConnecting, isCallActive} = useConversationCall(conversation);

  const {isActivatedAccount} = useKoSubscribableChildren(selfUser, ['isActivatedAccount']);
  const {joinedCall, activeCalls} = useKoSubscribableChildren(callState, ['joinedCall', 'activeCalls']);

  const currentFocusedElementRef = useRef<HTMLButtonElement | null>(null);

  // using ref for immediate double-click protection
  const isStartingCallRef = useRef(false);

  // Reset local state when a call becomes active or cleared
  if (isStartingCallRef.current && (isCallActive || activeCalls.length === 0)) {
    isStartingCallRef.current = false;
  }

  // Button is disabled if starting, connecting, or already active
  const isCallButtonDisabled = isReadOnlyConversation || isStartingCallRef.current || isCallConnecting || isCallActive;

  const badgeLabelCopy = useMemo(() => {
    if (is1to1 && isRequest) {
      return '';
    }

    const translationKey = generateWarningBadgeKey({
      hasExternal,
      hasFederated: hasFederatedUsers,
      hasGuest: hasDirectGuest,
      hasService: hasService || hasApps,
    });

    if (translationKey) {
      return t(translationKey);
    }

    return '';
  }, [hasDirectGuest, hasExternal, hasFederatedUsers, hasService, hasApps, is1to1, isRequest]);

  const hasCall = useMemo(() => {
    const hasEntities = !!joinedCall;
    return hasEntities && matchQualifiedIds(conversation.qualifiedId, joinedCall.conversation.qualifiedId);
  }, [conversation, joinedCall]);

  const showCallControls = ConversationFilter.showCallControls(conversation, hasCall);

  const conversationSubtitle = is1to1 && firstUserEntity?.isFederated === true ? (firstUserEntity?.handle ?? '') : '';

  const conversationDetailsTooltip = t('tooltipConversationPeople', {displayName});

  // To be changed when design chooses a breakpoint, the conditional can be integrated to the ui-kit directly
  const mdBreakpoint = useMatchMedia('max-width: 1000px');
  const smBreakpoint = useMatchMedia(QUERY.tabletSMDown);

  const {close: closeRightSidebar} = useAppMainState(state => state.rightSidebar);
  const activeThreadRootMessage = useAppMainState(state => state.conversationThread.rootMessage);
  const closeConversationThread = useAppMainState(state => state.conversationThread.close);
  const activeRightSidebarPanel = useAppMainState(state => {
    const {history} = state.rightSidebar;
    return history[history.length - 1];
  });

  const {setCurrentView: setView} = useAppMainState(state => state.responsiveView);

  const setLeftSidebar = () => {
    setView(ViewType.MOBILE_LEFT_SIDEBAR);
    closeRightSidebar();
  };

  const showDetails = useCallback(
    (addParticipants: boolean): void => {
      const panelId = addParticipants ? PanelState.ADD_PARTICIPANTS : PanelState.CONVERSATION_DETAILS;

      openRightSidebar(panelId, {entity: conversation});
    },
    [conversation, openRightSidebar],
  );

  const showAddParticipant = useCallback(() => {
    if (is1to1) {
      return;
    }

    if (!isActiveParticipant) {
      return showDetails(false);
    }

    if (isGroupOrChannel) {
      showDetails(true);
    } else {
      amplify.publish(WebAppEvents.CONVERSATION.CREATE_GROUP, 'conversation_details', firstUserEntity);
    }
  }, [firstUserEntity, isActiveParticipant, isGroupOrChannel, showDetails, is1to1]);

  useEffect(() => {
    // TODO remove the titlebar for now to ensure that buttons are clickable in macOS wrappers
    window.setTimeout(() => document.querySelector('.titlebar')?.remove(), TIME_IN_MILLIS.SECOND);

    amplify.subscribe(WebAppEvents.SHORTCUT.PEOPLE, () => showDetails(false));
    amplify.subscribe(WebAppEvents.SHORTCUT.ADD_PEOPLE, () => {
      if (isActivatedAccount) {
        showAddParticipant();
      }
    });

    return () => {
      amplify.unsubscribeAll(WebAppEvents.SHORTCUT.PEOPLE);
      amplify.unsubscribeAll(WebAppEvents.SHORTCUT.ADD_PEOPLE);
    };
  }, [isActivatedAccount, showAddParticipant, showDetails]);

  const onClickCollectionButton = () => amplify.publish(WebAppEvents.CONTENT.SWITCH, ContentState.COLLECTION);

  const onClickDetails = () => showDetails(false);

  const startCallAndShowAlert = () => {
    if (isStartingCallRef.current || isCallButtonDisabled) {
      return;
    }

    isStartingCallRef.current = true;

    guardCall(async () => {
      try {
        await callActions.startAudio(conversation);
        isStartingCallRef.current = false;
        showStartedCallAlert(isGroupOrChannel);
      } catch (error: unknown) {
        // Re-enable on error
        isStartingCallRef.current = false;
      }
    });
  };

  const onClickStartAudio = () => {
    startCallAndShowAlert();

    if (smBreakpoint) {
      setLeftSidebar();
    }
  };

  useEffect(() => {
    if (!activeCalls.length && currentFocusedElementRef.current) {
      currentFocusedElementRef.current.focus();
      currentFocusedElementRef.current = null;
    }
  }, [activeCalls.length]);

  const {showStartedCallAlert} = useCallAlertState();
  const isConversationThreadsListOpen = activeRightSidebarPanel === PanelState.CONVERSATION_THREADS_LIST;
  const isInfoPanelActive = isRightSidebarOpen && !isConversationThreadsListOpen;
  const isMainThreadOpen = !!activeThreadRootMessage;
  const [isFollowingThread, setIsFollowingThread] = useState(false);

  const openConversationThreadsList = useCallback(() => {
    openRightSidebar(PanelState.CONVERSATION_THREADS_LIST, {entity: conversation}, true);
  }, [conversation, openRightSidebar]);

  const conversationBreadcrumbIcon = useMemo((): ReactNode => {
    if (isChannel && isChannelsEnabled) {
      return (
        <ChannelAvatar
          conversationID={conversation.id}
          isLocked={conversation.accessModes?.includes(CONVERSATION_ACCESS.LINK) !== true}
          size="small"
        />
      );
    }

    if (isGroup) {
      return <GroupAvatar conversationID={conversation.id} size="small" />;
    }

    if (firstUserEntity) {
      return <Avatar participant={firstUserEntity} avatarSize={AVATAR_SIZE.SMALL} />;
    }

    return null;
  }, [conversation.accessModes, conversation.id, firstUserEntity, isChannel, isChannelsEnabled, isGroup]);

  const threadBreadcrumbItems = useMemo(
    () => [
      {name: displayName, icon: conversationBreadcrumbIcon},
      {name: 'Thread', icon: <ThreadsOutlineIcon />},
    ],
    [conversationBreadcrumbIcon, displayName],
  );

  const onThreadBreadcrumbClick = useCallback(
    (item: {name: string}) => {
      if (item.name === displayName) {
        closeConversationThread();
        navigate(generateConversationUrl(conversation.qualifiedId));
      }
    },
    [closeConversationThread, conversation.qualifiedId, displayName],
  );

  const closeActiveThread = useCallback(() => {
    closeConversationThread();
    navigate(generateConversationUrl(conversation.qualifiedId));
  }, [closeConversationThread, conversation.qualifiedId]);

  const threadButton = (
    <button
      type="button"
      title="Threads"
      aria-label="Threads"
      onClick={openConversationThreadsList}
      className={cx('conversation-title-bar-icon', {active: isConversationThreadsListOpen})}
      data-uie-name="do-open-conversation-threads"
    >
      <ThreadsOutlineIcon />
    </button>
  );

  const threadFollowButton = isFollowingThread ? (
    <button
      type="button"
      className="conversation-title-bar-follow-button conversation-title-bar-follow-button--following"
      aria-pressed={true}
      aria-label="Unfollow thread"
      onClick={() => setIsFollowingThread(false)}
      data-uie-name="do-unfollow-thread"
    >
      <span className="conversation-title-bar-follow-button__content">
        <span className="conversation-title-bar-follow-button__label conversation-title-bar-follow-button__label--following">
          <Icon.CheckIcon width={12} height={9} />
          Following
        </span>
        <span className="conversation-title-bar-follow-button__label conversation-title-bar-follow-button__label--unfollow">
          <Icon.CloseIcon width={10} height={10} />
          Unfollow
        </span>
      </span>
    </button>
  ) : (
    <button
      type="button"
      className="conversation-title-bar-follow-button conversation-title-bar-follow-button--follow"
      aria-pressed={false}
      aria-label="Follow thread"
      onClick={() => setIsFollowingThread(true)}
      data-uie-name="do-follow-thread"
    >
      <Icon.PlusIcon width={12} height={12} />
      Follow
    </button>
  );

  return (
    <ul
      id="conversation-title-bar"
      className={cx('conversation-title-bar', {
        'is-right-panel-open': isRightSidebarOpen,
        'conversation-title-bar--with-bottom-divider': withBottomDivider,
        'conversation-title-bar--thread-open': isMainThreadOpen,
      })}
    >
      <li
        className={cx('conversation-title-bar-library', {
          'conversation-title-bar-library--thread': isMainThreadOpen,
        })}
      >
        {isMainThreadOpen && (
          <>
            <IconButton
              variant={IconButtonVariant.SECONDARY}
              className="conversation-title-bar-icon icon-back"
              css={{marginBottom: 0}}
              onClick={closeActiveThread}
              aria-label="Back to conversation"
              data-uie-name="do-close-message-thread"
            />
            <nav aria-label="Thread navigation" css={threadBreadcrumbNavStyles} data-uie-name="thread-breadcrumb">
              <Breadcrumbs items={threadBreadcrumbItems} onItemClick={onThreadBreadcrumbClick} />
            </nav>
          </>
        )}

        {!isMainThreadOpen && smBreakpoint && (
          <IconButton
            variant={IconButtonVariant.SECONDARY}
            className="conversation-title-bar-icon icon-back"
            css={{marginBottom: 0}}
            onClick={setLeftSidebar}
            aria-label={t('index.goBack')}
          />
        )}

        {isSharedDriveSearchViewOpen && (
          <button
            className="conversation-title-bar-icon conversation-title-bar-icon--borderless"
            type="button"
            title={t('fullsearchCancelLabel')}
            aria-label={t('fullsearchCancelLabel')}
            onClick={onCloseSharedDriveSearchView}
            data-uie-name="do-close-shared-drive-search"
          >
            <Icon.CloseIcon />
          </button>
        )}

        {isActivatedAccount && !mdBreakpoint && !isSharedDriveSearchViewOpen && !isMainThreadOpen && (
          <button
            className="conversation-title-bar-icon icon-search"
            type="button"
            title={t('tooltipConversationSearch')}
            aria-label={t('tooltipConversationSearch')}
            onClick={onClickCollectionButton}
            data-uie-name="do-collections"
          >
            <span className="visually-hidden">{t('tooltipConversationSearch')}</span>
          </button>
        )}
      </li>

      <li className="conversation-title-bar-name">
        {!isMainThreadOpen && (
          <div
            id="show-participants"
            onClick={onClickDetails}
            title={conversationDetailsTooltip}
            aria-label={conversationDetailsTooltip}
            onKeyDown={event =>
              handleKeyDown({
                event,
                callback: onClickDetails,
                keys: [KEY.ENTER, KEY.SPACE],
              })
            }
            data-placement="bottom"
            role="button"
            tabIndex={TabIndex.FOCUSABLE}
            data-uie-name="do-participants"
          >
            <div className="conversation-title-bar-name-label--wrapper">
              {hasLegalHold && (
                <LegalHoldDot
                  dataUieName="status-legal-hold-conversation"
                  className="conversation-title-bar-legal-hold"
                  conversation={conversation}
                  isInteractive
                />
              )}

              <span
                className="conversation-title-bar-name-label"
                data-uie-name="status-conversation-title-bar-label"
              >
                {displayName}
              </span>

              <ConversationVerificationBadges conversation={conversation} />
            </div>

            {conversationSubtitle && <div className="conversation-title-bar-name--subtitle">{conversationSubtitle}</div>}
          </div>
        )}
      </li>

      <li className="conversation-title-bar-icons">
        {!isSharedDriveSearchViewOpen &&
          (isMainThreadOpen ? (
            threadFollowButton
          ) : (
            <>
              {showCallControls && !mdBreakpoint && (
                <button
                  type="button"
                  className="conversation-title-bar-icon"
                  title={t('tooltipConversationCall')}
                  aria-label={t('tooltipConversationCall')}
                  onClick={event => {
                    currentFocusedElementRef.current = event.currentTarget;
                    startCallAndShowAlert();
                  }}
                  data-uie-name="do-call"
                  disabled={isCallButtonDisabled}
                >
                  <CallIcon />
                </button>
              )}
              {mdBreakpoint ? (
                <>
                  <IconButton
                    className="icon-search"
                    css={{marginBottom: 0}}
                    title={t('tooltipConversationSearch')}
                    aria-label={t('tooltipConversationSearch')}
                    onClick={onClickCollectionButton}
                    data-uie-name="do-collections"
                  >
                    <span className="visually-hidden">{t('tooltipConversationSearch')}</span>
                  </IconButton>
                  {showCallControls && (
                    <IconButton
                      title={t('tooltipConversationCall')}
                      aria-label={t('tooltipConversationCall')}
                      css={{marginBottom: 0}}
                      onClick={onClickStartAudio}
                      data-uie-name="do-call"
                      disabled={isCallButtonDisabled}
                    >
                      <CallIcon />
                    </IconButton>
                  )}
                  {threadButton}
                </>
              ) : (
                <>
                  {threadButton}
                  <button
                    type="button"
                    title={t('tooltipConversationInfo')}
                    aria-label={t('tooltipConversationInfo')}
                    onClick={onClickDetails}
                    className={cx('conversation-title-bar-icon', {active: isInfoPanelActive})}
                    data-uie-name="do-open-info"
                  >
                    <Icon.InfoIcon />
                  </button>
                </>
              )}
            </>
          ))}
      </li>

      {badgeLabelCopy && (
        <li
          className="conversation-title-bar-indication-badge"
          data-uie-name="status-indication-badge"
          dangerouslySetInnerHTML={{__html: badgeLabelCopy}}
        />
      )}
    </ul>
  );
};

type BadgeKeys =
  | 'External'
  | 'ExternalAndGuest'
  | 'ExternalAndGuestAndService'
  | 'ExternalAndService'
  | 'Federated'
  | 'FederatedAndExternal'
  | 'FederatedAndExternalAndGuest'
  | 'FederatedAndExternalAndGuestAndService'
  | 'FederatedAndExternalAndService'
  | 'FederatedAndGuest'
  | 'FederatedAndGuestAndService'
  | 'FederatedAndService'
  | 'GuestAndService'
  | 'Service';

type WarningBadgeKey = '' | 'guestRoomConversationBadge' | `${'guestRoomConversationBadge'}${BadgeKeys}`;

export function generateWarningBadgeKey({
  hasFederated,
  hasExternal,
  hasGuest,
  hasService,
}: {
  hasExternal?: boolean;
  hasFederated?: boolean;
  hasGuest?: boolean;
  hasService?: boolean;
}): WarningBadgeKey {
  const baseKey = 'guestRoomConversationBadge';
  const extras = [];
  if (hasGuest === true && hasExternal !== true && hasService !== true && hasFederated !== true) {
    return baseKey;
  }
  if (hasFederated === true) {
    extras.push('Federated');
  }
  if (hasExternal === true) {
    extras.push('External');
  }
  if (hasGuest === true) {
    extras.push('Guest');
  }
  if (hasService === true) {
    extras.push('Service');
  }
  if (extras.length === 0) {
    return '';
  }
  return `${baseKey}${extras.join('And')}` as WarningBadgeKey;
}
