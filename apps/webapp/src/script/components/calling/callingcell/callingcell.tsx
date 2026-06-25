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

import React, {useCallback, useEffect, useRef} from 'react';

import {container} from 'tsyringe';

import {CALL_TYPE, REASON as CALL_REASON, STATE as CALL_STATE} from '@wireapp/avs';
import {TabIndex} from '@wireapp/react-ui-kit';
import {WebAppEvents} from '@wireapp/webapp-events';

import {useAppNotification} from 'Components/appnotification';
import {callingContainer} from 'Components/calling/callingcell/callingcell.styles';
import {CallingControls} from 'Components/calling/callingcell/callingcontrols';
import {CallingHeader} from 'Components/calling/callingcell/callingheader';
import {GroupVideoGrid} from 'Components/calling/groupvideogrid';
import {useCallAlertState} from 'Components/calling/usecallalertstate';
import {ConversationClassifiedBar} from 'Components/classifiedbar/classifiedbar';
import * as Icon from 'Components/icon';
import {useConversationCall} from 'Hooks/useconversationcall';
import {useNoInternetCallGuard} from 'Hooks/usenointernetcallguard/usenointernetcallguard';
import type {Call} from 'Repositories/calling/call';
import type {CallingRepository} from 'Repositories/calling/callingrepository';
import {CallingViewMode, CallState, MuteState} from 'Repositories/calling/callstate';
import type {Participant} from 'Repositories/calling/participant';
import {useVideoGrid} from 'Repositories/calling/videogridhandler';
import {PropertiesRepository} from 'Repositories/properties/propertiesrepository';
import {PROPERTIES_TYPE} from 'Repositories/properties/propertiestype';
import {TeamState} from 'Repositories/team/teamstate';
import {Config} from 'src/script/config';
import {useUserPropertyValue} from 'src/script/hooks/useuserproperty';
import {useApplicationContext} from 'src/script/page/rootProvider';
import {useAppMainState, ViewType} from 'src/script/page/state';
import {useKoSubscribableChildren} from 'Util/componentUtil';
import {isEnterKey, isSpaceOrEnterKey} from 'Util/keyboardUtil';

import {usePressSpaceToUnmute} from './usepressspacetounmute/usepressspacetounmute';

import {generateConversationUrl} from '../../../router/routeGenerator';
import {CallActions, CallViewTab} from '../../../viewModel/callingviewmodel';

interface VideoCallProps {
  hasAccessToCamera?: boolean;
  teamState?: TeamState;
}

