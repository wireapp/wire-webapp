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

import React, {useMemo, useEffect, useCallback, useRef} from 'react';

import {TabIndex} from '@wireapp/react-ui-kit/lib/types/enums';
import {amplify} from 'amplify';
import cx from 'classnames';
import {container} from 'tsyringe';

import {IconButton, IconButtonVariant, useMatchMedia} from '@wireapp/react-ui-kit';
import {WebAppEvents} from '@wireapp/webapp-events';

import {useCallAlertState} from 'Components/calling/useCallAlertState';
import {Icon} from 'Components/Icon';
import {LegalHoldDot} from 'Components/LegalHoldDot';
import {useAppMainState, ViewType} from 'src/script/page/state';
import {ContentState} from 'src/script/page/useAppState';
import {useKoSubscribableChildren} from 'Util/ComponentUtil';
import {handleKeyDown} from 'Util/KeyboardUtil';
import {StringIdentifer, t} from 'Util/LocalizerUtil';
import {matchQualifiedIds} from 'Util/QualifiedId';
import {TIME_IN_MILLIS} from 'Util/TimeUtil';

import {CallState} from '../../calling/CallState';
import {ConversationFilter} from '../../conversation/ConversationFilter';
import {ConversationVerificationState} from '../../conversation/ConversationVerificationState';
import {Conversation} from '../../entity/Conversation';
import {RightSidebarParams} from '../../page/AppMain';
import {PanelState} from '../../page/RightSidebar/RightSidebar';
import {TeamState} from '../../team/TeamState';
import {Shortcut} from '../../ui/Shortcut';
import {ShortcutType} from '../../ui/ShortcutType';
import {UserState} from '../../user/UserState';
import {CallActions} from '../../view_model/CallingViewModel';
import {ViewModelRepositories} from '../../view_model/MainViewModel';

export interface TitleBarProps {
  callActions: CallActions;
  conversation: Conversation;
  openRightSidebar: (panelState: PanelState, params: RightSidebarParams, compareEntityId?: boolean) => void;
  repositories: ViewModelRepositories;
  userState: UserState;
  teamState: TeamState;
  isRightSidebarOpen?: boolean;
  callState?: CallState;
  isReadOnlyConversation?: boolean;
}

