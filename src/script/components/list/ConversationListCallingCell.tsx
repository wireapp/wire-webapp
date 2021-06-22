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
import {CALL_TYPE, CONV_TYPE, REASON as CALL_REASON, STATE as CALL_STATE} from '@wireapp/avs';
import cx from 'classnames';
import {container} from 'tsyringe';

import {registerReactComponent, useKoSubscribableChildren} from 'Util/ComponentUtil';
import {t} from 'Util/LocalizerUtil';
import {formatSeconds} from 'Util/TimeUtil';
import useEffectRef from 'Util/useEffectRef';
import {sortUsersByPriority} from 'Util/StringUtil';
import Avatar, {AVATAR_SIZE} from 'Components/Avatar';
import GroupAvatar from 'Components/avatar/GroupAvatar';
import Icon from 'Components/Icon';
import GroupVideoGrid from 'Components/calling/GroupVideoGrid';
import ParticipantItem from 'Components/list/ParticipantItem';

import {generateConversationUrl} from '../../router/routeGenerator';

import type {Call} from '../../calling/Call';
import type {CallingRepository} from '../../calling/CallingRepository';
import type {Grid} from '../../calling/videoGridHandler';
import type {Conversation} from '../../entity/Conversation';
import {CallActions, VideoSpeakersTab} from '../../view_model/CallingViewModel';
import type {Multitasking} from '../../notification/NotificationRepository';
import {Participant} from '../../calling/Participant';
import {createNavigate} from '../../router/routerBindings';
import {CallState} from '../../calling/CallState';
import {useFadingScrollbar} from '../../ui/fadingScrollbar';
import {TeamState} from '../../team/TeamState';

export interface CallingCellProps {
  call: Call;
  callActions: CallActions;
  callingRepository: CallingRepository;
  callState?: CallState;
  conversation: Conversation;
  hasAccessToCamera: boolean;
  isSelfVerified: boolean;
  multitasking: Multitasking;
  teamState?: TeamState;
  temporaryUserStyle?: boolean;
  videoGrid: Grid;
}

