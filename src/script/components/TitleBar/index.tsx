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

import {WebAppEvents} from '@wireapp/webapp-events';
import {IconButton, StyledApp, THEME_ID, useMatchMedia} from '@wireapp/react-ui-kit';
import {amplify} from 'amplify';
import cx from 'classnames';
import React, {useMemo, useEffect, useCallback, useState} from 'react';
import {container} from 'tsyringe';

import LegalHoldDot from 'Components/LegalHoldDot';
import Icon from 'Components/Icon';

import {registerReactComponent, useKoSubscribableChildren} from 'Util/ComponentUtil';
import {handleKeyDown} from 'Util/KeyboardUtil';
import {StringIdentifer, t} from 'Util/LocalizerUtil';
import {TIME_IN_MILLIS} from 'Util/TimeUtil';
import {matchQualifiedIds} from 'Util/QualifiedId';

import {CallState} from '../../calling/CallState';
import {ConversationFilter} from '../../conversation/ConversationFilter';
import {ConversationVerificationState} from '../../conversation/ConversationVerificationState';
import {Conversation} from '../../entity/Conversation';
import {openRightSidebar, PanelState} from '../../page/RightSidebar/RightSidebar';
import {UserState} from '../../user/UserState';
import {TeamState} from '../../team/TeamState';
import {Shortcut} from '../../ui/Shortcut';
import {ShortcutType} from '../../ui/ShortcutType';
import {CallActions} from '../../view_model/CallingViewModel';
import {ContentState} from '../../view_model/ContentViewModel';
import {MainViewModel, ViewModelRepositories} from '../../view_model/MainViewModel';
import {LegalHoldModalViewModel} from '../../view_model/content/LegalHoldModalViewModel';

export interface TitleBarProps {
  mainViewModel: MainViewModel;
  repositories: ViewModelRepositories;
  conversation: Conversation;
  legalHoldModal: LegalHoldModalViewModel;
  callActions: CallActions;
  userState: UserState;
  teamState: TeamState;
  callState?: CallState;
  isFederated?: boolean;
  // Function will be used after migration, to changing React State. Current implementation works with React and Knockout.
  toggleRightSidebar?: (state: PanelState) => void;
}

const TitleBar: React.FC<TitleBarProps> = ({
  mainViewModel,
  repositories,
  conversation,
  legalHoldModal,
  callActions,
  isFederated = false,
  toggleRightSidebar = state => null,
  userState = container.resolve(UserState),
  callState = container.resolve(CallState),
  teamState = container.resolve(TeamState),
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

  const [isRightPanelOpen, setIsRightPanelOpen] = useState<boolean>(false);

  const {isActivatedAccount} = useKoSubscribableChildren(userState, ['isActivatedAccount']);
  const {joinedCall} = useKoSubscribableChildren(callState, ['joinedCall']);
  const {isVideoCallingEnabled} = useKoSubscribableChildren(teamState, ['isVideoCallingEnabled']);

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

  const isScaledDown = useMatchMedia('max-width: 768px');

  const showDetails = useCallback(
    (addParticipants: boolean): void => {
      const panelId = addParticipants ? PanelState.ADD_PARTICIPANTS : PanelState.CONVERSATION_DETAILS;

      toggleRightSidebar(panelId);

      openRightSidebar({
        initialEntity: conversation,
        initialState: panelId,
        isFederated,
        mainViewModel,
        repositories,
        teamState,
        userState,
      });
    },
    [conversation],
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

  const onClickCollectionButton = () => {
    amplify.publish(WebAppEvents.CONTENT.SWITCH, ContentState.COLLECTION);
  };

  const onClickDetails = () => showDetails(false);

  const onRightPanelToggle = (mutationList: MutationRecord[]) => {
    mutationList.forEach(mutation => {
      const {addedNodes, removedNodes} = mutation;

      addedNodes.forEach(node => {
        if (node instanceof Element) {
          const isElementExist = node.id === 'right-column';
          if (isElementExist) {
            setIsRightPanelOpen(true);
          }
        }
      });

      removedNodes.forEach(node => {
        if (node instanceof Element) {
          const isElementExist = node.id === 'right-column';
          if (isElementExist) {
            setIsRightPanelOpen(false);
          }
        }
      });
    });
  };

  // This observer getting if right panel is open.
  // It will be refactored for react statement if we migrate all wire-main to React.
  // Now in the wire-main we have defined this TitleBar, so if we move it to the React we will work on state.
  const config = {childList: true};
  const observer = new MutationObserver(onRightPanelToggle);

  useEffect(() => {
    const rightPanel = document.querySelector('#app');

    if (rightPanel) {
      observer.observe(rightPanel, config);

      return () => observer.disconnect();
    }

    return () => undefined;
  }, []);

  return (
    <StyledApp themeId={THEME_ID.DEFAULT}>
      <ul id="conversation-title-bar" className="conversation-title-bar">
        <li className="conversation-title-bar-library">
          {isActivatedAccount && !isScaledDown && (
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
            onKeyDown={e => handleKeyDown(e, onClickDetails)}
            data-placement="bottom"
            role="button"
            tabIndex={0}
            data-uie-name="do-participants"
          >
            <div className="conversation-title-bar-name-label--wrapper">
              {hasLegalHold && (
                <LegalHoldDot
                  dataUieName="status-legal-hold-conversation"
                  className="conversation-title-bar-legal-hold"
                  legalHoldModal={legalHoldModal}
                  conversation={conversation}
                />
              )}

              {verificationState === ConversationVerificationState.VERIFIED && (
                <Icon.Verified
                  data-uie-name="conversation-title-bar-verified-icon"
                  className="conversation-title-bar-name--verified"
                />
              )}

              <h2 className="conversation-title-bar-name-label" data-uie-name="status-conversation-title-bar-label">
                {displayName}
              </h2>
            </div>

            {conversationSubtitle && (
              <div className="conversation-title-bar-name--subtitle">{conversationSubtitle}</div>
            )}
          </div>
        </li>

        <li className="conversation-title-bar-icons">
          {showCallControls && !isScaledDown && (
            <div className="buttons-group">
              {supportsVideoCall && isVideoCallingEnabled && (
                <button
                  type="button"
                  className="conversation-title-bar-icon"
                  title={t('tooltipConversationVideoCall')}
                  aria-label={t('tooltipConversationVideoCall')}
                  onClick={() => callActions.startVideo(conversation)}
                  data-uie-name="do-video-call"
                >
                  <Icon.Camera />
                </button>
              )}

              <button
                type="button"
                className="conversation-title-bar-icon"
                title={t('tooltipConversationCall')}
                aria-label={t('tooltipConversationCall')}
                onClick={() => callActions.startAudio(conversation)}
                data-uie-name="do-call"
              >
                <Icon.Pickup />
              </button>
            </div>
          )}

          {isScaledDown ? (
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

              <IconButton
                title={t('tooltipConversationCall')}
                aria-label={t('tooltipConversationCall')}
                css={{marginBottom: 0}}
                onClick={() => callActions.startAudio(conversation)}
                data-uie-name="do-call"
              >
                <Icon.Pickup />
              </IconButton>
            </>
          ) : (
            <button
              type="button"
              title={t('tooltipConversationInfo')}
              aria-label={t('tooltipConversationInfo')}
              onClick={onClickDetails}
              className={cx('conversation-title-bar-icon', {active: isRightPanelOpen})}
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
    </StyledApp>
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

export default TitleBar;

registerReactComponent('title-bar', TitleBar);
