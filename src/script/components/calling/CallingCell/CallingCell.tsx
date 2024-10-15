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

import React, {useCallback, useEffect} from 'react';

import {TabIndex} from '@wireapp/react-ui-kit/lib/types/enums';
import {container} from 'tsyringe';

import {CALL_TYPE, REASON as CALL_REASON, STATE as CALL_STATE} from '@wireapp/avs';

import {callingContainer} from 'Components/calling/CallingCell/CallingCell.styles';
import {CallingControls} from 'Components/calling/CallingCell/CallingControls';
import {CallingHeader} from 'Components/calling/CallingCell/CallingHeader';
import {GroupVideoGrid} from 'Components/calling/GroupVideoGrid';
import {useCallAlertState} from 'Components/calling/useCallAlertState';
import * as Icon from 'Components/Icon';
import {ConversationClassifiedBar} from 'Components/input/ClassifiedBar';
import {usePushToTalk} from 'src/script/hooks/usePushToTalk/usePushToTalk';
import {useAppMainState, ViewType} from 'src/script/page/state';
import {useKoSubscribableChildren} from 'Util/ComponentUtil';
import {isEnterKey, isSpaceOrEnterKey} from 'Util/KeyboardUtil';
import {t} from 'Util/LocalizerUtil';

import type {Call} from '../../../calling/Call';
import type {CallingRepository} from '../../../calling/CallingRepository';
import {CallingViewMode, CallState, MuteState} from '../../../calling/CallState';
import type {Participant} from '../../../calling/Participant';
import {useVideoGrid} from '../../../calling/videoGridHandler';
import {generateConversationUrl} from '../../../router/routeGenerator';
import {TeamState} from '../../../team/TeamState';
import {CallActions, CallViewTab} from '../../../view_model/CallingViewModel';

interface VideoCallProps {
  hasAccessToCamera?: boolean;
  teamState?: TeamState;
}

interface AnsweringControlsProps {
  call: Call;
  callActions: CallActions;
  callingRepository: CallingRepository;
  pushToTalkKey: string | null;
  isFullUi?: boolean;
  callState?: CallState;
  classifiedDomains?: string[];
  isTemporaryUser?: boolean;
  setMaximizedParticipant?: (participant: Participant | null) => void;
}

export type CallingCellProps = VideoCallProps & AnsweringControlsProps;

export type CallLabel = {dataUieName: string; text: string};

