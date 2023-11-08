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

import React, {useEffect, useMemo} from 'react';

import {css} from '@emotion/react';
import {TabIndex} from '@wireapp/react-ui-kit/lib/types/enums';
import {container} from 'tsyringe';

import {CALL_TYPE} from '@wireapp/avs';
import {IconButton, IconButtonVariant, useMatchMedia} from '@wireapp/react-ui-kit';

import {useCallAlertState} from 'Components/calling/useCallAlertState';
import {Icon} from 'Components/Icon';
import {ConversationClassifiedBar} from 'Components/input/ClassifiedBar';
import {MediaDeviceType} from 'src/script/media/MediaDeviceType';
import {useKoSubscribableChildren} from 'Util/ComponentUtil';
import {KEY} from 'Util/KeyboardUtil';
import {t} from 'Util/LocalizerUtil';
import {preventFocusOutside} from 'Util/util';

import {ButtonGroup} from './ButtonGroup';
import {DeviceToggleButton} from './DeviceToggleButton';
import {Duration} from './Duration';
import {
  videoControlActiveStyles,
  videoControlInActiveStyles,
  videoControlDisabledStyles,
  paginationButtonStyles,
  classifiedBarStyles,
} from './FullscreenVideoCall.styles';
import {GroupVideoGrid} from './GroupVideoGrid';
import {Pagination} from './Pagination';

import type {Call} from '../../calling/Call';
import {MuteState} from '../../calling/CallState';
import type {Participant} from '../../calling/Participant';
import type {Grid} from '../../calling/videoGridHandler';
import type {Conversation} from '../../entity/Conversation';
import {ElectronDesktopCapturerSource, MediaDevicesHandler} from '../../media/MediaDevicesHandler';
import type {Multitasking} from '../../notification/NotificationRepository';
import {useAppState} from '../../page/useAppState';
import {TeamState} from '../../team/TeamState';
import {CallViewTab, CallViewTabs} from '../../view_model/CallingViewModel';

export interface FullscreenVideoCallProps {
  activeCallViewTab: string;
  call: Call;
  canShareScreen: boolean;
  changePage: (newPage: number, call: Call) => void;
  conversation: Conversation;
  isChoosingScreen: boolean;
  isMuted: boolean;
  leave: (call: Call) => void;
  maximizedParticipant: Participant | null;
  mediaDevicesHandler: MediaDevicesHandler;
  multitasking: Multitasking;
  muteState: MuteState;
  setActiveCallViewTab: (tab: string) => void;
  setMaximizedParticipant: (call: Call, participant: Participant | null) => void;
  switchCameraInput: (call: Call, deviceId: string) => void;
  switchMicrophoneInput: (call: Call, deviceId: string) => void;
  teamState?: TeamState;
  toggleCamera: (call: Call) => void;
  toggleMute: (call: Call, muteState: boolean) => void;
  toggleScreenshare: (call: Call) => void;
  videoGrid: Grid;
}

