/*
 * Wire
 * Copyright (C) 2021 Wire Swiss GmbH
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

import {Fragment, useEffect} from 'react';

import {container} from 'tsyringe';

import {useCallAlertState} from 'Components/calling/useCallAlertState';
import {Call} from 'Repositories/calling/Call';
import {CallingRepository} from 'Repositories/calling/CallingRepository';
import {CallingViewMode, CallState, DesktopScreenShareMenu, MuteState} from 'Repositories/calling/CallState';
import {LEAVE_CALL_REASON} from 'Repositories/calling/enum/LeaveCallReason';
import {Participant} from 'Repositories/calling/Participant';
import {useVideoGrid} from 'Repositories/calling/videoGridHandler';
import {MediaDevicesHandler} from 'Repositories/media/MediaDevicesHandler';
import {useMediaDevicesStore} from 'Repositories/media/useMediaDevicesStore';
import {PropertiesRepository} from 'Repositories/properties/PropertiesRepository';
import {useKoSubscribableChildren} from 'Util/ComponentUtil';

import {ChooseScreen} from './ChooseScreen';
import {FullscreenVideoCall} from './FullscreenVideoCall';

import {CallViewTab} from '../../view_model/CallingViewModel';

interface CallingContainerProps {
  readonly propertiesRepository: PropertiesRepository;
  readonly callingRepository: CallingRepository;
  readonly callState?: CallState;
  readonly toggleScreenshare: (call: Call, desktopScreenShareMenu: DesktopScreenShareMenu) => void;
}

const CallingContainer = ({
  propertiesRepository,
  callingRepository,
  callState = container.resolve(CallState),
  toggleScreenshare,
}: CallingContainerProps) => {
  const mediaDevicesHandler = container.resolve(MediaDevicesHandler);
  const {activeCallViewTab, joinedCall, hasAvailableScreensToShare, desktopScreenShareMenu, viewMode} =
    useKoSubscribableChildren(callState, [
      'activeCallViewTab',
      'joinedCall',
      'hasAvailableScreensToShare',
      'desktopScreenShareMenu',
      'viewMode',
    ]);

  const isFullScreenOrDetached = [CallingViewMode.DETACHED_WINDOW, CallingViewMode.FULL_SCREEN].includes(viewMode);

  const {
    maximizedParticipant,
    state: currentCallState,
    muteState,
  } = useKoSubscribableChildren(joinedCall!, ['maximizedParticipant', 'state', 'muteState']);

  const isMuted = muteState !== MuteState.NOT_MUTED;

  useEffect(() => {
    if (currentCallState === undefined) {
      void callingRepository.setViewModeMinimized();
    }
  }, [currentCallState]);

  const videoGrid = useVideoGrid(joinedCall!);

  const changePage = (newPage: number, call: Call) => callingRepository.changeCallPage(call, newPage);

  const {clearShowAlert} = useCallAlertState();

  const leave = (call: Call) => {
    callingRepository.setViewModeMinimized();
    callingRepository.leaveCall(call.conversation.qualifiedId, LEAVE_CALL_REASON.MANUAL_LEAVE_BY_UI_CLICK);
    callState.activeCallViewTab(CallViewTab.ALL);
    call.maximizedParticipant(null);
    clearShowAlert();
  };

  const setMaximizedParticipant = (call: Call, participant: Participant | null) => {
    call.maximizedParticipant(participant);
  };

  const setActiveCallViewTab = (tab: CallViewTab) => {
    callState.activeCallViewTab(tab);
    if (tab === CallViewTab.ALL && joinedCall) {
      callingRepository.requestCurrentPageVideoStreams(joinedCall);
    }
  };

  const {setVideoInputDeviceId, setAudioInputDeviceId, setAudioOutputDeviceId} = useMediaDevicesStore(state => ({
    setVideoInputDeviceId: state.setVideoInputDeviceId,
    setAudioInputDeviceId: state.setAudioInputDeviceId,
    setAudioOutputDeviceId: state.setAudioOutputDeviceId,
  }));

  const switchCameraInput = (deviceId: string) => {
    setVideoInputDeviceId(deviceId);
    callingRepository.refreshVideoInput();
  };

  const switchMicrophoneInput = (deviceId: string) => {
    setAudioInputDeviceId(deviceId);
    callingRepository.refreshAudioInput();
  };

  const sendEmoji = (emoji: string, call: Call) => {
    void callingRepository.sendInCallEmoji(emoji, call);
  };

  const sendHandRaised = (isHandUp: boolean, call: Call) => {
    void callingRepository.sendInCallHandRaised(isHandUp, call);
  };

  const switchSpeakerOutput = (deviceId: string) => {
    setAudioOutputDeviceId(deviceId);
  };

  const toggleCamera = (call: Call) => callingRepository.toggleCamera(call);

  const toggleMute = (call: Call, muteState: boolean) => callingRepository.muteCall(call, muteState);

  const conversation = joinedCall?.conversation;

  if (!joinedCall || !conversation || conversation.isSelfUserRemoved()) {
    return null;
  }

  const toggleScreenShare = (call: Call) => {
    toggleScreenshare(call, DesktopScreenShareMenu.DETACHED_WINDOW);
  };

  const isScreenshareActive =
    hasAvailableScreensToShare && desktopScreenShareMenu === DesktopScreenShareMenu.DETACHED_WINDOW;

  return (
    <Fragment>
      {isFullScreenOrDetached && !!videoGrid?.grid.length && (
        <FullscreenVideoCall
          key={conversation.id}
          videoGrid={videoGrid}
          call={joinedCall}
          activeCallViewTab={activeCallViewTab}
          conversation={conversation}
          canShareScreen={callingRepository.supportsScreenSharing}
          maximizedParticipant={maximizedParticipant}
          propertiesRepository={propertiesRepository}
          callingRepository={callingRepository}
          mediaDevicesHandler={mediaDevicesHandler}
          isMuted={isMuted}
          muteState={muteState}
          isChoosingScreen={isScreenshareActive}
          sendEmoji={sendEmoji}
          sendHandRaised={sendHandRaised}
          switchCameraInput={switchCameraInput}
          switchMicrophoneInput={switchMicrophoneInput}
          switchSpeakerOutput={switchSpeakerOutput}
          switchBlurredBackground={status => callingRepository.switchVideoBackgroundBlur(status)}
          setMaximizedParticipant={setMaximizedParticipant}
          setActiveCallViewTab={setActiveCallViewTab}
          toggleMute={toggleMute}
          toggleCamera={toggleCamera}
          toggleScreenshare={toggleScreenShare}
          leave={leave}
          changePage={changePage}
        />
      )}

      {isScreenshareActive && <ChooseScreen choose={callingRepository.onChooseScreen} />}
    </Fragment>
  );
};

export {CallingContainer};
