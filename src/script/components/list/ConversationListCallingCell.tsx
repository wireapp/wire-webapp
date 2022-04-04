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

import React, {useState, useCallback} from 'react';
import {container} from 'tsyringe';
import {CALL_TYPE, CONV_TYPE, REASON as CALL_REASON, STATE as CALL_STATE} from '@wireapp/avs';
import cx from 'classnames';
import {DefaultConversationRoleName} from '@wireapp/api-client/src/conversation/';
import {KEY} from 'Util/KeyboardUtil';

import Avatar, {AVATAR_SIZE} from 'Components/Avatar';
import GroupAvatar from 'Components/avatar/GroupAvatar';
import GroupVideoGrid from 'Components/calling/GroupVideoGrid';
import Icon from 'Components/Icon';
import ParticipantItem from 'Components/list/ParticipantItem';
import Duration from 'Components/calling/Duration';
import {useKoSubscribableChildren} from 'Util/ComponentUtil';
import {t} from 'Util/LocalizerUtil';
import {sortUsersByPriority} from 'Util/StringUtil';
import useEffectRef from 'Util/useEffectRef';

import type {Call} from '../../calling/Call';
import type {CallingRepository} from '../../calling/CallingRepository';
import {useVideoGrid} from '../../calling/videoGridHandler';
import type {Conversation} from '../../entity/Conversation';
import type {Multitasking} from '../../notification/NotificationRepository';
import {generateConversationUrl} from '../../router/routeGenerator';
import {createNavigate, createNavigateKeyboard} from '../../router/routerBindings';
import {TeamState} from '../../team/TeamState';
import {CallState, MuteState} from '../../calling/CallState';
import {useFadingScrollbar} from '../../ui/fadingScrollbar';
import {CallActions, CallViewTab} from '../../view_model/CallingViewModel';
import {showContextMenu, ContextMenuEntry} from '../../ui/ContextMenu';
import type {ClientId, Participant, UserId} from '../../calling/Participant';
import ClassifiedBar from 'Components/input/ClassifiedBar';

export interface CallingCellProps {
  call: Call;
  callActions: CallActions;
  callingRepository: Pick<CallingRepository, 'supportsScreenSharing' | 'sendModeratorMute'>;
  callState?: CallState;
  classifiedDomains?: string[];
  conversation: Conversation;
  hasAccessToCamera: boolean;
  isSelfVerified: boolean;
  multitasking: Multitasking;
  teamState?: TeamState;
  temporaryUserStyle?: boolean;
}

