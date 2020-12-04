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

import React, {useEffect, useRef, useState} from 'react';
import {css} from '@emotion/core';
import {amplify} from 'amplify';
import {WebAppEvents} from '@wireapp/webapp-events';
import {CALL_TYPE, CONV_TYPE} from '@wireapp/avs';

import {TIME_IN_MILLIS, formatSeconds} from 'Util/TimeUtil';
import {registerReactComponent} from 'Util/ComponentUtil';
import SVGProvider from '../../auth/util/SVGProvider';
import useHideElement from '../../hooks/useHideElement';
import {t} from '../../util/LocalizerUtil';
import GroupVideoGrid from './GroupVideoGrid';
import DeviceToggleButton from './DeviceToggleButton';

import type {Call} from '../../calling/Call';
import type {Grid} from '../../calling/videoGridHandler';
import type {Conversation} from '../../entity/Conversation';
import type {ElectronDesktopCapturerSource, MediaDevicesHandler} from '../../media/MediaDevicesHandler';
import type {CallActions} from '../../view_model/CallingViewModel';
import type {Multitasking} from '../../notification/NotificationRepository';

export interface FullscreenVideoCallProps {
  call: Call;
  callActions: CallActions;
  canShareScreen: boolean;
  conversation: Conversation;
  isChoosingScreen: boolean;
  isMuted: boolean;
  mediaDevicesHandler: MediaDevicesHandler;
  multitasking: Multitasking;
  videoGrid: Grid;
  videoInput: (ElectronDesktopCapturerSource | MediaDeviceInfo)[];
}

