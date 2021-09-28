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

import {css, CSSObject} from '@emotion/core';
import {CALL_TYPE, CONV_TYPE} from '@wireapp/avs';
import {WebAppEvents} from '@wireapp/webapp-events';
import {amplify} from 'amplify';
import Icon from 'Components/Icon';
import React, {useEffect, useMemo, useState} from 'react';
import {TeamState} from '../../team/TeamState';
import {container} from 'tsyringe';
import {useKoSubscribable, useKoSubscribableChildren} from 'Util/ComponentUtil';
import {TIME_IN_MILLIS} from 'Util/TimeUtil';
import type {Call} from '../../calling/Call';
import type {Participant} from '../../calling/Participant';
import type {Grid} from '../../calling/videoGridHandler';
import type {Conversation} from '../../entity/Conversation';
import useHideElement from '../../hooks/useHideElement';
import type {ElectronDesktopCapturerSource, MediaDevicesHandler} from '../../media/MediaDevicesHandler';
import type {Multitasking} from '../../notification/NotificationRepository';
import {t} from '../../util/LocalizerUtil';
import {CallViewTab, CallViewTabs} from '../../view_model/CallingViewModel';
import ButtonGroup from './ButtonGroup';
import DeviceToggleButton from './DeviceToggleButton';
import Duration from './Duration';
import GroupVideoGrid from './GroupVideoGrid';
import Pagination from './Pagination';