export const CallingCell = ({
  classifiedDomains,
  isTemporaryUser,
  call,
  callActions,
  isFullUi = false,
  hasAccessToCamera,
  callingRepository,
  pushToTalkKey,
  setMaximizedParticipant,
  teamState = container.resolve(TeamState),
  callState = container.resolve(CallState),
}: CallingCellProps) => {
  const {conversation} = call;
  const {reason, state, isCbrEnabled, startedAt, maximizedParticipant, muteState} = useKoSubscribableChildren(call, [
    'reason',
    'state',
    'isCbrEnabled',
    'startedAt',
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
  } = useKoSubscribableChildren(conversation, ['isGroup', 'participating_user_ets', 'selfUser', 'display_name']);
  const {activeCallViewTab, viewMode} = useKoSubscribableChildren(callState, ['activeCallViewTab', 'viewMode']);

  const selfParticipant = call.getSelfParticipant();

  const {sharesCamera: selfSharesCamera, hasActiveVideo: selfHasActiveVideo} = useKoSubscribableChildren(
    selfParticipant,
    ['sharesCamera', 'hasActiveVideo'],
  );

  const {activeSpeakers} = useKoSubscribableChildren(call, ['activeSpeakers']);

  const isVideoCall = call.initialType === CALL_TYPE.VIDEO;
  const isDetachedWindow = viewMode === CallingViewMode.DETACHED_WINDOW;

  const isMuted = muteState !== MuteState.NOT_MUTED;
  const isCurrentlyMuted = useCallback(() => muteState === MuteState.SELF_MUTED, [muteState]);

  const isDeclined = !!reason && [CALL_REASON.STILL_ONGOING, CALL_REASON.ANSWERED_ELSEWHERE].includes(reason);

  const isOutgoing = state === CALL_STATE.OUTGOING;
  const isIncoming = state === CALL_STATE.INCOMING;
  const isConnecting = state === CALL_STATE.ANSWERED;
  const isOngoing = state === CALL_STATE.MEDIA_ESTAB;

  const callStatus: Partial<Record<CALL_STATE, CallLabel>> = {
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

  const showNoCameraPreview = !hasAccessToCamera && isVideoCall && !isOngoing;

  const videoGrid = useVideoGrid(call);

  const conversationParticipants = selfUser ? userEts.concat(selfUser) : userEts;
  const conversationUrl = generateConversationUrl(conversation.qualifiedId);

  const isOutgoingVideoCall = isOutgoing && selfSharesCamera;

  const toggleMute = useCallback(
    (shouldMute: boolean) => callActions.toggleMute(call, shouldMute),
    [call, callActions],
  );

  usePushToTalk({
    key: pushToTalkKey,
    toggleMute,
    isMuted: isCurrentlyMuted,
  });

  const handleMaximizeKeydown = useCallback(
    (event: React.KeyboardEvent<HTMLInputElement>) => {
      if (!isOngoing) {
        return;
      }
      if (isSpaceOrEnterKey(event.key)) {
        void callingRepository.setViewModeFullScreen();
      }
    },
    [isOngoing, callingRepository],
  );

  const handleMaximizeClick = useCallback(() => {
    if (!isOngoing) {
      return;
    }
    void callingRepository.setViewModeFullScreen();
  }, [isOngoing, callingRepository]);

  const {setCurrentView} = useAppMainState(state => state.responsiveView);
  const {showAlert, clearShowAlert} = useCallAlertState();

  const answerCall = () => {
    callActions.answer(call);
    setCurrentView(ViewType.MOBILE_LEFT_SIDEBAR);
  };

  const answerOrRejectCall = useCallback(
    (event: KeyboardEvent) => {
      const answerCallShortcut = !event.shiftKey && event.ctrlKey && isEnterKey(event);
      const hangUpCallShortcut = event.ctrlKey && event.shiftKey && isEnterKey(event);

      const removeEventListener = () => window.removeEventListener('keydown', answerOrRejectCall);

      if (answerCallShortcut || hangUpCallShortcut) {
        event.preventDefault();
        event.stopPropagation();
      }

      if (answerCallShortcut) {
        answerCall();
        removeEventListener();
      }

      if (hangUpCallShortcut) {
        callActions.reject(call);
        removeEventListener();
      }
    },
    [call, callActions],
  );

  useEffect(() => {
    if (isIncoming) {
      // Capture will be dispatched to registered element before being dispatched to any EventTarget beneath it in the DOM Tree.
      // It's needed because when someone is calling we need to change order of shortcuts to the top of keyboard usage.
      // If we didn't pass this prop other Event Listeners will be dispatched in same time.
      document.addEventListener('keydown', answerOrRejectCall, {capture: true});

      return () => {
        document.removeEventListener('keydown', answerOrRejectCall, {capture: true});
      };
    }

    return () => {
      clearShowAlert();
    };
  }, [answerOrRejectCall, isIncoming]);

  const call1To1StartedAlert = t(isOutgoingVideoCall ? 'startedVideoCallingAlert' : 'startedAudioCallingAlert', {
    conversationName,
    cameraStatus: t(selfSharesCamera ? 'cameraStatusOn' : 'cameraStatusOff'),
  });

  const onGoingCallAlert = t(isOutgoingVideoCall ? 'ongoingVideoCall' : 'ongoingAudioCall', {
    conversationName,
    cameraStatus: t(selfSharesCamera ? 'cameraStatusOn' : 'cameraStatusOff'),
  });

  const callGroupStartedAlert = t(isOutgoingVideoCall ? 'startedVideoGroupCallingAlert' : 'startedGroupCallingAlert', {
    conversationName,
    cameraStatus: t(selfSharesCamera ? 'cameraStatusOn' : 'cameraStatusOff'),
  });

  const onGoingGroupCallAlert = t(isOutgoingVideoCall ? 'ongoingGroupVideoCall' : 'ongoingGroupAudioCall', {
    conversationName,
    cameraStatus: t(selfSharesCamera ? 'cameraStatusOn' : 'cameraStatusOff'),
  });

  const toggleDetachedWindow = () => {
    if (isDetachedWindow) {
      void callingRepository.setViewModeMinimized();
      return;
    }
    void callingRepository.setViewModeDetached();
  };

  return (
    <div css={callingContainer}>
      {isIncoming && (
        <p role="alert" className="visually-hidden">
          {t('callConversationAcceptOrDecline', conversationName)}
        </p>
      )}

      {(!isDeclined || isTemporaryUser) && (
        <div
          className="conversation-list-calling-cell-background"
          data-uie-name="item-call"
          data-uie-id={conversation.id}
          data-uie-value={conversation.display_name()}
        >
          {muteState === MuteState.REMOTE_MUTED && isFullUi && (
            <div className="conversation-list-calling-cell__info-bar">{t('muteStateRemoteMute')}</div>
          )}

          <CallingHeader
            isGroup={isGroup}
            isOngoing={isOngoing}
            showAlert={showAlert}
            isVideoCall={isVideoCall}
            clearShowAlert={clearShowAlert}
            conversationUrl={conversationUrl}
            callStartedAlert={isGroup ? callGroupStartedAlert : call1To1StartedAlert}
            ongoingCallAlert={isGroup ? onGoingGroupCallAlert : onGoingCallAlert}
            isTemporaryUser={!!isTemporaryUser}
            conversationParticipants={conversationParticipants}
            conversationName={conversationName}
            currentCallStatus={currentCallStatus}
            startedAt={startedAt}
            isCbrEnabled={isCbrEnabled}
            toggleDetachedWindow={toggleDetachedWindow}
            isDetachedWindow={isDetachedWindow}
          />

          {(isOngoing || selfHasActiveVideo) && !isDetachedWindow && !!videoGrid?.grid?.length && isFullUi ? (
            <>
              {!isDetachedWindow && (
                <div
                  className="group-video__minimized-wrapper"
                  onClick={handleMaximizeClick}
                  onKeyDown={handleMaximizeKeydown}
                  role="button"
                  tabIndex={TabIndex.FOCUSABLE}
                  aria-label={t('callMaximizeLabel')}
                >
                  <GroupVideoGrid
                    grid={activeCallViewTab === CallViewTab.ALL ? videoGrid : {grid: activeSpeakers, thumbnail: null}}
                    minimized
                    maximizedParticipant={maximizedParticipant}
                    selfParticipant={selfParticipant}
                    setMaximizedParticipant={setMaximizedParticipant}
                  />

                  {isOngoing && (
                    <div className="group-video__minimized-wrapper__overlay" data-uie-name="do-maximize-call">
                      <Icon.FullscreenIcon />
                    </div>
                  )}
                </div>
              )}
            </>
          ) : (
            showNoCameraPreview &&
            isFullUi && (
              <div
                className="group-video__minimized-wrapper group-video__minimized-wrapper--no-camera-access"
                data-uie-name="label-no-camera-access-preview"
              >
                {t('callNoCameraAccess')}
              </div>
            )
          )}

          {classifiedDomains && (
            <ConversationClassifiedBar conversation={conversation} classifiedDomains={classifiedDomains} />
          )}

          <CallingControls
            answerCall={answerCall}
            call={call}
            callActions={callActions}
            call1To1StartedAlert={call1To1StartedAlert}
            isFullUi={isFullUi}
            isMuted={isMuted}
            isConnecting={isConnecting}
            isDetachedWindow={isDetachedWindow}
            isIncoming={isIncoming}
            isOutgoing={isOutgoing}
            isDeclined={isDeclined}
            isGroup={isGroup}
            isVideoCall={isVideoCall}
            isOngoing={isOngoing}
            selfParticipant={selfParticipant}
            disableScreenButton={!callingRepository.supportsScreenSharing}
            teamState={teamState}
            supportsVideoCall={conversation.supportsVideoCall(call.isConference)}
          />
        </div>
      )}
    </div>
  );
};