const FullscreenVideoCallConfig = {
  AUTO_MINIMIZE_TIMEOUT: TIME_IN_MILLIS.SECOND * 4,
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
}) => {
  const selfSharesScreen = call.getSelfParticipant().sharesScreen();
  const selfSharesCamera = call.getSelfParticipant().sharesCamera();
  const currentCameraDevice = mediaDevicesHandler.currentDeviceId.videoInput();
  const switchCameraSource = (call: Call, deviceId: string) => callActions.switchCameraInput(call, deviceId);
  const minimize = () => multitasking.isMinimized(true);
  const showToggleVideo =
    call.initialType === CALL_TYPE.VIDEO ||
    conversation.supportsVideoCall(call.conversationType === CONV_TYPE.CONFERENCE);
  const availableCameras = videoInput.map(
    device => (device as MediaDeviceInfo).deviceId || (device as ElectronDesktopCapturerSource).id,
  );
  const showSwitchCamera = selfSharesCamera && availableCameras.length > 1;
  const wrapperRef = useRef<HTMLDivElement>(null);
  useHideElement(wrapperRef, FullscreenVideoCallConfig.HIDE_CONTROLS_TIMEOUT, 'video-controls__button');

  const [hasUnreadMessages, setHasUnreadMessages] = useState(false);
  const updateUnreadCount = (unreadCount: number) => setHasUnreadMessages(unreadCount > 0);
  useEffect(() => {
    amplify.subscribe(WebAppEvents.LIFECYCLE.UNREAD_COUNT, updateUnreadCount);
    return () => {
      amplify.unsubscribe(WebAppEvents.LIFECYCLE.UNREAD_COUNT, updateUnreadCount);
    };
  }, []);

  const [callDuration, setCallDuration] = useState('');

  useEffect(() => {
    const startedAt = call.startedAt();
    let callDurationUpdateInterval: number;
    if (startedAt) {
      const updateTimer = () => {
        const time = Math.floor((Date.now() - startedAt) / 1000);
        setCallDuration(formatSeconds(time));
      };
      updateTimer();
      callDurationUpdateInterval = window.setInterval(updateTimer, 1000);
    }
    return () => {
      window.clearInterval(callDurationUpdateInterval);
    };
  }, [call.startedAt()]);

  useEffect(() => {
    let minimizeTimeout: number;
    minimizeTimeout = undefined;
    if (!videoGrid.hasRemoteVideo && multitasking.autoMinimize()) {
      minimizeTimeout = window.setTimeout(() => {
        if (!isChoosingScreen) {
          multitasking.isMinimized(true);
        }
      }, FullscreenVideoCallConfig.AUTO_MINIMIZE_TIMEOUT);
    }
    return () => {
      window.clearTimeout(minimizeTimeout);
    };
  }, [videoGrid]);

  return (
    <div id="video-calling" className="video-calling" ref={wrapperRef}>
      <div id="video-element-remote" className="video-element-remote">
        <GroupVideoGrid grid={videoGrid} muted={isMuted} selfParticipant={call.getSelfParticipant()} />
      </div>

      {!isChoosingScreen && <div className="video-element-overlay hide-controls-hidden"></div>}

      <div id="video-title" className="video-title hide-controls-hidden">
        <div className="video-remote-name">{conversation.display_name()}</div>
        <div data-uie-name="video-timer" className="video-timer label-xs">
          {callDuration}
        </div>
      </div>

      {!isChoosingScreen && (
        <div id="video-controls" className="video-controls hide-controls-hidden">
          <div className="video-controls__fit-info" data-uie-name="label-fit-fill-info">
            {t('videoCallOverlayFitVideoLabel')}
          </div>
          <div className="video-controls__wrapper">
            <div className="video-controls__button" onClick={minimize} data-uie-name="do-call-controls-video-minimize">
              {hasUnreadMessages ? (
                <svg
                  css={{
                    marginRight: '-2px',
                    marginTop: '-2px',
                  }}
                  width={18}
                  height={18}
                  viewBox="0 0 18 18"
                  dangerouslySetInnerHTML={{__html: SVGProvider['message-unread-icon']?.documentElement?.innerHTML}}
                />
              ) : (
                <svg
                  width={16}
                  height={16}
                  viewBox="0 0 16 16"
                  dangerouslySetInnerHTML={{__html: SVGProvider['message-icon']?.documentElement?.innerHTML}}
                />
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
              <svg
                width={16}
                height={16}
                viewBox="0 0 16 16"
                dangerouslySetInnerHTML={{__html: SVGProvider['mic-off-icon']?.documentElement?.innerHTML}}
              />
              <div className="video-controls__button__label">{t('videoCallOverlayMute')}</div>
            </div>

            {showToggleVideo && (
              <div
                className="video-controls__button"
                data-uie-value={selfSharesCamera ? 'active' : 'inactive'}
                onClick={() => callActions.toggleCamera(call)}
                css={selfSharesCamera ? videoControlActiveStyles : undefined}
                data-uie-name="do-call-controls-toggle-video"
              >
                <svg
                  width={16}
                  height={12}
                  viewBox="0 0 16 12"
                  dangerouslySetInnerHTML={{__html: SVGProvider['camera-icon']?.documentElement?.innerHTML}}
                />
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
              <svg
                width={16}
                height={16}
                viewBox="0 0 16 16"
                dangerouslySetInnerHTML={{__html: SVGProvider['screenshare-icon']?.documentElement?.innerHTML}}
              />
              <div className="video-controls__button__label">{t('videoCallOverlayShareScreen')}</div>
            </div>

            <div
              className="video-controls__button video-controls__button--red"
              onClick={() => callActions.leave(call)}
              data-uie-name="do-call-controls-video-call-cancel"
            >
              <svg
                width={20}
                height={8}
                viewBox="0 0 20 8"
                dangerouslySetInnerHTML={{__html: SVGProvider['hangup-icon']?.documentElement?.innerHTML}}
              />
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
    '<div data-bind="react: {call, callActions, canShareScreen, mediaDevicesHandler, multitasking, videoInput: ko.unwrap(videoInput), conversation: ko.unwrap(conversation), isChoosingScreen: ko.unwrap(isChoosingScreen), isMuted: ko.unwrap(isMuted), videoGrid: ko.unwrap(videoGrid)}"></div>',
});
