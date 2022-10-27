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

import React from 'react';

import {REASON as CALL_REASON, STATE as CALL_STATE} from '@wireapp/avs';
import cx from 'classnames';

import {Avatar, AVATAR_SIZE} from 'Components/Avatar';
import {GroupAvatar} from 'Components/avatar/GroupAvatar';
import {Icon} from 'Components/Icon';
import {ClassifiedBar} from 'Components/input/ClassifiedBar';
import {useAppMainState, ViewType} from 'src/script/page/state';
import {useKoSubscribableChildren} from 'Util/ComponentUtil';
import {t} from 'Util/LocalizerUtil';

import type {Call} from '../../calling/Call';
import type {CallingRepository} from '../../calling/CallingRepository';
import {CallState} from '../../calling/CallState';
import type {Conversation} from '../../entity/Conversation';
import {generateConversationUrl} from '../../router/routeGenerator';
import {createNavigate, createNavigateKeyboard} from '../../router/routerBindings';
import {CallActions} from '../../view_model/CallingViewModel';

export interface CallingCellProps {
  call: Call;
  callActions: CallActions;
  callingRepository: Pick<CallingRepository, 'supportsScreenSharing' | 'sendModeratorMute'>;
  conversation: Conversation;
  callState?: CallState;
  classifiedDomains?: string[];
  temporaryUserStyle?: boolean;
}

const ConversationCallingCell: React.FC<CallingCellProps> = ({
  conversation,
  classifiedDomains,
  temporaryUserStyle,
  call,
  callActions,
}) => {
  const {reason, state} = useKoSubscribableChildren(call, ['reason', 'state']);
  const {
    isGroup,
    participating_user_ets: userEts,
    selfUser,
    display_name: conversationName,
  } = useKoSubscribableChildren(conversation, [
    'isGroup',
    'participating_user_ets',
    'selfUser',
    'display_name',
    'roles',
  ]);

  const isDeclined = !!reason && [CALL_REASON.STILL_ONGOING, CALL_REASON.ANSWERED_ELSEWHERE].includes(reason);

  const isOutgoing = state === CALL_STATE.OUTGOING;
  const isIncoming = state === CALL_STATE.INCOMING;
  const isConnecting = state === CALL_STATE.ANSWERED;
  const isOngoing = state === CALL_STATE.MEDIA_ESTAB;

  type labels = {dataUieName: string; text: string};

  const callStatus: Partial<Record<CALL_STATE, labels>> = {
    [CALL_STATE.OUTGOING]: {
      dataUieName: 'call-label-outgoing',
      text: t('callStateOutgoing'),
    },
    [CALL_STATE.INCOMING]: {
      dataUieName: 'call-label-incoming',
      text: t('callStateIncoming'),
    },
    [CALL_STATE.ANSWERED]: {
      dataUieName: 'call-label-connecting',
      text: t('callStateConnecting'),
    },
  };

  const currentCallStatus = callStatus[state];

  const conversationParticipants = conversation && (selfUser ? userEts.concat(selfUser) : userEts);
  const conversationUrl = generateConversationUrl(conversation.id, conversation.domain);

  const {setCurrentView} = useAppMainState(state => state.responsiveView);

  return (
    <div className="conversation-calling-cell">
      {conversation && !isDeclined && (
        <div
          className="conversation-list-calling-cell-background"
          data-uie-name="item-call"
          data-uie-id={conversation.id}
          data-uie-value={conversation.display_name()}
        >
          <div className="conversation-list-cell-right__calling">
            <div
              className="conversation-list-cell conversation-list-cell-button"
              onClick={createNavigate(conversationUrl)}
              onKeyDown={createNavigateKeyboard(conversationUrl)}
              tabIndex={0}
              role="button"
              aria-label={t('accessibility.openConversation', conversationName)}
            >
              {!temporaryUserStyle && (
                <div className="conversation-list-cell-left">
                  {isGroup && <GroupAvatar users={conversationParticipants} isLight />}
                  {!isGroup && !!conversationParticipants.length && (
                    <Avatar participant={conversationParticipants[0]} avatarSize={AVATAR_SIZE.SMALL} />
                  )}
                </div>
              )}
              <div
                className={cx('conversation-list-cell-center ', {
                  'conversation-list-cell-center-no-left': temporaryUserStyle,
                })}
              >
                <p className="conversation-list-cell-name">{conversationName}</p>

                {currentCallStatus && (
                  <p className="conversation-list-cell-description" data-uie-name={currentCallStatus.dataUieName}>
                    {currentCallStatus.text}
                  </p>
                )}
              </div>
            </div>

            <div className="conversation-list-cell-right">
              {(isConnecting || isOngoing) && (
                <button
                  className="call-ui__button call-ui__button--red"
                  onClick={() => callActions.leave(call)}
                  title={t('videoCallOverlayHangUp')}
                  type="button"
                  data-uie-name="do-call-controls-call-leave"
                >
                  <Icon.Hangup className="small-icon" style={{maxWidth: 17}} />
                </button>
              )}
            </div>
          </div>

          {classifiedDomains && <ClassifiedBar users={userEts} classifiedDomains={classifiedDomains} />}

          {!isDeclined && (
            <>
              <div className="conversation-list-calling-cell-controls">
                <ul className="conversation-list-calling-cell-controls-left"></ul>

                <ul className="conversation-list-calling-cell-controls-right">
                  {(isIncoming || isOutgoing) && (
                    <li className="conversation-list-calling-cell-controls-item">
                      <button
                        className="call-ui__button call-ui__button--red call-ui__button--large"
                        onClick={() => (isIncoming ? callActions.reject(call) : callActions.leave(call))}
                        title={t('videoCallOverlayHangUp')}
                        type="button"
                        data-uie-name="do-call-controls-call-decline"
                      >
                        <Icon.Hangup className="small-icon" style={{maxWidth: 17}} />
                      </button>
                    </li>
                  )}

                  {isIncoming && (
                    <li className="conversation-list-calling-cell-controls-item">
                      <button
                        className="call-ui__button call-ui__button--green call-ui__button--large"
                        onClick={() => {
                          callActions.answer(call);
                          setCurrentView(ViewType.LEFT_SIDEBAR);
                        }}
                        type="button"
                        title={t('callAccept')}
                        aria-label={t('callAccept')}
                        data-uie-name="do-call-controls-call-accept"
                      >
                        <Icon.Pickup className="small-icon" />
                      </button>
                    </li>
                  )}
                </ul>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
};

export {ConversationCallingCell};
