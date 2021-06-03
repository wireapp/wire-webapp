/*
 * Wire
 * Copyright (C) 2018 Wire Swiss GmbH
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

import React, {useEffect, useState} from 'react';
import {registerReactComponent, useKoSubscribableChildren} from 'Util/ComponentUtil';

import {REASON as CALL_REASON, STATE as CALL_STATE} from '@wireapp/avs';

import Avatar, {AVATAR_SIZE} from 'Components/Avatar';
import {t} from 'Util/LocalizerUtil';
import {formatSeconds} from 'Util/TimeUtil';

import {generateConversationUrl} from '../../router/routeGenerator';

import 'Components/calling/FullscreenVideoCall.tsx';
import 'Components/calling/GroupVideoGrid';
import 'Components/list/ParticipantItem';
import type {Call} from '../../calling/Call';
import type {CallingRepository} from '../../calling/CallingRepository';
import type {Grid} from '../../calling/videoGridHandler';
import type {Conversation} from '../../entity/Conversation';
import {CallActions} from '../../view_model/CallingViewModel';
import type {Multitasking} from '../../notification/NotificationRepository';
import type {TeamRepository} from '../../team/TeamRepository';
import {Participant} from '../../calling/Participant';
import GroupAvatar from 'Components/avatar/GroupAvatar';
import {createNavigate} from 'src/script/router/routerBindings';

interface CallingCellProps {
  call: Call;
  callActions: CallActions;
  callingRepository: CallingRepository;
  conversation: Conversation;
  hasAccessToCamera: boolean;
  isSelfVerified: boolean;
  maximizedTileVideoParticipant: Participant;
  multitasking: Multitasking;
  teamRepository: TeamRepository;
  temporaryUserStyle?: boolean;
  videoGrid: Grid;
  videoSpeakersActiveTab: string;
}

const ConversationListCallingCell: React.FC<CallingCellProps> = ({
  conversation,
  temporaryUserStyle,
  call,
  callActions,
}) => {
  const {reason, state, isCbrEnabled, startedAt} = useKoSubscribableChildren(call, [
    'reason',
    'state',
    'isCbrEnabled',
    'startedAt',
  ]);
  const {
    isGroup,
    participating_user_ets: userEts,
    selfUser,
  } = useKoSubscribableChildren(conversation, ['isGroup', 'participating_user_ets', 'selfUser']);

  const isStillOngoing = reason === CALL_REASON.STILL_ONGOING;
  const isDeclined = [CALL_REASON.STILL_ONGOING, CALL_REASON.ANSWERED_ELSEWHERE].includes(reason);

  const conversationParticipants = conversation && userEts.concat([selfUser]);
  const conversationUrl = generateConversationUrl(conversation.id);

  const showJoinButton = conversation && isStillOngoing && temporaryUserStyle;

  const [callDuration, setCallDuration] = useState('');

  useEffect(() => {
    let intervalId;

    if (startedAt) {
      const updateTimer = () => {
        const time = Math.floor((Date.now() - startedAt) / 1000);
        setCallDuration(formatSeconds(time));
      };
      updateTimer();
      intervalId = window.setInterval(updateTimer, 1000);
    }
    return clearInterval(intervalId);
  }, [startedAt]);

  return (
    <>
      {showJoinButton && (
        <div
          className="call-ui__button call-ui__button--green call-ui__button--join"
          style={{margin: '40px 16px 0px 16px'}}
          onClick={() => callActions.answer(call)}
          data-uie-name="do-call-controls-call-join"
        >
          {t('callJoin')}
        </div>
      )}
      {conversation && !isDeclined && (
        <div className="conversation-list-calling-cell conversation-list-cell">
          {!temporaryUserStyle && (
            <div className="conversation-list-cell-left" onClick={createNavigate(conversationUrl)}>
              {isGroup && <GroupAvatar users={conversationParticipants} isLight={true} />}
              {!isGroup && conversationParticipants.length && (
                <Avatar participant={conversationParticipants[0]} avatarSize={AVATAR_SIZE.SMALL} />
              )}
            </div>
          )}
        </div>
      )}
      <div
        className="conversation-list-cell-center"
        data-bind="link_to: conversationUrl, css: {'conversation-list-cell-center-no-left': temporaryUserStyle}"
      >
        <span className="conversation-list-cell-name" data-bind="text: conversation().display_name()"></span>

        {state === CALL_STATE.INCOMING &&
          (isGroup ? (
            <span className="conversation-list-cell-description" data-uie-name="call-label-incoming">
              {t('callStateIncomingGroup' /*call.creatingUser.name()*/)}
            </span>
          ) : (
            <span className="conversation-list-cell-description" data-uie-name="call-label-incoming">
              {t('callStateIncoming')}
            </span>
          ))}
        {state === CALL_STATE.OUTGOING && (
          <span className="conversation-list-cell-description" data-uie-name="call-label-outgoing">
            {t('callStateOutgoing')}
          </span>
        )}
        {state === CALL_STATE.ANSWERED && (
          <span className="conversation-list-cell-description" data-uie-name="call-label-connecting">
            {t('callStateConnecting')}
          </span>
        )}
        {callDuration && (
          <div className="conversation-list-info-wrapper">
            <span className="conversation-list-cell-description" data-uie-name="call-duration">
              {callDuration}
            </span>
            {isCbrEnabled && (
              <span
                className="conversation-list-cell-description"
                data-bind="text: t('callStateCbr')"
                data-uie-name="call-cbr"
              ></span>
            )}
          </div>
        )}
      </div>
    </>
  );
};

registerReactComponent('conversation-list-calling-cell', {
  bindings: `
    call, 
    callActions, 
    callingRepository, 
    conversation: ko.unwrap(conversation), 
    hasAccessToCamera: ko.unwrap(hasAccessToCamera), 
    isSelfVerified: ko.unwrap(isSelfVerified), 
    maximizedTileVideoParticipant: ko.unwrap(maximizedTileVideoParticipant)'
    multitasking,
    teamRepository,
    temporaryUserStyle,
    videoGrid: ko.unwrap(videoGrid),
    videoSpeakersActiveTab: ko.unwrap(videoSpeakersActiveTab)
    `,
  component: ConversationListCallingCell,
  optionalParams: ['temporaryUserStyle'],
});