export const ConversationListCallingCell: React.FC<CallingCellProps> = ({
  conversation,
  temporaryUserStyle,
  call,
  callActions,
  multitasking,
  videoGrid,
  hasAccessToCamera,
  isSelfVerified,
  callingRepository,
  teamState = container.resolve(TeamState),
  callState = container.resolve(CallState),
}) => {
  const [scrollbarRef, setScrollbarRef] = useEffectRef<HTMLDivElement>();
  useFadingScrollbar(scrollbarRef);

  const {reason, state, isCbrEnabled, startedAt, participants, maximizedParticipant} = useKoSubscribableChildren(call, [
    'reason',
    'state',
    'isCbrEnabled',
    'startedAt',
    'participants',
    'maximizedParticipant',
  ]);
  const {
    isGroup,
    participating_user_ets: userEts,
    selfUser,
    display_name: conversationName,
  } = useKoSubscribableChildren(conversation, ['isGroup', 'participating_user_ets', 'selfUser', 'display_name']);

  const {isMinimized} = useKoSubscribableChildren(multitasking, ['isMinimized']);

  const {isMuted, videoSpeakersActiveTab} = useKoSubscribableChildren(callState, ['isMuted', 'videoSpeakersActiveTab']);

  const isStillOngoing = reason === CALL_REASON.STILL_ONGOING;
  const isDeclined = [CALL_REASON.STILL_ONGOING, CALL_REASON.ANSWERED_ELSEWHERE].includes(reason);

  const isOutgoing = state === CALL_STATE.OUTGOING;
  const isIncoming = state === CALL_STATE.INCOMING;
  const isConnecting = state === CALL_STATE.ANSWERED;
  const isOngoing = state === CALL_STATE.MEDIA_ESTAB;

  const showNoCameraPreview = !hasAccessToCamera && call.initialType === CALL_TYPE.VIDEO && !isOngoing;
  const showVideoButton = call.initialType === CALL_TYPE.VIDEO || isOngoing;
  const showParticipantsButton = isOngoing && isGroup;

  const conversationParticipants = conversation && userEts.concat([selfUser]);
  const conversationUrl = generateConversationUrl(conversation.id);
  const selfParticipant = call?.getSelfParticipant();

  const {sharesScreen: selfSharesScreen, sharesCamera: selfSharesCamera} = useKoSubscribableChildren(selfParticipant, [
    'sharesScreen',
    'sharesCamera',
  ]);

  const isOutgoingVideoCall = isOutgoing && selfSharesCamera;
  const isVideoUnsupported =
    !selfSharesCamera && !conversation?.supportsVideoCall(call.conversationType === CONV_TYPE.CONFERENCE);
  const disableVideoButton = isOutgoingVideoCall || isVideoUnsupported;
  const disableScreenButton = !callingRepository.supportsScreenSharing;

  const showJoinButton = conversation && isStillOngoing && temporaryUserStyle;
  const [showParticipants, setShowParticipants] = useState(false);

  const [callDuration, setCallDuration] = useState('');

  useEffect(() => {
    let intervalId: number;
    if (isOngoing && startedAt) {
      const updateTimer = () => {
        const time = Math.floor((Date.now() - startedAt) / 1000);
        setCallDuration(formatSeconds(time));
      };
      updateTimer();
      intervalId = window.setInterval(updateTimer, 1000);
    }
    return () => clearInterval(intervalId);
  }, [startedAt, isOngoing]);

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
        <div className="conversation-list-calling-cell-background">
          <div className="conversation-list-calling-cell conversation-list-cell">
            {!temporaryUserStyle && (
              <div className="conversation-list-cell-left" onClick={createNavigate(conversationUrl)}>
                {isGroup && <GroupAvatar users={conversationParticipants} isLight={true} />}
                {!isGroup && conversationParticipants.length && (
                  <Avatar participant={conversationParticipants[0]} avatarSize={AVATAR_SIZE.SMALL} />
                )}
              </div>
            )}
            <div
              className={cx('conversation-list-cell-center', {
                'conversation-list-cell-center-no-left': temporaryUserStyle,
              })}
              onClick={createNavigate(conversationUrl)}
            >
              <span className="conversation-list-cell-name">{conversationName}</span>

              {isIncoming && (
                <span className="conversation-list-cell-description" data-uie-name="call-label-incoming">
                  {t('callStateIncoming')}
                </span>
              )}
              {isOutgoing && (
                <span className="conversation-list-cell-description" data-uie-name="call-label-outgoing">
                  {t('callStateOutgoing')}
                </span>
              )}
              {isConnecting && (
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
                    <span className="conversation-list-cell-description" data-uie-name="call-cbr">
                      {t('callStateCbr')}
                    </span>
                  )}
                </div>
              )}
            </div>
            <div className="conversation-list-cell-right">
              {isConnecting ||
                (isOngoing && (
                  <div
                    className="call-ui__button call-ui__button--red"
                    onClick={() => callActions.leave(call)}
                    title={t('videoCallOverlayHangUp')}
                    data-uie-name="do-call-controls-call-leave"
                  >
                    <Icon.Hangup className="small-icon" style={{maxWidth: 17}} />
                  </div>
                ))}
            </div>
          </div>
          {isOngoing && isMinimized && (
            <div className="group-video__minimized-wrapper" onClick={() => multitasking.isMinimized(false)}>
              <GroupVideoGrid
                grid={
                  videoSpeakersActiveTab === VideoSpeakersTab.ALL
                    ? videoGrid
                    : {grid: call.getActiveSpeakers(), thumbnail: null}
                }
                minimized
                maximizedParticipant={maximizedParticipant}
                selfParticipant={selfParticipant}
              />
              <div className="group-video__minimized-wrapper__overlay" data-uie-name="do-maximize-call">
                <Icon.Fullscreen />
              </div>
            </div>
          )}

          {showNoCameraPreview && (
            <div
              className="group-video__minimized-wrapper group-video__minimized-wrapper--no-camera-access"
              data-uie-name="label-no-camera-access-preview"
            >
              {t('callNoCameraAccess')}
            </div>
          )}

          {!isDeclined && (
            <>
              <div className="conversation-list-calling-cell-controls">
                <div className="conversation-list-calling-cell-controls-left">
                  <button
                    className={cx('call-ui__button', {'call-ui__button--active': isMuted})}
                    onClick={() => callActions.toggleMute(call, !isMuted)}
                    data-uie-name="do-toggle-mute"
                    data-uie-value={isMuted ? 'active' : 'inactive'}
                    title={t('videoCallOverlayMute')}
                  >
                    <Icon.MicOff className="small-icon" />
                  </button>
                  {showVideoButton && (
                    <button
                      className={cx('call-ui__button', {'call-ui__button--active': selfSharesCamera})}
                      onClick={() => callActions.toggleCamera(call)}
                      disabled={disableVideoButton}
                      data-uie-name="do-toggle-video"
                      title={t('videoCallOverlayVideo')}
                      data-uie-value={selfSharesCamera ? 'active' : 'inactive'}
                    >
                      <Icon.Camera className="small-icon" />
                    </button>
                  )}
                  {isOngoing && (
                    <div
                      className={cx('call-ui__button', {
                        'call-ui__button--active': selfSharesScreen,
                        'call-ui__button--disabled': disableScreenButton,
                        'with-tooltip with-tooltip--bottom': disableScreenButton,
                      })}
                      data-tooltip={disableScreenButton ? t('videoCallScreenShareNotSupported') : undefined}
                      onClick={() => callActions.toggleScreenshare(call)}
                      data-uie-name="do-call-controls-toggle-screenshare"
                      data-uie-value={selfSharesScreen ? 'active' : 'inactive'}
                      data-uie-enabled={disableScreenButton ? 'false' : 'true'}
                      title={t('videoCallOverlayShareScreen')}
                    >
                      <Icon.Screenshare className="small-icon" />
                    </div>
                  )}
                </div>

                <div className="conversation-list-calling-cell-controls-right">
                  {showParticipantsButton && (
                    <div
                      className={cx('call-ui__button call-ui__button--participants', {
                        'call-ui__button--active': showParticipants,
                      })}
                      onClick={() => setShowParticipants(current => !showParticipants)}
                      data-uie-name="do-toggle-participants"
                    >
                      <span>{t('callParticipants', participants.length)}</span>
                      <Icon.Chevron className="chevron" />
                    </div>
                  )}
                  {(isIncoming || isOutgoing) && (
                    <div
                      className="call-ui__button call-ui__button--red call-ui__button--large"
                      onClick={() => (isIncoming ? callActions.reject(call) : callActions.leave(call))}
                      title={t('videoCallOverlayHangUp')}
                      data-uie-name="do-call-controls-call-decline"
                    >
                      <Icon.Hangup className="small-icon" style={{maxWidth: 17}} />
                    </div>
                  )}
                  {isIncoming && (
                    <div
                      className="call-ui__button call-ui__button--green call-ui__button--large"
                      onClick={() => callActions.answer(call)}
                      data-uie-name="do-call-controls-call-accept"
                    >
                      <Icon.Pickup className="small-icon" />
                    </div>
                  )}
                </div>
              </div>
              <div
                className={cx('call-ui__participant-list__wrapper', {
                  'call-ui__participant-list__wrapper--active': showParticipants,
                })}
              >
                <div
                  className="call-ui__participant-list"
                  ref={setScrollbarRef}
                  data-uie-name="list-call-ui-participants"
                >
                  {(participants as Participant[])
                    .slice()
                    .sort((participantA, participantB) => sortUsersByPriority(participantA.user, participantB.user))
                    .map(participant => (
                      <ParticipantItem
                        key={participant.clientId}
                        participant={participant.user}
                        hideInfo
                        noUnderline
                        callParticipant={participant}
                        selfInTeam={selfUser?.inTeam()}
                        isSelfVerified={isSelfVerified}
                        external={teamState.isExternal(participant.user.id)}
                      />
                    ))}
                </div>
              </div>
            </>
          )}
        </div>
      )}
    </>
  );
};

registerReactComponent('conversation-list-calling-cell', {
  component: ConversationListCallingCell,
  template: `<div data-bind="react: {
    call, 
    callActions, 
    callingRepository, 
    conversation: ko.unwrap(conversation), 
    hasAccessToCamera: ko.unwrap(hasAccessToCamera), 
    isSelfVerified: ko.unwrap(isSelfVerified), 
    multitasking,
    temporaryUserStyle,
    videoGrid: ko.unwrap(videoGrid)
  }"></div>
    `,
});
