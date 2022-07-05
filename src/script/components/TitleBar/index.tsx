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
import {amplify} from 'amplify';
import React, {useMemo} from 'react';
import {registerReactComponent} from 'Util/ComponentUtil';
import {t} from 'Util/LocalizerUtil';
import {ConversationVerificationState} from '../../conversation/ConversationVerificationState';
import LegalHoldDot from 'Components/LegalHoldDot';
import Icon from 'Components/Icon';
import {ContentViewModel} from '../../view_model/ContentViewModel';
import {Shortcut} from '../../ui/Shortcut';
import {ShortcutType} from '../../ui/ShortcutType';
import cx from 'classnames';
import {Conversation} from '../../entity/Conversation';
import {CallingRepository} from '../../calling/CallingRepository';
import {UserState} from '../../user/UserState';
import {CallState} from '../../calling/CallState';
import {TeamState} from '../../team/TeamState';
import {container} from 'tsyringe';
import {LegalHoldModalViewModel} from '../../view_model/content/LegalHoldModalViewModel';
import {ConversationFilter} from '../../conversation/ConversationFilter';
import {generateWarningBadgeKey} from '../../view_model/content/TitleBarViewModel';
import {matchQualifiedIds} from 'Util/QualifiedId';
import {CallActions} from '../../view_model/CallingViewModel';

export interface TitleBarProps {
  conversationEntity: Conversation;
  legalHoldModal: LegalHoldModalViewModel;
  showConversationDetails: (addParticipants: boolean) => void;
  callingRepository: CallingRepository;
  callActions: CallActions;
  isPanelVisible: boolean;
  userState: UserState;
  callState: CallState;
  teamState: TeamState;
}

const TitleBar: React.FC<TitleBarProps> = ({
  conversationEntity,
  legalHoldModal,
  showConversationDetails,
  callingRepository,
  callActions,
  isPanelVisible,
  userState = container.resolve(UserState),
  callState = container.resolve(CallState),
  teamState = container.resolve(TeamState),
}) => {
  const badgeLabelCopy = useMemo(() => {
    if (conversationEntity.is1to1() && conversationEntity.isRequest()) {
      return '';
    }

    const hasExternal = conversationEntity.hasExternal();
    const hasGuest = conversationEntity.hasDirectGuest();
    const hasService = conversationEntity.hasService();
    const hasFederated = conversationEntity.hasFederatedUsers();
    const translationKey = generateWarningBadgeKey({hasExternal, hasFederated, hasGuest, hasService});

    if (translationKey) {
      return t(translationKey);
    }

    return '';
  }, [conversationEntity]);

  const hasCall = useMemo(() => {
    const joinedCall = callState.joinedCall();
    const hasEntities = conversationEntity && !!joinedCall;
    return hasEntities && matchQualifiedIds(conversationEntity.qualifiedId, joinedCall.conversationId);
  }, [callState, conversationEntity]);

  const showCallControls = conversationEntity && ConversationFilter.showCallControls(conversationEntity, hasCall);

  const isActivatedAccount = userState.isActivatedAccount();

  const supportsVideoCall = conversationEntity?.supportsVideoCall(callingRepository.supportsConferenceCalling);

  const isVideoCallingEnabled = teamState.isVideoCallingEnabled();

  const conversationSubtitle =
    conversationEntity.is1to1() && conversationEntity.firstUserEntity?.()?.isFederated
      ? conversationEntity.firstUserEntity()?.handle ?? ''
      : '';

  const shortcut = Shortcut.getShortcutTooltip(ShortcutType.PEOPLE);
  const peopleTooltip = t('tooltipConversationPeople', shortcut);

  const onClickCollectionButton = () => {
    amplify.publish(WebAppEvents.CONTENT.SWITCH, ContentViewModel.STATE.COLLECTION);
  };

  const onClickDetails = () => {
    showConversationDetails(false);
  };

  return (
    <ul id="conversation-title-bar" className="conversation-title-bar">
      {conversationEntity && (
        <>
          <li className="conversation-title-bar-library">
            {isActivatedAccount && (
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
              onKeyDown={onClickDetails}
              data-placement="bottom"
              role="button"
              tabIndex={0}
              data-uie-name="do-participants"
            >
              <div className="conversation-title-bar-name-label--wrapper">
                {conversationEntity.hasLegalHold() && (
                  <LegalHoldDot
                    dataUieName="status-legal-hold-conversation"
                    legalHoldModal={legalHoldModal}
                    conversation={conversationEntity}
                  />
                )}

                {conversationEntity.verification_state() === ConversationVerificationState.VERIFIED && (
                  <Icon.Verified className="conversation-title-bar-name--verified" />
                )}

                <h2 className="conversation-title-bar-name-label" data-uie-name="status-conversation-title-bar-label">
                  {conversationEntity.display_name()}
                </h2>
              </div>

              {conversationSubtitle && (
                <div className="conversation-title-bar-name--subtitle">{conversationSubtitle}</div>
              )}
            </div>
          </li>

          <li className="conversation-title-bar-icons">
            {showCallControls && (
              <div className="buttons-group">
                {supportsVideoCall && isVideoCallingEnabled && (
                  <button
                    type="button"
                    className="conversation-title-bar-icon"
                    title={t('tooltipConversationVideoCall')}
                    aria-label={t('tooltipConversationVideoCall')}
                    onClick={() => callActions.startVideo(conversationEntity)}
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
                  onClick={() => callActions.startAudio(conversationEntity)}
                  data-uie-name="do-call"
                >
                  <Icon.Pickup />
                </button>
              </div>
            )}

            <button
              type="button"
              title={t('tooltipConversationInfo')}
              aria-label={t('tooltipConversationInfo')}
              onClick={onClickDetails}
              className={cx('conversation-title-bar-icon', {active: isPanelVisible})}
              data-uie-name="do-open-info"
            >
              <Icon.Info />
            </button>
          </li>

          {badgeLabelCopy && (
            <li className="conversation-title-bar-indication-badge" data-uie-name="status-indication-badge">
              {badgeLabelCopy}
            </li>
          )}
        </>
      )}
    </ul>
  );
};

export default TitleBar;

registerReactComponent('title-bar', TitleBar);