const FullscreenVideoCall: React.FC<FullscreenVideoCallProps> = ({
  call,
  canShareScreen,
  conversation,
  isChoosingScreen,
  isMuted,
  muteState,
  mediaDevicesHandler,
  multitasking,
  videoGrid,
  maximizedParticipant,
  activeCallViewTab,
  switchCameraInput,
  switchMicrophoneInput,
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
  const {isVideoCallingEnabled, classifiedDomains} = useKoSubscribableChildren(teamState, [
    'isVideoCallingEnabled',
    'classifiedDomains',
  ]);

  const {[MediaDeviceType.VIDEO_INPUT]: currentCameraDevice, [MediaDeviceType.AUDIO_INPUT]: currentMicrophoneDevice} =
    useKoSubscribableChildren(mediaDevicesHandler.currentDeviceId, [
      MediaDeviceType.VIDEO_INPUT,
      MediaDeviceType.AUDIO_INPUT,
    ]);

  const {videoinput, audioinput} = useKoSubscribableChildren(mediaDevicesHandler.availableDevices, [
    MediaDeviceType.VIDEO_INPUT,
    MediaDeviceType.AUDIO_INPUT,
  ]);

  const minimize = () => multitasking.isMinimized(true);

  const showToggleVideo =
    isVideoCallingEnabled &&
    (call.initialType === CALL_TYPE.VIDEO || conversation.supportsVideoCall(call.isConference));
  const availableCameras = useMemo(
    () =>
      videoinput.map(device => (device as MediaDeviceInfo).deviceId || (device as ElectronDesktopCapturerSource).id),
    [videoinput],
  );
  const showSwitchCamera = availableCameras.length > 1;

  const availableMicrophones = useMemo(
    () =>
      audioinput.map(device => (device as MediaDeviceInfo).deviceId || (device as ElectronDesktopCapturerSource).id),
    [audioinput],
  );
  const showSwitchMicrophone = availableMicrophones.length > 1;

  const unreadMessagesCount = useAppState(state => state.unreadMessagesCount);
  const hasUnreadMessages = unreadMessagesCount > 0;

  const {showAlert, isGroupCall, clearShowAlert} = useCallAlertState();

  const totalPages = callPages.length;

  const isSpaceOrEnterKey = (event: React.KeyboardEvent<HTMLDivElement>) => [KEY.ENTER, KEY.SPACE].includes(event.key);

  const handleToggleCameraKeydown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (isSpaceOrEnterKey(event)) {
      toggleCamera(call);
    }

    return true;
  };

  // To be changed when design chooses a breakpoint, the conditional can be integrated to the ui-kit directly
  const horizontalSmBreakpoint = useMatchMedia('max-width: 680px');
  const horizontalXsBreakpoint = useMatchMedia('max-width: 500px');
  const verticalBreakpoint = useMatchMedia('max-height: 420px');

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent): void => {
      preventFocusOutside(event, 'video-calling');
    };
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
    };
  }, []);

  const callGroupStartedAlert = t(isGroupCall ? 'startedVideoGroupCallingAlert' : 'startedVideoCallingAlert', {
    conversationName,
    cameraStatus: t(selfSharesCamera ? 'cameraStatusOn' : 'cameraStatusOff'),
  });

  const onGoingGroupCallAlert = t(isGroupCall ? 'ongoingGroupVideoCall' : 'ongoingVideoCall', {
    conversationName,
    cameraStatus: t(selfSharesCamera ? 'cameraStatusOn' : 'cameraStatusOff'),
  });

  return (
    <div id="video-calling" className="video-calling">
      <div id="video-title" className="video-title">
        {horizontalSmBreakpoint && (
          <IconButton
            variant={IconButtonVariant.SECONDARY}
            className=" icon-back"
            css={{height: '25px', left: '5px', position: 'absolute', top: verticalBreakpoint ? '3px' : '10px'}}
            onClick={minimize}
          />
        )}

        {/* Calling conversation name and duration */}
        <div
          className="video-remote-name"
          aria-label={showAlert ? callGroupStartedAlert : onGoingGroupCallAlert}
          tabIndex={TabIndex.FOCUSABLE}
          ref={element => {
            if (showAlert) {
              element?.focus();
            }
          }}
          onBlur={() => clearShowAlert()}
        >
          <h2 className="video-remote-title">{conversationName}</h2>

          <div data-uie-name="video-timer" className="video-timer label-xs">
            <Duration startedAt={startedAt} />
          </div>
        </div>

        {muteState === MuteState.REMOTE_MUTED && (
          <div
            className="video-title__info-bar"
            style={{
              position: 'absolute',
              right: '12px',
            }}
          >
            {t('muteStateRemoteMute')}
          </div>
        )}
      </div>

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
        {classifiedDomains && (
          <ConversationClassifiedBar
            conversation={conversation}
            classifiedDomains={classifiedDomains}
            style={{
              ...classifiedBarStyles,
            }}
          />
        )}
      </div>
      {!maximizedParticipant && activeCallViewTab === CallViewTab.ALL && totalPages > 1 && (
        <>
          {currentPage !== totalPages - 1 && (
            <button
              data-uie-name="pagination-next"
              onClick={() => changePage(currentPage + 1, call)}
              type="button"
              className="button-reset-default"
              css={{
                ...paginationButtonStyles,
                borderBottomLeftRadius: 32,
                borderTopLeftRadius: 32,
                right: 0,
              }}
            >
              <Icon.ArrowNext css={{left: 4, position: 'relative'}} />
            </button>
          )}
          {currentPage !== 0 && (
            <button
              data-uie-name="pagination-previous"
              type="button"
              onClick={() => changePage(currentPage - 1, call)}
              className="button-reset-default"
              css={{
                ...paginationButtonStyles,
                borderBottomRightRadius: 32,
                borderTopRightRadius: 32,
                left: 0,
              }}
            >
              <Icon.ArrowNext css={{position: 'relative', right: 4, transform: 'rotate(180deg)'}} />
            </button>
          )}
          {!verticalBreakpoint && (
            <div css={{bottom: 108, display: 'flex', justifyContent: 'center', position: 'absolute', width: '100%'}}>
              <Pagination
                totalPages={totalPages}
                currentPage={currentPage}
                onChangePage={newPage => changePage(newPage, call)}
              />
            </div>
          )}
        </>
      )}
      {!isChoosingScreen && (
        <div id="video-controls" className="video-controls">
          <ul className="video-controls__wrapper">
            {!horizontalSmBreakpoint && (
              <li className="video-controls__item__minimize">
                <button
                  className="video-controls__button"
                  css={videoControlInActiveStyles}
                  onClick={minimize}
                  type="button"
                  aria-labelledby="minimize-label"
                  data-uie-name="do-call-controls-video-minimize"
                >
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
                  <span id="minimize-label" className="video-controls__button__label">
                    {t('videoCallOverlayConversations')}
                  </span>
                </button>
              </li>
            )}
            <div className="video-controls__centered-items">
              <li className="video-controls__item">
                <button
                  className="video-controls__button"
                  data-uie-value={!isMuted ? 'inactive' : 'active'}
                  onClick={() => toggleMute(call, !isMuted)}
                  css={!isMuted ? videoControlActiveStyles : videoControlInActiveStyles}
                  type="button"
                  aria-labelledby="mute-label"
                  data-uie-name="do-call-controls-video-call-mute"
                  role="switch"
                  aria-checked={!isMuted}
                >
                  <span id="mute-label" className="video-controls__button__label">
                    {t('videoCallOverlayMicrophone')}
                  </span>

                  {isMuted ? <Icon.MicOff width={16} height={16} /> : <Icon.MicOn width={16} height={16} />}

                  {showSwitchMicrophone && !verticalBreakpoint && (
                    <DeviceToggleButton
                      styles={css`
                        bottom: -38px;
                        left: 50%;
                        position: absolute;
                        transform: translateX(-50%);
                      `}
                      currentDevice={currentMicrophoneDevice}
                      devices={availableMicrophones}
                      onChooseDevice={deviceId => switchMicrophoneInput(call, deviceId)}
                    />
                  )}
                </button>
              </li>

              {showToggleVideo && (
                <li className="video-controls__item">
                  <div
                    className="video-controls__button"
                    data-uie-value={selfSharesCamera ? 'active' : 'inactive'}
                    onClick={() => toggleCamera(call)}
                    onKeyDown={handleToggleCameraKeydown}
                    role="switch"
                    aria-checked={selfSharesCamera}
                    tabIndex={TabIndex.FOCUSABLE}
                    css={selfSharesCamera ? videoControlActiveStyles : videoControlInActiveStyles}
                    aria-labelledby="video-label"
                    data-uie-name="do-call-controls-toggle-video"
                  >
                    {selfSharesCamera ? (
                      <Icon.Camera width={16} height={16} />
                    ) : (
                      <Icon.CameraOff width={16} height={16} />
                    )}

                    <span id="video-label" className="video-controls__button__label">
                      {t('videoCallOverlayCamera')}
                    </span>

                    {showSwitchCamera && !verticalBreakpoint && (
                      <DeviceToggleButton
                        styles={css`
                          bottom: -38px;
                          left: 50%;
                          position: absolute;
                          transform: translateX(-50%);
                        `}
                        currentDevice={currentCameraDevice}
                        devices={availableCameras}
                        onChooseDevice={deviceId => switchCameraInput(call, deviceId)}
                      />
                    )}
                  </div>
                </li>
              )}

              <li className="video-controls__item">
                <button
                  className={`video-controls__button ${!canShareScreen ? 'with-tooltip with-tooltip--top' : ''}`}
                  data-tooltip={t('videoCallScreenShareNotSupported')}
                  css={
                    !canShareScreen
                      ? videoControlDisabledStyles
                      : selfSharesScreen
                      ? videoControlActiveStyles
                      : videoControlInActiveStyles
                  }
                  onClick={() => toggleScreenshare(call)}
                  type="button"
                  aria-labelledby="screnn-share-label"
                  data-uie-value={selfSharesScreen ? 'active' : 'inactive'}
                  data-uie-enabled={canShareScreen ? 'true' : 'false'}
                  data-uie-name="do-toggle-screen"
                >
                  {selfSharesScreen ? (
                    <Icon.Screenshare width={16} height={16} />
                  ) : (
                    <Icon.ScreenshareOff width={16} height={16} />
                  )}
                  <span id="screen-share-label" className="video-controls__button__label">
                    {t('videoCallOverlayShareScreen')}
                  </span>
                </button>
              </li>

              <li className="video-controls__item">
                <button
                  className="video-controls__button video-controls__button--red"
                  onClick={() => leave(call)}
                  type="button"
                  aria-labelledby="leave-label"
                  data-uie-name="do-call-controls-video-call-cancel"
                >
                  <Icon.Hangup />
                  <span id="leave-label" className="video-controls__button__label">
                    {t('videoCallOverlayHangUp')}
                  </span>
                </button>
              </li>
            </div>
            {!horizontalXsBreakpoint && (
              <div
                css={{...(!horizontalSmBreakpoint && {minWidth: '157px'}), display: 'flex', justifyContent: 'flex-end'}}
              >
                {participants.length > 2 && !horizontalXsBreakpoint && (
                  <ButtonGroup
                    items={Object.values(CallViewTabs)}
                    onChangeItem={item => {
                      setActiveCallViewTab(item);
                      setMaximizedParticipant(call, null);
                    }}
                    currentItem={activeCallViewTab}
                    textSubstitute={participants.length.toString()}
                  />
                )}
              </div>
            )}
          </ul>
        </div>
      )}
    </div>
  );
};

export {FullscreenVideoCall};
