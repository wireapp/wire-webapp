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
import {CALL_TYPE, REASON as CALL_REASON, STATE as CALL_STATE} from '@wireapp/avs';

import FullscreenVideoCall from './FullscreenVideoCall';
import ChooseScreen, {Screen} from './ChooseScreen';
import {CallState} from 'src/script/calling/CallState';
import {ConversationState} from 'src/script/conversation/ConversationState';
import {useKoSubscribable} from 'Util/ComponentUtil';
import {Call} from 'src/script/calling/Call';
import {Multitasking} from 'src/script/notification/NotificationRepository';
import {getGrid, Grid} from 'src/script/calling/videoGridHandler';
import {Conversation} from 'src/script/entity/Conversation';
import {CallingRepository} from 'src/script/calling/CallingRepository';
import {MediaDevicesHandler, ElectronDesktopCapturerSource} from 'src/script/media/MediaDevicesHandler';
import {Participant} from 'src/script/calling/Participant';
import {VideoSpeakersTab} from 'src/script/view_model/CallingViewModel';
import {MediaStreamHandler} from 'src/script/media/MediaStreamHandler';

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

  const videoSpeakersActiveTab = useKoSubscribable(callState.videoSpeakersActiveTab);
  const isMuted = useKoSubscribable(callState.isMuted);

  const onCancelScreenSelection = () => {
    setSelectableScreens([]);
    setSelectableWindows([]);
  };

  const activeCalls = useKoSubscribable(callState.activeCalls).filter(call => {
    const conversation = conversationState.findConversation(call.conversationId);
    if (!conversation || conversation.removed_from_conversation()) {
      return false;
    }

    return call.reason() !== CALL_REASON.ANSWERED_ELSEWHERE;
  });

  const isOngoing = (call: Call) => {
    return call.state() === CALL_STATE.MEDIA_ESTAB;
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

  return (
    <Fragment>
      {activeCalls.map(call =>
        isOngoing(call) && !multitasking.isMinimized() ? (
          <FullscreenVideoCall
            key={call.conversationId}
            videoGrid={getVideoGrid(call)}
            call={call}
            videoSpeakersActiveTab={videoSpeakersActiveTab}
            conversation={getConversationById(call.conversationId)}
            multitasking={multitasking}
            canShareScreen={callingRepository.supportsScreenSharing}
            maximizedParticipant={call.maximizedParticipant()}
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
        ) : null,
      )}

      {isChoosingScreen && (
        <ChooseScreen
          cancel={onCancelScreenSelection}
          choose={onChooseScreen}
          // needs discussion
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
      document.getElementById('calling-container'),
    );
  },
};