export const TitleBar: React.FC<TitleBarProps> = ({
  repositories,
  conversation,
  callActions,
  openRightSidebar,
  isRightSidebarOpen = false,
  userState = container.resolve(UserState),
  callState = container.resolve(CallState),
  teamState = container.resolve(TeamState),
  isReadOnlyConversation = false,
}) => {
  const {calling: callingRepository} = repositories;
  const {
    is1to1,
    isRequest,
    isActiveParticipant,
    isGroup,
    hasExternal,
    hasDirectGuest,
    hasService,
    hasFederatedUsers,
    firstUserEntity,
    hasLegalHold,
    display_name: displayName,
    verification_state: verificationState,
  } = useKoSubscribableChildren(conversation, [
    'is1to1',
    'isRequest',
    'isActiveParticipant',
    'isGroup',
    'hasExternal',
    'hasDirectGuest',
    'hasService',
    'hasFederatedUsers',
    'firstUserEntity',
    'hasLegalHold',
    'display_name',
    'verification_state',
  ]);

  const {isActivatedAccount} = useKoSubscribableChildren(userState, ['isActivatedAccount']);
  const {joinedCall, activeCalls} = useKoSubscribableChildren(callState, ['joinedCall', 'activeCalls']);
  const {isVideoCallingEnabled} = useKoSubscribableChildren(teamState, ['isVideoCallingEnabled']);

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
    return hasEntities && matchQualifiedIds(conversation.qualifiedId, joinedCall.conversationId);
  }, [conversation, joinedCall]);

  const showCallControls = ConversationFilter.showCallControls(conversation, hasCall);

  const supportsVideoCall = conversation.supportsVideoCall(callingRepository.supportsConferenceCalling);

  const conversationSubtitle = is1to1 && firstUserEntity?.isFederated ? firstUserEntity?.handle ?? '' : '';

  const shortcut = Shortcut.getShortcutTooltip(ShortcutType.PEOPLE);
  const peopleTooltip = t('tooltipConversationPeople', shortcut);

  // To be changed when design chooses a breakpoint, the conditional can be integrated to the ui-kit directly
  const mdBreakpoint = useMatchMedia('max-width: 768px');
  const smBreakpoint = useMatchMedia('max-width: 640px');

  const {close: closeRightSidebar} = useAppMainState(state => state.rightSidebar);

  const {setCurrentView: setView} = useAppMainState(state => state.responsiveView);

  const setLeftSidebar = () => {
    setView(ViewType.LEFT_SIDEBAR);
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
    if (!isActiveParticipant) {
      return showDetails(false);
    }

    if (isGroup) {
      showDetails(true);
    } else {
      amplify.publish(WebAppEvents.CONVERSATION.CREATE_GROUP, 'conversation_details', firstUserEntity);
    }
  }, [firstUserEntity, isActiveParticipant, isGroup, showDetails]);

  useEffect(() => {
    // TODO remove the titlebar for now to ensure that buttons are clickable in macOS wrappers
    window.setTimeout(() => document.querySelector('.titlebar')?.remove(), TIME_IN_MILLIS.SECOND);

    window.setTimeout(() => {
      amplify.subscribe(WebAppEvents.SHORTCUT.PEOPLE, () => showDetails(false));
      amplify.subscribe(WebAppEvents.SHORTCUT.ADD_PEOPLE, () => {
        if (isActivatedAccount) {
          showAddParticipant();
        }
      });
    }, 50);

    return () => {
      amplify.unsubscribeAll(WebAppEvents.SHORTCUT.PEOPLE);
      amplify.unsubscribeAll(WebAppEvents.SHORTCUT.ADD_PEOPLE);
    };
  }, [isActivatedAccount, showAddParticipant, showDetails]);

  const onClickCollectionButton = () => amplify.publish(WebAppEvents.CONTENT.SWITCH, ContentState.COLLECTION);

  const onClickDetails = () => showDetails(false);

  const onClickStartAudio = () => {
    callActions.startAudio(conversation);
    showStartedCallAlert(isGroup);

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
      className={cx('conversation-title-bar', {'is-right-panel-open': isRightSidebarOpen})}
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
          onKeyDown={event => handleKeyDown(event, onClickDetails)}
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

            {verificationState === ConversationVerificationState.VERIFIED && (
              <Icon.Verified
                data-uie-name="conversation-title-bar-verified-icon"
                className="conversation-title-bar-name--verified"
              />
            )}

            <span className="conversation-title-bar-name-label" data-uie-name="status-conversation-title-bar-label">
              {displayName}
            </span>
          </div>

          {conversationSubtitle && <div className="conversation-title-bar-name--subtitle">{conversationSubtitle}</div>}
        </div>
      </li>

      <li className="conversation-title-bar-icons">
        {showCallControls && !mdBreakpoint && (
          <div className="buttons-group">
            {supportsVideoCall && isVideoCallingEnabled && (
              <button
                type="button"
                className="conversation-title-bar-icon"
                title={t('tooltipConversationVideoCall')}
                aria-label={t('tooltipConversationVideoCall')}
                onClick={event => {
                  currentFocusedElementRef.current = event.target as HTMLButtonElement;
                  callActions.startVideo(conversation);
                  showStartedCallAlert(isGroup, true);
                }}
                data-uie-name="do-video-call"
                disabled={isReadOnlyConversation}
              >
                <Icon.Camera />
              </button>
            )}

            <button
              type="button"
              className="conversation-title-bar-icon"
              title={t('tooltipConversationCall')}
              aria-label={t('tooltipConversationCall')}
              onClick={event => {
                currentFocusedElementRef.current = event.target as HTMLButtonElement;
                callActions.startAudio(conversation);
                showStartedCallAlert(isGroup);
              }}
              data-uie-name="do-call"
              disabled={isReadOnlyConversation}
            >
              <Icon.Pickup />
            </button>
          </div>
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
              >
                <Icon.Pickup />
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
            <Icon.Info />
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
}): StringIdentifer {
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
  return `${baseKey}${extras.join('And')}` as StringIdentifer;
}
