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

import React, {useCallback, useEffect, useMemo, useRef} from 'react';

import {amplify} from 'amplify';
import cx from 'classnames';
import {container} from 'tsyringe';

import {CallIcon, IconButton, IconButtonVariant, QUERY, TabIndex, useMatchMedia} from '@wireapp/react-ui-kit';
import {WebAppEvents} from '@wireapp/webapp-events';

import {ConversationVerificationBadges} from 'Components/Badge';
import {useCallAlertState} from 'Components/calling/useCallAlertState';
import * as Icon from 'Components/Icon';
import {LegalHoldDot} from 'Components/LegalHoldDot';
import {useNoInternetCallGuard} from 'Hooks/useNoInternetCallGuard/useNoInternetCallGuard';
import {CallState} from 'Repositories/calling/CallState';
import {ConversationFilter} from 'Repositories/conversation/ConversationFilter';
import {Conversation} from 'Repositories/entity/Conversation';
import {User} from 'Repositories/entity/User';
import {TeamState} from 'Repositories/team/TeamState';
import {useAppMainState, ViewType} from 'src/script/page/state';
import {ContentState} from 'src/script/page/useAppState';
import {useKoSubscribableChildren} from 'Util/ComponentUtil';
import {handleKeyDown, KEY} from 'Util/KeyboardUtil';
import {t} from 'Util/LocalizerUtil';
import {matchQualifiedIds} from 'Util/QualifiedId';
import {TIME_IN_MILLIS} from 'Util/TimeUtil';

import {RightSidebarParams} from '../../page/AppMain';
import {PanelState} from '../../page/RightSidebar';
import {Shortcut} from '../../ui/Shortcut';
import {ShortcutType} from '../../ui/ShortcutType';
import {CallActions} from '../../view_model/CallingViewModel';
import {ViewModelRepositories} from '../../view_model/MainViewModel';

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
}

export const TitleBar: React.FC<TitleBarProps> = ({
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
}) => {
  const {
    is1to1,
    isRequest,
    isActiveParticipant,
    isGroupOrChannel,
    hasExternal,
    hasDirectGuest,
    hasService,
    hasFederatedUsers,
    firstUserEntity,
    hasLegalHold,
    display_name: displayName,
  } = useKoSubscribableChildren(conversation, [
    'is1to1',
    'isRequest',
    'isActiveParticipant',
    'isGroupOrChannel',
    'hasExternal',
    'hasDirectGuest',
    'hasService',
    'hasFederatedUsers',
    'firstUserEntity',
    'hasLegalHold',
    'display_name',
  ]);

  const guardCall = useNoInternetCallGuard();

  const {isActivatedAccount} = useKoSubscribableChildren(selfUser, ['isActivatedAccount']);
  const {joinedCall, activeCalls} = useKoSubscribableChildren(callState, ['joinedCall', 'activeCalls']);

  const currentFocusedElementRef = useRef<HTMLButtonElement | null>(null);

  const badgeLabelCopy = useMemo(() => {
    if (is1to1 && isRequest) {
      return '';
    }

    const translationKey = generateWarningBadgeKey({
      hasExternal,
      hasFederated: hasFederatedUsers,
      hasGuest: hasDirectGuest,
      hasService,
    });

    if (translationKey) {
      return t(translationKey);
    }

    return '';
  }, [hasDirectGuest, hasExternal, hasFederatedUsers, hasService, is1to1, isRequest]);

  const hasCall = useMemo(() => {
    const hasEntities = !!joinedCall;
    return hasEntities && matchQualifiedIds(conversation.qualifiedId, joinedCall.conversation.qualifiedId);
  }, [conversation, joinedCall]);

  const showCallControls = ConversationFilter.showCallControls(conversation, hasCall);

  const conversationSubtitle = is1to1 && firstUserEntity?.isFederated ? firstUserEntity?.handle ?? '' : '';

  const shortcut = Shortcut.getShortcutTooltip(ShortcutType.PEOPLE);
  const peopleTooltip = t('tooltipConversationPeople', {shortcut});

  // To be changed when design chooses a breakpoint, the conditional can be integrated to the ui-kit directly
  const mdBreakpoint = useMatchMedia('max-width: 1000px');
  const smBreakpoint = useMatchMedia(QUERY.tabletSMDown);

  const {close: closeRightSidebar} = useAppMainState(state => state.rightSidebar);

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
    guardCall(() => {
      callActions.startAudio(conversation);
      showStartedCallAlert(isGroupOrChannel);
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

  return (
    <ul
      id="conversation-title-bar"
      className={cx('conversation-title-bar', {
        'is-right-panel-open': isRightSidebarOpen,
        'conversation-title-bar--with-bottom-divider': withBottomDivider,
      })}
    >
      <li className="conversation-title-bar-library">
        {smBreakpoint && (
          <IconButton
            variant={IconButtonVariant.SECONDARY}
            className="conversation-title-bar-icon icon-back"
            css={{marginBottom: 0}}
            onClick={setLeftSidebar}
          />
        )}

        {isActivatedAccount && !mdBreakpoint && (
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
        <div
          id="show-participants"
          onClick={onClickDetails}
          title={peopleTooltip}
          aria-label={peopleTooltip}
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

            <span className="conversation-title-bar-name-label" data-uie-name="status-conversation-title-bar-label">
              {displayName}
            </span>

            <ConversationVerificationBadges conversation={conversation} />
          </div>

          {conversationSubtitle && <div className="conversation-title-bar-name--subtitle">{conversationSubtitle}</div>}
        </div>
      </li>

      <li className="conversation-title-bar-icons">
        {showCallControls && !mdBreakpoint && (
          <button
            type="button"
            className="conversation-title-bar-icon"
            title={t('tooltipConversationCall')}
            aria-label={t('tooltipConversationCall')}
            onClick={event => {
              currentFocusedElementRef.current = event.target as HTMLButtonElement;
              startCallAndShowAlert();
            }}
            data-uie-name="do-call"
            disabled={isReadOnlyConversation}
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
                disabled={isReadOnlyConversation}
              >
                <CallIcon />
              </IconButton>
            )}
          </>
        ) : (
          <button
            type="button"
            title={t('tooltipConversationInfo')}
            aria-label={t('tooltipConversationInfo')}
            onClick={onClickDetails}
            className={cx('conversation-title-bar-icon', {active: isRightSidebarOpen})}
            data-uie-name="do-open-info"
          >
            <Icon.InfoIcon />
          </button>
        )}
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
  if (hasGuest && !hasExternal && !hasService && !hasFederated) {
    return baseKey;
  }
  if (hasFederated) {
    extras.push('Federated');
  }
  if (hasExternal) {
    extras.push('External');
  }
  if (hasGuest) {
    extras.push('Guest');
  }
  if (hasService) {
    extras.push('Service');
  }
  if (!extras.length) {
    return '';
  }
  return `${baseKey}${extras.join('And')}` as WarningBadgeKey;
}