const ConversationListCallingCell: React.FC<CallingCellProps> = ({
  conversation,
  classifiedDomains,
  temporaryUserStyle,
  call,
  callActions,
  multitasking,
  hasAccessToCamera,
  isSelfVerified,
  callingRepository,
  teamState = container.resolve(TeamState),
  callState = container.resolve(CallState),
}) => {
  const [scrollbarRef, setScrollbarRef] = useEffectRef<HTMLDivElement>();
  useFadingScrollbar(scrollbarRef);

  const {reason, state, isCbrEnabled, startedAt, participants, maximizedParticipant, muteState} =
    useKoSubscribableChildren(call, [
      'reason',
      'state',
      'isCbrEnabled',
      'startedAt',
      'participants',
      'maximizedParticipant',
      'pages',
      'currentPage',
      'muteState',
    ]);
  const {
    isGroup,
    participating_user_ets: userEts,
    selfUser,
    display_name: conversationName,
    roles,
  } = useKoSubscribableChildren(conversation, [
    'isGroup',
    'participating_user_ets',
    'selfUser',
    'display_name',
    'roles',
  ]);

  const {isMinimized} = useKoSubscribableChildren(multitasking, ['isMinimized']);
  const {isVideoCallingEnabled} = useKoSubscribableChildren(teamState, ['isVideoCallingEnabled']);

  const {activeCallViewTab} = useKoSubscribableChildren(callState, ['activeCallViewTab']);
  const isMuted = muteState !== MuteState.NOT_MUTED;

  const isStillOngoing = reason === CALL_REASON.STILL_ONGOING;
  const isDeclined = [CALL_REASON.STILL_ONGOING, CALL_REASON.ANSWERED_ELSEWHERE].includes(reason);

  const isOutgoing = state === CALL_STATE.OUTGOING;
  const isIncoming = state === CALL_STATE.INCOMING;
  const isConnecting = state === CALL_STATE.ANSWERED;
  const isOngoing = state === CALL_STATE.MEDIA_ESTAB;

  const showNoCameraPreview = !hasAccessToCamera && call.initialType === CALL_TYPE.VIDEO && !isOngoing;
  const showVideoButton = isVideoCallingEnabled && (call.initialType === CALL_TYPE.VIDEO || isOngoing);
  const showParticipantsButton = isOngoing && isGroup;

  const videoGrid = useVideoGrid(call);

  const conversationParticipants = conversation && userEts.concat([selfUser]);
  const conversationUrl = generateConversationUrl(conversation.id, conversation.domain);
  const selfParticipant = call?.getSelfParticipant();

  const {
    sharesScreen: selfSharesScreen,
    sharesCamera: selfSharesCamera,
    hasActiveVideo: selfHasActiveVideo,
  } = useKoSubscribableChildren(selfParticipant, ['sharesScreen', 'sharesCamera', 'hasActiveVideo']);

  const {activeSpeakers} = useKoSubscribableChildren(call, ['activeSpeakers']);

  const isOutgoingVideoCall = isOutgoing && selfSharesCamera;
  const isVideoUnsupported =
    !selfSharesCamera && !conversation?.supportsVideoCall(call.conversationType === CONV_TYPE.CONFERENCE);
  const disableVideoButton = isOutgoingVideoCall || isVideoUnsupported;
  const disableScreenButton = !callingRepository.supportsScreenSharing;

  const showJoinButton = conversation && isStillOngoing && temporaryUserStyle;
  const [showParticipants, setShowParticipants] = useState(false);
  const isModerator = roles[selfUser?.id] === DefaultConversationRoleName.WIRE_ADMIN;

  const getParticipantContext = (event: React.MouseEvent<HTMLDivElement>, participant: Participant) => {
    event.preventDefault();

    const muteParticipant = {
      click: () =>
        callingRepository.sendModeratorMute(conversation.qualifiedId, {[participant.user.id]: [participant.clientId]}),
      icon: 'mic-off-icon',
      identifier: `moderator-mute-participant`,
      isDisabled: participant.isMuted(),
      label: t('moderatorMenuEntryMute'),
    };

    const muteOthers: ContextMenuEntry = {
      click: () => {
        const recipients = participants
          .filter(p => p !== participant)
          .reduce((acc, {user, clientId}) => {
            acc[user.id] = [...(acc[user.id] || []), clientId];
            return acc;
          }, {} as Record<UserId, ClientId[]>);
        callingRepository.sendModeratorMute(conversation.qualifiedId, recipients);
      },
      icon: 'mic-off-icon',
      identifier: 'moderator-mute-others',
      label: t('moderatorMenuEntryMuteAllOthers'),
    };

    const entries: ContextMenuEntry[] = [!participant.user.isMe && muteParticipant, muteOthers].filter(Boolean);
    showContextMenu(event.nativeEvent, entries, 'participant-moderator-menu');
  };

  const handleMinimizedKeydown = useCallback(
    (event: React.KeyboardEvent<HTMLInputElement>) => {
      if (!isOngoing) {
        return;
      }
      if (event.key === KEY.ENTER || event.key === KEY.SPACE) {
        multitasking.isMinimized(false);
      }
    },
    [isOngoing, multitasking],
  );

  const handleMinimizedClick = useCallback(() => {
    if (!isOngoing) {
      return;
    }
    multitasking.isMinimized(false);
  }, [isOngoing, multitasking]);

  return (
    <div className="conversation-calling-cell">
      {showJoinButton && (
        <button
          className="call-ui__button call-ui__button--green call-ui__button--join"
          style={{margin: '40px 16px 0px 16px'}}
          onClick={() => callActions.answer(call)}
          type="button"
          data-uie-name="do-call-controls-call-join"
        >
          {t('callJoin')}
        </button>
      )}
      {conversation && !isDeclined && (
        <div
          className="conversation-list-calling-cell-background"
          data-uie-name="item-call"
          data-uie-id={conversation.id}
          data-uie-value={conversation.display_name()}
        >
          {muteState === MuteState.REMOTE_MUTED && (
            <div className="conversation-list-calling-cell__info-bar">{t('muteStateRemoteMute')}</div>
          )}
          <div className="conversation-list-calling-cell conversation-list-cell">
            <div
              className="conversation-list-cell conversation-list-cell-button"
              onClick={createNavigate(conversationUrl)}
              onKeyDown={createNavigateKeyboard(conversationUrl)}
              tabIndex={0}
              role="button"
              aria-label={`${t('callGoToLabel')} ${conversationName}`}
            >
              {!temporaryUserStyle && (
                <div className="conversation-list-cell-left">
                  {isGroup && <GroupAvatar users={conversationParticipants} isLight={true} />}
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
                {isOngoing && startedAt && (
                  <div className="conversation-list-info-wrapper">
                    <span
                      className="conversation-list-cell-description"
                      data-uie-name="call-duration"
                      aria-label={t('callDurationLabel')}
                    >
                      <Duration {...{startedAt}} />
                    </span>
                    {isCbrEnabled && (
                      <span className="conversation-list-cell-description" data-uie-name="call-cbr">
                        {t('callStateCbr')}
                      </span>
                    )}
                  </div>
                )}
              </div>
            </div>
            <div className="conversation-list-cell-right">
              {isConnecting ||
                (isOngoing && (
                  <button
                    className="call-ui__button call-ui__button--red"
                    onClick={() => callActions.leave(call)}
                    title={t('videoCallOverlayHangUp')}
                    type="button"
                    data-uie-name="do-call-controls-call-leave"
                  >
                    <Icon.Hangup className="small-icon" style={{maxWidth: 17}} />
                  </button>
                ))}
            </div>
          </div>
          {(isOngoing || selfHasActiveVideo) && isMinimized && !!videoGrid?.grid?.length ? (
            <div
              className="group-video__minimized-wrapper"
              onClick={handleMinimizedClick}
              onKeyDown={handleMinimizedKeydown}
              role="button"
              tabIndex={0}
              aria-label={t('callMaximizeLabel')}
            >
              <GroupVideoGrid
                grid={activeCallViewTab === CallViewTab.ALL ? videoGrid : {grid: activeSpeakers, thumbnail: null}}
                minimized
                maximizedParticipant={maximizedParticipant}
                selfParticipant={selfParticipant}
              />
              {isOngoing && (
                <div className="group-video__minimized-wrapper__overlay" data-uie-name="do-maximize-call">
                  <Icon.Fullscreen />
                </div>
              )}
            </div>
          ) : (
            showNoCameraPreview && (
              <div
                className="group-video__minimized-wrapper group-video__minimized-wrapper--no-camera-access"
                data-uie-name="label-no-camera-access-preview"
              >
                {t('callNoCameraAccess')}
              </div>
            )
          )}

          {classifiedDomains && <ClassifiedBar users={userEts} classifiedDomains={classifiedDomains} />}

          {!isDeclined && (
            <>
              <div className="conversation-list-calling-cell-controls">
                <ul className="conversation-list-calling-cell-controls-left">
                  <li className="conversation-list-calling-cell-controls-item">
                    <button
                      className={cx('call-ui__button', {'call-ui__button--active': !isMuted})}
                      onClick={() => callActions.toggleMute(call, !isMuted)}
                      data-uie-name="do-toggle-mute"
                      data-uie-value={isMuted ? 'active' : 'inactive'}
                      title={t('videoCallOverlayMicrophone')}
                      type="button"
                      disabled={isConnecting}
                    >
                      {isMuted ? <Icon.MicOff className="small-icon" /> : <Icon.MicOn className="small-icon" />}
                    </button>
                  </li>
                  {showVideoButton && (
                    <li className="conversation-list-calling-cell-controls-item">
                      <button
                        className={cx('call-ui__button', {'call-ui__button--active': selfSharesCamera})}
                        onClick={() => callActions.toggleCamera(call)}
                        disabled={disableVideoButton}
                        data-uie-name="do-toggle-video"
                        title={t('videoCallOverlayCamera')}
                        type="button"
                        data-uie-value={selfSharesCamera ? 'active' : 'inactive'}
                      >
                        {selfSharesCamera ? (
                          <Icon.Camera className="small-icon" />
                        ) : (
                          <Icon.CameraOff className="small-icon" />
                        )}
                      </button>
                    </li>
                  )}
                  {isOngoing && (
                    <li className="conversation-list-calling-cell-controls-item">
                      <button
                        className={cx('call-ui__button', {
                          'call-ui__button--active': selfSharesScreen,
                          'call-ui__button--disabled': disableScreenButton,
                          'with-tooltip with-tooltip--bottom': disableScreenButton,
                        })}
                        data-tooltip={disableScreenButton ? t('videoCallScreenShareNotSupported') : undefined}
                        onClick={() => callActions.toggleScreenshare(call)}
                        type="button"
                        data-uie-name="do-call-controls-toggle-screenshare"
                        data-uie-value={selfSharesScreen ? 'active' : 'inactive'}
                        data-uie-enabled={disableScreenButton ? 'false' : 'true'}
                        title={t('videoCallOverlayShareScreen')}
                      >
                        {selfSharesScreen ? (
                          <Icon.Screenshare className="small-icon" />
                        ) : (
                          <Icon.ScreenshareOff className="small-icon" />
                        )}
                      </button>
                    </li>
                  )}
                </ul>

                <ul className="conversation-list-calling-cell-controls-right">
                  {showParticipantsButton && (
                    <li className="conversation-list-calling-cell-controls-item">
                      <button
                        className={cx('call-ui__button call-ui__button--participants', {
                          'call-ui__button--active': showParticipants,
                        })}
                        onClick={() => setShowParticipants(current => !showParticipants)}
                        type="button"
                        data-uie-name="do-toggle-participants"
                        aria-pressed={showParticipants}
                      >
                        <span>{t('callParticipants', participants.length)}</span>
                        <Icon.Chevron className="chevron" />
                      </button>
                    </li>
                  )}
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
                        onClick={() => callActions.answer(call)}
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
              <div
                className={cx('call-ui__participant-list__wrapper', {
                  'call-ui__participant-list__wrapper--active': showParticipants,
                })}
              >
                <div ref={setScrollbarRef} className="call-ui__participant-list__container">
                  <ul className="call-ui__participant-list" data-uie-name="list-call-ui-participants">
                    {participants
                      .slice()
                      .sort((participantA, participantB) => sortUsersByPriority(participantA.user, participantB.user))
                      .map(participant => (
                        <li key={participant.clientId}>
                          <ParticipantItem
                            key={participant.clientId}
                            participant={participant.user}
                            hideInfo
                            noUnderline
                            callParticipant={participant}
                            selfInTeam={selfUser?.inTeam()}
                            isSelfVerified={isSelfVerified}
                            external={teamState.isExternal(participant.user.id)}
                            onContextMenu={isModerator ? event => getParticipantContext(event, participant) : undefined}
                            showDropdown={isModerator}
                          />
                        </li>
                      ))}
                  </ul>
                </div>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
};

export default ConversationListCallingCell;
