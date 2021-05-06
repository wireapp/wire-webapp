/*
 * Wire
 * Copyright (C) 2020 Wire Swiss GmbH
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

import {css} from '@emotion/core';
import {CALL_TYPE, CONV_TYPE} from '@wireapp/avs';
import {WebAppEvents} from '@wireapp/webapp-events';
import {amplify} from 'amplify';
import Icon from 'Components/Icon';
import React, {useEffect, useMemo, useState} from 'react';
import {registerReactComponent, useKoSubscribable} from 'Util/ComponentUtil';
import {TIME_IN_MILLIS} from 'Util/TimeUtil';
import type {Call} from '../../calling/Call';
import type {Participant} from '../../calling/Participant';
import type {Grid} from '../../calling/videoGridHandler';
import type {Conversation} from '../../entity/Conversation';
import useHideElement from '../../hooks/useHideElement';
import type {ElectronDesktopCapturerSource, MediaDevicesHandler} from '../../media/MediaDevicesHandler';
import type {Multitasking} from '../../notification/NotificationRepository';
import {t} from '../../util/LocalizerUtil';
import {CallActions, VideoSpeakersTabs} from '../../view_model/CallingViewModel';
import ButtonGroup from './ButtonGroup';
import DeviceToggleButton from './DeviceToggleButton';
import Duration from './Duration';
import GroupVideoGrid from './GroupVideoGrid';

export interface FullscreenVideoCallProps {
  call: Call;
  callActions: CallActions;
  canShareScreen: boolean;
  conversation: Conversation;
  isChoosingScreen: boolean;
  isMuted: boolean;
  maximizedParticipant: Participant;
  mediaDevicesHandler: MediaDevicesHandler;
  multitasking: Multitasking;
  videoGrid: Grid;
  videoInput: (ElectronDesktopCapturerSource | MediaDeviceInfo)[];
  videoSpeakersActiveTab: string;
}

const FullscreenVideoCallConfig = {
  HIDE_CONTROLS_TIMEOUT: TIME_IN_MILLIS.SECOND * 4,
};

const videoControlActiveStyles = css`
  background-color: #fff;
  svg > path {
    fill: #202123;
  }
`;

const videoControlDisabledStyles = css`
  ${videoControlActiveStyles};
  cursor: default;
  svg {
    opacity: 0.4;
  }
`;

const FullscreenVideoCall: React.FC<FullscreenVideoCallProps> = ({
  call,
  callActions,
  canShareScreen,
  conversation,
  isChoosingScreen,
  isMuted,
  mediaDevicesHandler,
  multitasking,
  videoGrid,
  videoInput,
  maximizedParticipant,
  videoSpeakersActiveTab,
}) => {
  const selfSharesScreen = call.getSelfParticipant()?.sharesScreen() ?? false;
  const selfSharesCamera = call.getSelfParticipant()?.sharesCamera() ?? false;
  const currentCameraDevice = mediaDevicesHandler.currentDeviceId.videoInput();
  const switchCameraSource = (call: Call, deviceId: string) => callActions.switchCameraInput(call, deviceId);
  const minimize = () => multitasking.isMinimized(true);
  const showToggleVideo =
    call.initialType === CALL_TYPE.VIDEO ||
    conversation.supportsVideoCall(call.conversationType === CONV_TYPE.CONFERENCE);
  const availableCameras = useMemo(
    () =>
      videoInput.map(device => (device as MediaDeviceInfo).deviceId || (device as ElectronDesktopCapturerSource).id),
    [videoInput],
  );
  const showSwitchCamera = selfSharesCamera && availableCameras.length > 1;
  const wrapper = useHideElement(FullscreenVideoCallConfig.HIDE_CONTROLS_TIMEOUT, 'video-controls__button');

  const [hasUnreadMessages, setHasUnreadMessages] = useState(false);
  const updateUnreadCount = (unreadCount: number) => setHasUnreadMessages(unreadCount > 0);
  useEffect(() => {
    amplify.subscribe(WebAppEvents.LIFECYCLE.UNREAD_COUNT, updateUnreadCount);
    return () => {
      amplify.unsubscribe(WebAppEvents.LIFECYCLE.UNREAD_COUNT, updateUnreadCount);
    };
  }, []);

  const activeVideoSpeakers = useKoSubscribable(call.activeSpeakers);

  return (
    <div id="video-calling" className="video-calling" ref={wrapper}>
      <div id="video-element-remote" className="video-element-remote">
        <GroupVideoGrid
          muted={isMuted}
          maximizedParticipant={maximizedParticipant}
          selfParticipant={call.getSelfParticipant()}
          grid={
            videoSpeakersActiveTab === VideoSpeakersTabs.speakers
              ? {
                  grid: activeVideoSpeakers,
                  hasRemoteVideo: activeVideoSpeakers.length > 0,
                  thumbnail: null,
                }
              : videoGrid
          }
          setMaximizedParticipant={callActions.setMaximizedTileVideoParticipant}
        />
      </div>

      {!isChoosingScreen && <div className="video-element-overlay hide-controls-hidden"></div>}

      <div id="video-title" className="video-title hide-controls-hidden">
        <div className="video-remote-name">{conversation.display_name()}</div>
        <div data-uie-name="video-timer" className="video-timer label-xs">
          <Duration startedAt={call.startedAt()} />
        </div>
      </div>

      {!isChoosingScreen && (
        <div id="video-controls" className="video-controls hide-controls-hidden">
          {call.participants().length > 2 && (
            <ButtonGroup
              items={Object.values(VideoSpeakersTabs)}
              onChangeItem={item => {
                callActions.setVideoSpeakersActiveTab(item);
                callActions.setMaximizedTileVideoParticipant(null);
              }}
              currentItem={videoSpeakersActiveTab}
              style={{margin: '0 auto', marginBottom: 32, width: 'fit-content'}}
            />
          )}
          <div className="video-controls__fit-info" data-uie-name="label-fit-fill-info">
            {t('videoCallOverlayFitVideoLabel')}
          </div>
          <div className="video-controls__wrapper">
            <div className="video-controls__button" onClick={minimize} data-uie-name="do-call-controls-video-minimize">
              {hasUnreadMessages ? (
                <Icon.MessageUnread
                  css={{
                    marginRight: '-2px',
                    marginTop: '-2px',
                  }}
                />
              ) : (
                <Icon.Message />
              )}
              <div className="video-controls__button__label">{t('videoCallOverlayConversations')}</div>
            </div>

            <div
              className="video-controls__button"
              data-uie-value={!isMuted ? 'inactive' : 'active'}
              onClick={() => callActions.toggleMute(call, !isMuted)}
              css={isMuted ? videoControlActiveStyles : undefined}
              data-uie-name="do-call-controls-video-call-mute"
            >
              <div className="video-controls__button__label">{t('videoCallOverlayMute')}</div>
              <Icon.MicOff />
            </div>

            {showToggleVideo && (
              <div
                className="video-controls__button"
                data-uie-value={selfSharesCamera ? 'active' : 'inactive'}
                onClick={() => callActions.toggleCamera(call)}
                css={selfSharesCamera ? videoControlActiveStyles : undefined}
                data-uie-name="do-call-controls-toggle-video"
              >
                <Icon.Camera />
                {showSwitchCamera ? (
                  <DeviceToggleButton
                    styles={css`
                      position: absolute;
                      bottom: -16px;
                      left: 50%;
                      transform: translateX(-50%);
                    `}
                    currentDevice={currentCameraDevice}
                    devices={availableCameras}
                    onChooseDevice={deviceId => switchCameraSource(call, deviceId)}
                  />
                ) : (
                  <div className="video-controls__button__label">{t('videoCallOverlayVideo')}</div>
                )}
              </div>
            )}

            <div
              className={`video-controls__button ${!canShareScreen ? 'with-tooltip with-tooltip--top' : ''}`}
              data-tooltip={t('videoCallScreenShareNotSupported')}
              css={
                !canShareScreen ? videoControlDisabledStyles : selfSharesScreen ? videoControlActiveStyles : undefined
              }
              onClick={() => callActions.toggleScreenshare(call)}
              data-uie-value={selfSharesScreen ? 'active' : 'inactive'}
              data-uie-enabled={canShareScreen ? 'true' : 'false'}
              data-uie-name="do-toggle-screen"
            >
              <Icon.Screenshare />
              <div className="video-controls__button__label">{t('videoCallOverlayShareScreen')}</div>
            </div>

            <div
              className="video-controls__button video-controls__button--red"
              onClick={() => callActions.leave(call)}
              data-uie-name="do-call-controls-video-call-cancel"
            >
              <Icon.Hangup />
              <div className="video-controls__button__label">{t('videoCallOverlayHangUp')}</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default FullscreenVideoCall;

registerReactComponent('fullscreen-video-call', {
  component: FullscreenVideoCall,
  template:
    '<div data-bind="react: {call, callActions, maximizedParticipant: ko.unwrap(maximizedParticipant), videoSpeakersActiveTab: ko.unwrap(videoSpeakersActiveTab), canShareScreen, mediaDevicesHandler, multitasking, videoInput: ko.unwrap(videoInput), conversation: ko.unwrap(conversation), isChoosingScreen: ko.unwrap(isChoosingScreen), isMuted: ko.unwrap(isMuted), videoGrid: ko.unwrap(videoGrid)}"></div>',
});