export interface FullscreenVideoCallProps {
  activeCallViewTab: string;
  call: Call;
  canShareScreen: boolean;
  changePage: (newPage: number, call: Call) => void;
  conversation: Conversation;
  isChoosingScreen: boolean;
  isMuted: boolean;
  leave: (call: Call) => void;
  maximizedParticipant: Participant;
  mediaDevicesHandler: MediaDevicesHandler;
  multitasking: Multitasking;
  setActiveCallViewTab: (tab: string) => void;
  setMaximizedParticipant: (call: Call, participant: Participant) => void;
  switchCameraInput: (call: Call, deviceId: string) => void;
  teamState?: TeamState;
  toggleCamera: (call: Call) => void;
  toggleMute: (call: Call, muteState: boolean) => void;
  toggleScreenshare: (call: Call) => void;
  videoGrid: Grid;
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

const videoControlInActiveStyles = css`
  svg > path,
  svg > g > path {
    fill: #fff;
  }
`;

const videoControlDisabledStyles = css`
  ${videoControlActiveStyles};
  cursor: default;
  svg {
    opacity: 0.4;
  }
`;

const paginationButtonStyles: CSSObject = {
  alignItems: 'center',
  backdropFilter: 'blur(10px)',
  backgroundColor: 'rgba(255, 255, 255, 0.24)',
  cursor: 'pointer',
  display: 'flex',
  height: 56,
  justifyContent: 'center',
  position: 'absolute',
  top: 'calc(50% - 26px)',
  width: 56,
};

const FullscreenVideoCall: React.FC<FullscreenVideoCallProps> = ({
  call,
  canShareScreen,
  conversation,
  isChoosingScreen,
  isMuted,
  mediaDevicesHandler,
  multitasking,
  videoGrid,
  maximizedParticipant,
  activeCallViewTab,
  switchCameraInput,
  setMaximizedParticipant,
  setActiveCallViewTab,
  toggleMute,
  toggleCamera,
  toggleScreenshare,
  leave,
  changePage,
  teamState = container.resolve(TeamState),
}) => {
  const selfParticipant = call.getSelfParticipant();
  const {sharesScreen: selfSharesScreen, sharesCamera: selfSharesCamera} = useKoSubscribableChildren(selfParticipant, [
    'sharesScreen',
    'sharesCamera',
  ]);

  const {
    activeSpeakers,
    currentPage,
    pages: callPages,
    startedAt,
    participants,
  } = useKoSubscribableChildren(call, ['activeSpeakers', 'currentPage', 'pages', 'startedAt', 'participants']);
  const {display_name: conversationName} = useKoSubscribableChildren(conversation, ['display_name']);
  const {isVideoCallingEnabled} = useKoSubscribableChildren(teamState, ['isVideoCallingEnabled']);

  const currentCameraDevice = mediaDevicesHandler.currentDeviceId.videoInput();
  const switchCameraSource = (call: Call, deviceId: string) => switchCameraInput(call, deviceId);
  const minimize = () => multitasking.isMinimized(true);
  const videoInput = useKoSubscribable(mediaDevicesHandler.availableDevices.videoInput);
  const showToggleVideo =
    isVideoCallingEnabled &&
    (call.initialType === CALL_TYPE.VIDEO ||
      conversation.supportsVideoCall(call.conversationType === CONV_TYPE.CONFERENCE));
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

  const totalPages = callPages.length;

  return (
    <div id="video-calling" className="video-calling" ref={wrapper}>
      <div id="video-element-remote" className="video-element-remote">
        <GroupVideoGrid
          maximizedParticipant={maximizedParticipant}
          selfParticipant={selfParticipant}
          grid={
            activeCallViewTab === CallViewTab.SPEAKERS
              ? {
                  grid: activeSpeakers,
                  thumbnail: null,
                }
              : videoGrid
          }
          setMaximizedParticipant={participant => setMaximizedParticipant(call, participant)}
        />
      </div>

      {!isChoosingScreen && <div className="video-element-overlay hide-controls-hidden"></div>}

      <div id="video-title" className="video-title hide-controls-hidden">
        <div className="video-remote-name">{conversationName}</div>
        <div data-uie-name="video-timer" className="video-timer label-xs">
          <Duration startedAt={startedAt} />
        </div>
      </div>

      {!isChoosingScreen && (
        <div id="video-controls" className="video-controls hide-controls-hidden">
          {participants.length > 2 && (
            <ButtonGroup
              items={Object.values(CallViewTabs)}
              onChangeItem={item => {
                setActiveCallViewTab(item);
                setMaximizedParticipant(call, null);
              }}
              currentItem={activeCallViewTab}
              style={{margin: '0 auto', marginBottom: 32, width: 'fit-content'}}
              textSubstitute={participants.length.toString()}
            />
          )}
          {(videoGrid.grid.length > 1 || maximizedParticipant) && (
            <div className="video-controls__fit-info" data-uie-name="label-fit-fill-info">
              {maximizedParticipant ? t('videoCallOverlayFitVideoLabelGoBack') : t('videoCallOverlayFitVideoLabel')}
            </div>
          )}
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
              onClick={() => toggleMute(call, !isMuted)}
              css={!isMuted ? videoControlActiveStyles : undefined}
              data-uie-name="do-call-controls-video-call-mute"
            >
              <div className="video-controls__button__label">{t('videoCallOverlayMicrophone')}</div>
              {isMuted ? <Icon.MicOff width={16} height={16} /> : <Icon.MicOn width={16} height={16} />}
            </div>

            {showToggleVideo && (
              <div
                className="video-controls__button"
                data-uie-value={selfSharesCamera ? 'active' : 'inactive'}
                onClick={() => toggleCamera(call)}
                css={selfSharesCamera ? videoControlActiveStyles : videoControlInActiveStyles}
                data-uie-name="do-call-controls-toggle-video"
              >
                {selfSharesCamera ? <Icon.Camera width={16} height={16} /> : <Icon.CameraOff width={16} height={16} />}
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
                  <div className="video-controls__button__label">{t('videoCallOverlayCamera')}</div>
                )}
              </div>
            )}

            <div
              className={`video-controls__button ${!canShareScreen ? 'with-tooltip with-tooltip--top' : ''}`}
              data-tooltip={t('videoCallScreenShareNotSupported')}
              css={
                !canShareScreen ? videoControlDisabledStyles : selfSharesScreen ? videoControlActiveStyles : undefined
              }
              onClick={() => toggleScreenshare(call)}
              data-uie-value={selfSharesScreen ? 'active' : 'inactive'}
              data-uie-enabled={canShareScreen ? 'true' : 'false'}
              data-uie-name="do-toggle-screen"
            >
              {selfSharesScreen ? (
                <Icon.Screenshare width={16} height={16} />
              ) : (
                <Icon.ScreenshareOff width={16} height={16} />
              )}
              <div className="video-controls__button__label">{t('videoCallOverlayShareScreen')}</div>
            </div>

            <div
              className="video-controls__button video-controls__button--red"
              onClick={() => leave(call)}
              data-uie-name="do-call-controls-video-call-cancel"
            >
              <Icon.Hangup />
              <div className="video-controls__button__label">{t('videoCallOverlayHangUp')}</div>
            </div>
          </div>
        </div>
      )}
      {!maximizedParticipant && activeCallViewTab === CallViewTab.ALL && totalPages > 1 && (
        <>
          <div
            className="hide-controls-hidden"
            css={{bottom: 16, display: 'flex', justifyContent: 'center', position: 'absolute', width: '100%'}}
          >
            <Pagination
              totalPages={totalPages}
              currentPage={currentPage}
              onChangePage={newPage => changePage(newPage, call)}
            />
          </div>
          {currentPage !== totalPages - 1 && (
            <div
              data-uie-name="pagination-next"
              onClick={() => changePage(currentPage + 1, call)}
              className="hide-controls-hidden"
              css={{
                ...paginationButtonStyles,
                borderBottomLeftRadius: 32,
                borderTopLeftRadius: 32,
                right: 0,
              }}
            >
              <Icon.ArrowNext css={{left: 4, position: 'relative'}} />
            </div>
          )}
          {currentPage !== 0 && (
            <div
              data-uie-name="pagination-previous"
              onClick={() => changePage(currentPage - 1, call)}
              className="hide-controls-hidden"
              css={{
                ...paginationButtonStyles,
                borderBottomRightRadius: 32,
                borderTopRightRadius: 32,
                left: 0,
              }}
            >
              <Icon.ArrowNext css={{position: 'relative', right: 4, transform: 'rotate(180deg)'}} />
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default FullscreenVideoCall;
