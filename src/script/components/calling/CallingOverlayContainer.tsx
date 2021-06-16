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

import ReactDOM from 'react-dom';
import React, {Fragment, useState} from 'react';
import {container} from 'tsyringe';
import {CALL_TYPE} from '@wireapp/avs';

import FullscreenVideoCall from './FullscreenVideoCall';
import ChooseScreen, {Screen} from './ChooseScreen';
import {ConversationState} from '../../conversation/ConversationState';
import {useKoSubscribableChildren} from 'Util/ComponentUtil';
import {Call} from '../../calling/Call';
import {Multitasking} from '../../notification/NotificationRepository';
import {getGrid, Grid} from '../../calling/videoGridHandler';
import {Conversation} from '../../entity/Conversation';
import {CallingRepository} from '../../calling/CallingRepository';
import {MediaDevicesHandler, ElectronDesktopCapturerSource} from '../../media/MediaDevicesHandler';
import {Participant} from '../../calling/Participant';
import {VideoSpeakersTab} from '../../view_model/CallingViewModel';
import {MediaStreamHandler} from '../../media/MediaStreamHandler';
import {CallState} from '../../calling/CallState';

export interface CallingContainerProps {
  readonly callingRepository: CallingRepository;
  readonly callState?: CallState;
  readonly conversationState?: ConversationState;
  readonly mediaDevicesHandler: MediaDevicesHandler;
  readonly mediaStreamHandler: MediaStreamHandler;
  readonly multitasking: Multitasking;
}

const CallingContainer: React.FC<CallingContainerProps> = ({
  multitasking,
  callingRepository,
  mediaStreamHandler,
  mediaDevicesHandler,
  callState = container.resolve(CallState),
  conversationState = container.resolve(ConversationState),
}) => {
  let onChooseScreen = (deviceId: string) => {};
  const [selectableScreens, setSelectableScreens] = useState<ElectronDesktopCapturerSource[]>([]);
  const [selectableWindows, setSelectableWindows] = useState<ElectronDesktopCapturerSource[]>([]);
  const isChoosingScreen = selectableScreens.length > 0 || selectableWindows.length > 0;

  const {isMinimized} = useKoSubscribableChildren(multitasking as {isMinimized: ko.Observable}, ['isMinimized']);
  const {isMuted, videoSpeakersActiveTab, joinedCall} = useKoSubscribableChildren(callState, [
    'isMuted',
    'videoSpeakersActiveTab',
    'joinedCall',
  ]);
  const currentOngoingCall = joinedCall as Call;

  const onCancelScreenSelection = () => {
    setSelectableScreens([]);
    setSelectableWindows([]);
  };

  const getVideoGrid = (call: Call): Grid => {
    return getGrid(call)();
  };

  const getConversationById = (conversationId: string): Conversation => {
    return conversationState.findConversation(conversationId);
  };

  const changePage = (newPage: number, call: Call) => {
    callingRepository.changeCallPage(newPage, call);
  };

  const leave = (call: Call) => {
    callingRepository.leaveCall(call.conversationId);
    callState.videoSpeakersActiveTab(VideoSpeakersTab.ALL);
    call.maximizedParticipant(null);
  };

  const setMaximizedParticipant = (call: Call, participant: Participant) => {
    call.maximizedParticipant(participant);
  };

  const setVideoSpeakersActiveTab = (tab: string) => {
    callState.videoSpeakersActiveTab(tab);
  };

  const switchCameraInput = (call: Call, deviceId: string) => {
    mediaDevicesHandler.currentDeviceId.videoInput(deviceId);
  };

  const toggleCamera = (call: Call) => {
    callingRepository.toggleCamera(call);
  };

  const toggleMute = (call: Call, muteState: boolean) => {
    callingRepository.muteCall(call, muteState);
  };

  const toggleScreenshare = async (call: Call): Promise<void> => {
    if (call.getSelfParticipant().sharesScreen()) {
      return callingRepository.toggleScreenshare(call);
    }
    const showScreenSelection = (): Promise<void> => {
      return new Promise(resolve => {
        onChooseScreen = (deviceId: string): void => {
          mediaDevicesHandler.currentDeviceId.screenInput(deviceId);
          setSelectableScreens([]);
          setSelectableWindows([]);
          resolve();
        };
        mediaDevicesHandler.getScreenSources().then((sources: ElectronDesktopCapturerSource[]) => {
          if (sources.length === 1) {
            return onChooseScreen(sources[0].id);
          }
          setSelectableScreens(sources.filter(source => source.id.startsWith('screen')));
          setSelectableWindows(sources.filter(source => source.id.startsWith('window')));
        });
      });
    };

    mediaStreamHandler.selectScreenToShare(showScreenSelection).then(() => {
      const isAudioCall = [CALL_TYPE.NORMAL, CALL_TYPE.FORCED_AUDIO].includes(call.initialType);
      const isFullScreenVideoCall = call.initialType === CALL_TYPE.VIDEO && !multitasking.isMinimized();
      if (isAudioCall || isFullScreenVideoCall) {
        multitasking.isMinimized(true);
      }
      return callingRepository.toggleScreenshare(call);
    });
  };

  const conversation = conversationState.findConversation(currentOngoingCall?.conversationId);
  if (!currentOngoingCall || !conversation || conversation.removed_from_conversation()) {
    console.info('bardia null');
    return null;
  }

  return (
    <Fragment>
      {!isMinimized && (
        <FullscreenVideoCall
          key={currentOngoingCall.conversationId}
          videoGrid={getVideoGrid(currentOngoingCall)}
          call={currentOngoingCall}
          videoSpeakersActiveTab={videoSpeakersActiveTab}
          conversation={getConversationById(currentOngoingCall.conversationId)}
          multitasking={multitasking}
          canShareScreen={callingRepository.supportsScreenSharing}
          maximizedParticipant={currentOngoingCall.maximizedParticipant()}
          videoInput={mediaDevicesHandler.availableDevices.videoInput()}
          mediaDevicesHandler={mediaDevicesHandler}
          isMuted={isMuted}
          isChoosingScreen={isChoosingScreen}
          switchCameraInput={switchCameraInput}
          setMaximizedParticipant={setMaximizedParticipant}
          setVideoSpeakersActiveTab={setVideoSpeakersActiveTab}
          toggleMute={toggleMute}
          toggleCamera={toggleCamera}
          toggleScreenshare={toggleScreenshare}
          leave={leave}
          changePage={changePage}
        />
      )}

      {isChoosingScreen && (
        <ChooseScreen
          cancel={onCancelScreenSelection}
          choose={onChooseScreen}
          screens={selectableScreens as unknown as Screen[]}
          windows={selectableWindows as unknown as Screen[]}
        />
      )}
    </Fragment>
  );
};

export default {
  CallingContainer,
  init: (
    multitasking: Multitasking,
    callingRepository: CallingRepository,
    mediaStreamHandler: MediaStreamHandler,
    mediaDevicesHandler: MediaDevicesHandler,
  ) => {
    ReactDOM.render(
      <CallingContainer
        multitasking={multitasking}
        callingRepository={callingRepository}
        mediaStreamHandler={mediaStreamHandler}
        mediaDevicesHandler={mediaDevicesHandler}
      />,
      document.getElementById('calling-overlay-container'),
    );
  },
};