interface AnsweringControlsProps {
  call: Call;
  callActions: CallActions;
  callingRepository: CallingRepository;
  propertiesRepository: PropertiesRepository;
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
  propertiesRepository,
  setMaximizedParticipant,
  teamState = container.resolve(TeamState),
  callState = container.resolve(CallState),
}: CallingCellProps) => {
  const {fireAndForgetInvoker, translate} = useApplicationContext();
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
    isGroupOrChannel,
    isChannel,
    participating_user_ets: userEts,
    selfUser,
    display_name: conversationName,
  } = useKoSubscribableChildren(conversation, [
    'isGroupOrChannel',
    'isChannel',
    'participating_user_ets',
    'selfUser',
    'display_name',
  ]);
  const {activeCallViewTab, viewMode} = useKoSubscribableChildren(callState, ['activeCallViewTab', 'viewMode']);

  const guardCall = useNoInternetCallGuard({
    description: translate('callNotEstablishedDescription'),
    descriptionPoints: [
      translate('callNotEstablishedDescriptionPoint1'),
      translate('callNotEstablishedDescriptionPoint2'),
      translate('callNotEstablishedDescriptionPoint3'),
    ],
    title: translate('callNotEstablishedTitle'),
    translate,
  });
  const {isCallConnecting} = useConversationCall(conversation);

  // Ref for immediate synchronous protection from multiple clicks
  const isAnsweringRef = useRef(false);

  const selfParticipant = call.getSelfParticipant();

  const {sharesCamera: selfSharesCamera, hasActiveVideo: selfHasActiveVideo} = useKoSubscribableChildren(
    selfParticipant,
    ['sharesCamera', 'hasActiveVideo'],
  );

  const {activeSpeakers} = useKoSubscribableChildren(call, ['activeSpeakers']);

  const isVideoCall = call.initialType === CALL_TYPE.VIDEO;
  const isDetachedWindow = viewMode === CallingViewMode.DETACHED_WINDOW;
  const isFullScreen = viewMode === CallingViewMode.FULL_SCREEN;

  const isMuted = muteState !== MuteState.NOT_MUTED;
  const isCurrentlyMuted = useCallback(() => muteState === MuteState.SELF_MUTED, [muteState]);

  const isDeclined =
    reason !== undefined &&
    reason !== null &&
    [CALL_REASON.STILL_ONGOING, CALL_REASON.ANSWERED_ELSEWHERE].includes(reason);

  const isOutgoing = state === CALL_STATE.OUTGOING;
  const isIncoming = state === CALL_STATE.INCOMING;
  const isConnecting = state === CALL_STATE.ANSWERED;
  const isOngoing = state === CALL_STATE.MEDIA_ESTAB;

  // Reset local state when call state changes from incoming
  if (isAnsweringRef.current && !isIncoming) {
    isAnsweringRef.current = false;
  }

  // Button is disabled if either local state or call state indicates answering
  const isAnswerButtonDisabled = isAnsweringRef.current || isCallConnecting;

  const callStatus: Partial<Record<CALL_STATE, CallLabel>> = {
    [CALL_STATE.OUTGOING]: {
      dataUieName: 'call-label-outgoing',
      text: translate('callStateOutgoing'),
    },
    [CALL_STATE.INCOMING]: {
      dataUieName: 'call-label-incoming',
      text: translate('callStateIncoming'),
    },
    [CALL_STATE.ANSWERED]: {
      dataUieName: 'call-label-connecting',
      text: translate('callStateConnecting'),
    },
  };

  const currentCallStatus = callStatus[state];

  const showNoCameraPreview = hasAccessToCamera !== true && isVideoCall && !isOngoing;

  const videoGrid = useVideoGrid(call);

  const conversationParticipants = selfUser ? userEts.concat(selfUser) : userEts;
  const conversationUrl = generateConversationUrl(conversation.qualifiedId);

  const isOutgoingVideoCall = isOutgoing && selfSharesCamera;

  const toggleMute = useCallback(
    (shouldMute: boolean) => callActions.toggleMute(call, shouldMute),
    [call, callActions],
  );

  const isPressSpaceToUnmutePreferenceEnabled =
    useUserPropertyValue(
      () => propertiesRepository.getPreference(PROPERTIES_TYPE.CALL.ENABLE_PRESS_SPACE_TO_UNMUTE),
      WebAppEvents.PROPERTIES.UPDATE.CALL.ENABLE_PRESS_SPACE_TO_UNMUTE,
    ) === true;
  const isPressSpaceToUnmuteEnabled =
    isPressSpaceToUnmutePreferenceEnabled && Config.getConfig().FEATURE.ENABLE_PRESS_SPACE_TO_UNMUTE;

  usePressSpaceToUnmute({
    callState,
    toggleMute,
    isMuted: isCurrentlyMuted,
    enabled: isPressSpaceToUnmuteEnabled,
    notificationMessage: translate('videoCallParticipantPressSpaceToUnmuteNotification'),
  });

  const screenSharingEndedNotification = useAppNotification({
    message: translate('videoCallScreenShareEnded'),
    activeWindow: window,
  });

  useEffect(() => {
    const screenSharingEndedHandler = () => {
      screenSharingEndedNotification.show();
    };

    window.addEventListener(WebAppEvents.CALL.SCREEN_SHARING_ENDED, screenSharingEndedHandler);

    return () => {
      window.removeEventListener(WebAppEvents.CALL.SCREEN_SHARING_ENDED, screenSharingEndedHandler);
    };
  }, [screenSharingEndedNotification]);

  const handleMaximizeKeydown = useCallback(
    (event: React.KeyboardEvent<HTMLInputElement>) => {
      if (!isOngoing) {
        return;
      }
      if (isSpaceOrEnterKey(event.key)) {
        fireAndForgetInvoker.fireAndForget(async (): Promise<void> => {
          await callingRepository.setViewModeFullScreen();
        });
      }
    },
    [callingRepository, fireAndForgetInvoker, isOngoing],
  );

  const handleMaximizeClick = useCallback(() => {
    if (!isOngoing) {
      return;
    }
    fireAndForgetInvoker.fireAndForget(async (): Promise<void> => {
      await callingRepository.setViewModeFullScreen();
    });
  }, [callingRepository, fireAndForgetInvoker, isOngoing]);

  const {setCurrentView} = useAppMainState(state => state.responsiveView);
  const {showAlert, clearShowAlert} = useCallAlertState();

  const answerCall = useCallback(() => {
    if (isAnsweringRef.current || isAnswerButtonDisabled) {
      return;
    }

    isAnsweringRef.current = true;

    guardCall(async () => {
      try {
        await callActions.answer(call);
        isAnsweringRef.current = false;
        setCurrentView(ViewType.MOBILE_LEFT_SIDEBAR);
      } catch {
        isAnsweringRef.current = false;
      }
    });
  }, [call, callActions, guardCall, isAnswerButtonDisabled, setCurrentView]);

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
    [answerCall, call, callActions],
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
  }, [answerOrRejectCall, clearShowAlert, isIncoming]);

  const call1To1StartedAlert = translate(
    isOutgoingVideoCall ? 'startedVideoCallingAlert' : 'startedAudioCallingAlert',
    {
      conversationName,
      cameraStatus: translate(selfSharesCamera ? 'cameraStatusOn' : 'cameraStatusOff'),
    },
  );

  const onGoingCallAlert = translate(isOutgoingVideoCall ? 'ongoingVideoCall' : 'ongoingAudioCall', {
    conversationName,
    cameraStatus: translate(selfSharesCamera ? 'cameraStatusOn' : 'cameraStatusOff'),
  });

  const callGroupStartedAlert = translate(
    isOutgoingVideoCall ? 'startedVideoGroupCallingAlert' : 'startedGroupCallingAlert',
    {
      conversationName,
      cameraStatus: translate(selfSharesCamera ? 'cameraStatusOn' : 'cameraStatusOff'),
    },
  );

  const onGoingGroupCallAlert = translate(isOutgoingVideoCall ? 'ongoingGroupVideoCall' : 'ongoingGroupAudioCall', {
    conversationName,
    cameraStatus: translate(selfSharesCamera ? 'cameraStatusOn' : 'cameraStatusOff'),
  });

  const toggleDetachedWindow = () => {
    if (isDetachedWindow) {
      fireAndForgetInvoker.fireAndForget(async (): Promise<void> => {
        await callingRepository.setViewModeMinimized();
      });
      return;
    }
    fireAndForgetInvoker.fireAndForget(async (): Promise<void> => {
      await callingRepository.setViewModeDetached();
    });
  };

  if (isFullScreen) {
    return null;
  }

  return (
    <div css={callingContainer}>
      {isIncoming && (
        <p role="alert" className="visually-hidden">
          {translate('callConversationAcceptOrDecline', {conversationName})}
        </p>
      )}

      {(!isDeclined || isTemporaryUser === true) && (
        <div
          className="conversation-list-calling-cell-background"
          data-uie-name="item-call"
          data-uie-id={conversation.id}
          data-uie-value={conversation.display_name()}
        >
          {muteState === MuteState.REMOTE_MUTED && isFullUi && (
            <div className="conversation-list-calling-cell__info-bar">{translate('muteStateRemoteMute')}</div>
          )}

          <CallingHeader
            isGroup={isGroupOrChannel}
            isChannel={isChannel}
            isOngoing={isOngoing}
            showAlert={showAlert}
            isVideoCall={isVideoCall}
            clearShowAlert={clearShowAlert}
            conversationUrl={conversationUrl}
            callStartedAlert={isGroupOrChannel ? callGroupStartedAlert : call1To1StartedAlert}
            ongoingCallAlert={isGroupOrChannel ? onGoingGroupCallAlert : onGoingCallAlert}
            isTemporaryUser={isTemporaryUser === true}
            conversationParticipants={conversationParticipants}
            conversationName={conversationName}
            currentCallStatus={currentCallStatus}
            startedAt={startedAt}
            isCbrEnabled={isCbrEnabled}
            toggleDetachedWindow={toggleDetachedWindow}
            isDetachedWindow={isDetachedWindow}
            conversationID={conversation.id}
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
                  aria-label={translate('callMaximizeLabel')}
                >
                  <GroupVideoGrid
                    grid={activeCallViewTab === CallViewTab.ALL ? videoGrid : {grid: activeSpeakers, thumbnail: null}}
                    minimized
                    maximizedParticipant={maximizedParticipant}
                    selfParticipant={selfParticipant}
                    call={call}
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
                {translate('callNoCameraAccess')}
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
            isFullUi={isFullUi}
            isMuted={isMuted}
            isConnecting={isConnecting}
            isDetachedWindow={isDetachedWindow}
            isIncoming={isIncoming}
            isOutgoing={isOutgoing}
            isDeclined={isDeclined}
            isGroup={isGroupOrChannel}
            isVideoCall={isVideoCall}
            isOngoing={isOngoing}
            selfParticipant={selfParticipant}
            disableScreenButton={!callingRepository.supportsScreenSharing}
            teamState={teamState}
            supportsVideoCall={conversation.supportsVideoCall(call.isConference)}
            isAnswerButtonDisabled={isAnswerButtonDisabled}
          />
        </div>
      )}
    </div>
  );
};
