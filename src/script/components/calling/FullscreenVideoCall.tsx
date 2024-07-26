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

import React, {useState, useEffect} from 'react';

import {DefaultConversationRoleName} from '@wireapp/api-client/lib/conversation/';
import {TabIndex} from '@wireapp/react-ui-kit/lib/types/enums';
import classNames from 'classnames';
import {container} from 'tsyringe';

import {CALL_TYPE} from '@wireapp/avs';
import {GridIcon, IconButton, IconButtonVariant, Select} from '@wireapp/react-ui-kit';

import {useCallAlertState} from 'Components/calling/useCallAlertState';
import * as Icon from 'Components/Icon';
import {ConversationClassifiedBar} from 'Components/input/ClassifiedBar';
import {CallingRepository} from 'src/script/calling/CallingRepository';
import {Config} from 'src/script/Config';
import {isCallViewOption} from 'src/script/guards/CallView';
import {isMediaDevice} from 'src/script/guards/MediaDevice';
import {useActiveWindowMatchMedia} from 'src/script/hooks/useActiveWindowMatchMedia';
import {useToggleState} from 'src/script/hooks/useToggleState';
import {MediaDeviceType} from 'src/script/media/MediaDeviceType';
import {useKoSubscribableChildren} from 'Util/ComponentUtil';
import {handleKeyDown, isEscapeKey} from 'Util/KeyboardUtil';
import {t} from 'Util/LocalizerUtil';
import {preventFocusOutside} from 'Util/util';

import {CallingParticipantList} from './CallingCell/CallIngParticipantList';
import {Duration} from './Duration';
import {
  videoControlActiveStyles,
  videoControlInActiveStyles,
  videoControlDisabledStyles,
  paginationButtonStyles,
  classifiedBarStyles,
  paginationWrapperStyles,
  videoTopBarStyles,
} from './FullscreenVideoCall.styles';
import {GroupVideoGrid} from './GroupVideoGrid';
import {Pagination} from './Pagination';

import type {Call} from '../../calling/Call';
import {CallingViewMode, CallState, MuteState} from '../../calling/CallState';
import {Participant} from '../../calling/Participant';
import type {Grid} from '../../calling/videoGridHandler';
import type {Conversation} from '../../entity/Conversation';
import {ElectronDesktopCapturerSource, MediaDevicesHandler} from '../../media/MediaDevicesHandler';
import {TeamState} from '../../team/TeamState';
import {CallViewTab} from '../../view_model/CallingViewModel';

enum BlurredBackgroundStatus {
  OFF = 'bluroff',
  ON = 'bluron',
}

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
  callingRepository: CallingRepository;
  mediaDevicesHandler: MediaDevicesHandler;
  muteState: MuteState;
  setActiveCallViewTab: (tab: CallViewTab) => void;
  setMaximizedParticipant: (call: Call, participant: Participant | null) => void;
  switchCameraInput: (deviceId: string) => void;
  switchMicrophoneInput: (deviceId: string) => void;
  switchSpeakerOutput: (deviceId: string) => void;
  switchBlurredBackground: (status: boolean) => void;
  teamState?: TeamState;
  callState?: CallState;
  toggleCamera: (call: Call) => void;
  toggleMute: (call: Call, muteState: boolean) => void;
  toggleScreenshare: (call: Call) => void;
  sendEmoji: (emoji: string, call: Call) => void;
  videoGrid: Grid;
}

const EMOJIS_LIST = ['👍', '🎉', '❤️', '😂', '😮', '👏', '🤔', '😢', '👎'];

const FullscreenVideoCall: React.FC<FullscreenVideoCallProps> = ({
  call,
  canShareScreen,
  conversation,
  isChoosingScreen,
  sendEmoji,
  isMuted,
  muteState,
  mediaDevicesHandler,
  callingRepository,
  videoGrid,
  maximizedParticipant,
  activeCallViewTab,
  switchCameraInput,
  switchMicrophoneInput,
  switchSpeakerOutput,
  switchBlurredBackground,
  setMaximizedParticipant,
  setActiveCallViewTab,
  toggleMute,
  toggleCamera,
  toggleScreenshare,
  leave,
  changePage,
  teamState = container.resolve(TeamState),
  callState = container.resolve(CallState),
}) => {
  const [showEmojisBar, setShowEmojisBar] = useState<boolean>(false);
  const [disabledEmojis, setDisabledEmojis] = useState<string[]>([]);
  const selfParticipant = call.getSelfParticipant();
  const {sharesScreen: selfSharesScreen, sharesCamera: selfSharesCamera} = useKoSubscribableChildren(selfParticipant, [
    'sharesScreen',
    'sharesCamera',
  ]);

  const {blurredVideoStream} = useKoSubscribableChildren(selfParticipant, ['blurredVideoStream']);
  const hasBlurredBackground = !!blurredVideoStream;

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

  const {
    [MediaDeviceType.VIDEO_INPUT]: currentCameraDevice,
    [MediaDeviceType.AUDIO_INPUT]: currentMicrophoneDevice,
    [MediaDeviceType.AUDIO_OUTPUT]: currentSpeakerDevice,
  } = useKoSubscribableChildren(mediaDevicesHandler.currentDeviceId, [
    MediaDeviceType.VIDEO_INPUT,
    MediaDeviceType.AUDIO_INPUT,
    MediaDeviceType.AUDIO_OUTPUT,
  ]);

  const {videoinput, audioinput, audiooutput} = useKoSubscribableChildren(mediaDevicesHandler.availableDevices, [
    MediaDeviceType.VIDEO_INPUT,
    MediaDeviceType.AUDIO_INPUT,
    MediaDeviceType.AUDIO_OUTPUT,
  ]);

  const {selfUser, roles} = useKoSubscribableChildren(conversation, ['selfUser', 'roles']);
  const {emojis} = useKoSubscribableChildren(callState, ['emojis']);

  const [audioOptionsOpen, setAudioOptionsOpen] = useState(false);
  const [videoOptionsOpen, setVideoOptionsOpen] = useState(false);
  const minimize = () => callState.viewMode(CallingViewMode.MINIMIZED);

  const [isParticipantsListOpen, toggleParticipantsList] = useToggleState(false);
  const [isCallViewOpen, toggleCallView] = useToggleState(false);

  const showToggleVideo =
    isVideoCallingEnabled &&
    (call.initialType === CALL_TYPE.VIDEO || conversation.supportsVideoCall(call.isConference));

  const showSwitchMicrophone = audioinput.length > 1;

  const callViewOptions = [
    {
      label: t('videoCallOverlayViewModeLabel'),
      options: [
        {
          label: t('videoCallOverlayViewModeAll'),
          value: CallViewTab.ALL,
        },
        {
          label: t('videoCallOverlayViewModeSpeakers'),
          value: CallViewTab.SPEAKERS,
        },
      ],
    },
  ];

  const selectedCallViewOption =
    callViewOptions[0].options.find(option => option.value === activeCallViewTab) ?? callViewOptions[0].options[0];

  const audioOptions = [
    {
      label: t('videoCallaudioInputMicrophone'),
      options: audioinput.map((device: MediaDeviceInfo | ElectronDesktopCapturerSource) => {
        return isMediaDevice(device)
          ? {
              label: device.label,
              value: `${device.deviceId}-input`,
              dataUieName: `${device.deviceId}-input`,
              id: device.deviceId,
            }
          : {
              label: device.name,
              value: `${device.id}-input`,
              dataUieName: `${device.id}-input`,
              id: device.id,
            };
      }),
    },
    {
      label: t('videoCallaudioOutputSpeaker'),
      options: audiooutput.map((device: MediaDeviceInfo | ElectronDesktopCapturerSource) => {
        return isMediaDevice(device)
          ? {
              label: device.label,
              value: `${device.deviceId}-output`,
              dataUieName: `${device.deviceId}-output`,
              id: device.deviceId,
            }
          : {
              label: device.name,
              value: `${device.id}-output`,
              dataUieName: `${device.id}-output`,
              id: device.id,
            };
      }),
    },
  ];
  const [selectedAudioOptions, setSelectedAudioOptions] = useState(() =>
    [currentMicrophoneDevice, currentSpeakerDevice].flatMap(
      (device, index) => audioOptions[index].options.find(item => item.id === device) ?? audioOptions[index].options[0],
    ),
  );
  const updateAudioOptions = (selectedOption: string, input: boolean) => {
    const microphone = input
      ? audioOptions[0].options.find(item => item.value === selectedOption) ?? selectedAudioOptions[0]
      : selectedAudioOptions[0];
    const speaker = !input
      ? audioOptions[1].options.find(item => item.value === selectedOption) ?? selectedAudioOptions[1]
      : selectedAudioOptions[1];

    setSelectedAudioOptions([microphone, speaker]);
    switchMicrophoneInput(microphone.id);
    switchSpeakerOutput(speaker.id);
  };

  const blurredBackgroundOptions = {
    label: t('videoCallbackgroundBlurHeadline'),
    options: [
      {
        // Blurring is not possible if webgl context is not available
        isDisabled: !document.createElement('canvas').getContext('webgl2'),
        label: t('videoCallbackgroundBlur'),
        value: BlurredBackgroundStatus.ON,
        dataUieName: 'blur',
        id: BlurredBackgroundStatus.ON,
      },
      {
        label: t('videoCallbackgroundNotBlurred'),
        value: BlurredBackgroundStatus.OFF,
        dataUieName: 'no-blur',
        id: BlurredBackgroundStatus.OFF,
      },
    ],
  };
  const videoOptions = [
    {
      label: t('videoCallvideoInputCamera'),
      options: videoinput.map((device: MediaDeviceInfo | ElectronDesktopCapturerSource) => {
        return isMediaDevice(device)
          ? {
              label: device.label,
              value: device.deviceId,
              dataUieName: device.deviceId,
              id: device.deviceId,
            }
          : {
              label: device.name,
              value: device.id,
              dataUieName: device.id,
              id: device.id,
            };
      }),
    },
    blurredBackgroundOptions,
  ];

  const selectedVideoOptions = [currentCameraDevice, hasBlurredBackground]
    .flatMap(device => videoOptions.flatMap(options => options.options.filter(item => item.id === device)) ?? [])
    .concat(hasBlurredBackground ? blurredBackgroundOptions.options[0] : blurredBackgroundOptions.options[1]);

  const updateVideoOptions = (selectedOption: string | BlurredBackgroundStatus) => {
    const camera = videoOptions[0].options.find(item => item.value === selectedOption) ?? selectedVideoOptions[0];
    if (selectedOption === BlurredBackgroundStatus.ON) {
      switchBlurredBackground(true);
    } else if (selectedOption === BlurredBackgroundStatus.OFF) {
      switchBlurredBackground(false);
    } else {
      switchCameraInput(camera.id);
    }
  };

  const onEmojiClick = (selectedEmoji: string) => {
    setDisabledEmojis(prev => [...prev, selectedEmoji]);

    sendEmoji(selectedEmoji, call);

    setTimeout(() => {
      setDisabledEmojis(prev => [...prev].filter(emoji => emoji !== selectedEmoji));
    }, CallingRepository.EMOJI_TIME_OUT_DURATION);
  };

  const {showAlert, isGroupCall, clearShowAlert} = useCallAlertState();

  const totalPages = callPages.length;

  // To be changed when design chooses a breakpoint, the conditional can be integrated to the ui-kit directly
  const horizontalSmBreakpoint = useActiveWindowMatchMedia('max-width: 680px');
  const horizontalXsBreakpoint = useActiveWindowMatchMedia('max-width: 500px');

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent): void => {
      event.preventDefault();
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

  const isModerator = selfUser && roles[selfUser.id] === DefaultConversationRoleName.WIRE_ADMIN;

  return (
    <div className="video-calling-wrapper">
      <div id="video-calling" className="video-calling">
        <div css={videoTopBarStyles}>
          <div id="video-title" className="video-title">
            {horizontalSmBreakpoint && (
              <IconButton
                variant={IconButtonVariant.SECONDARY}
                className=" icon-back"
                css={{height: '25px', left: '5px', position: 'absolute', top: '10px'}}
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
          {!maximizedParticipant && activeCallViewTab === CallViewTab.ALL && totalPages > 1 && (
            <div css={paginationWrapperStyles}>
              <button
                data-uie-name="pagination-previous"
                type="button"
                onClick={() => changePage(currentPage - 1, call)}
                onKeyDown={event => handleKeyDown(event, () => changePage(currentPage - 1, call))}
                className="button-reset-default"
                disabled={currentPage === 0}
                css={{
                  ...paginationButtonStyles,
                  borderBottomRightRadius: 32,
                  borderTopRightRadius: 32,
                  left: 0,
                }}
              >
                <Icon.ChevronRight css={{position: 'relative', right: 4, transform: 'rotateY(180deg)'}} />
              </button>

              <Pagination
                totalPages={totalPages}
                currentPage={currentPage}
                onChangePage={newPage => changePage(newPage, call)}
              />
              <button
                data-uie-name="pagination-next"
                onClick={() => changePage(currentPage + 1, call)}
                onKeyDown={event => handleKeyDown(event, () => changePage(currentPage + 1, call))}
                type="button"
                className="button-reset-default"
                disabled={currentPage === totalPages - 1}
                css={{
                  ...paginationButtonStyles,
                  borderBottomLeftRadius: 32,
                  borderTopLeftRadius: 32,
                  right: 0,
                }}
              >
                <Icon.ChevronRight css={{left: 4, position: 'relative'}} />
              </button>
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

        {!isChoosingScreen && (
          <div id="video-controls" className="video-controls">
            {showEmojisBar && (
              <div
                role="toolbar"
                className="video-controls-emoji-bar"
                data-uie-name="video-controls-emoji-bar"
                aria-label={t('callReactionButtonsAriaLabel')}
              >
                {EMOJIS_LIST.map(emoji => {
                  const isDisabled = disabledEmojis.includes(emoji);
                  return (
                    <button
                      aria-label={t('callReactionButtonAriaLabel', {emoji})}
                      data-uie-name="video-controls-emoji"
                      data-uie-value={emoji}
                      key={emoji}
                      disabled={isDisabled}
                      onClick={() => onEmojiClick(emoji)}
                      className={classNames({disabled: isDisabled})}
                    >
                      {emoji}
                    </button>
                  );
                })}
              </div>
            )}

            {emojis.map(({id, emoji, left, from}) => (
              <div
                key={id}
                role="img"
                className="emoji"
                aria-label={t('callReactionsAriaLabel', {from, emoji})}
                style={{left}}
                data-uie-from={from}
                data-uie-value={emoji}
                data-uie-name="flying-emoji"
              >
                <span aria-hidden="true">{emoji}</span>
                <span className="emoji-text" aria-hidden="true">
                  {from}
                </span>
              </div>
            ))}

            <ul className="video-controls__wrapper">
              {!horizontalSmBreakpoint && (
                <li className="video-controls__item__minimize">
                  <button
                    className="video-controls__button video-controls__button--small"
                    css={videoControlInActiveStyles}
                    onClick={minimize}
                    onKeyDown={event => handleKeyDown(event, () => minimize())}
                    type="button"
                    data-uie-name="do-call-controls-video-minimize"
                    title={t('videoCallOverlayCloseFullScreen')}
                  >
                    <Icon.CloseDetachedWindowIcon />
                  </button>
                </li>
              )}
              <div className="video-controls__centered-items">
                <li className="video-controls__item">
                  <button
                    className="video-controls__button"
                    data-uie-value={!isMuted ? 'inactive' : 'active'}
                    onClick={() => toggleMute(call, !isMuted)}
                    onKeyDown={event => handleKeyDown(event, () => toggleMute(call, !isMuted))}
                    css={!isMuted ? videoControlActiveStyles : videoControlInActiveStyles}
                    type="button"
                    data-uie-name="do-call-controls-video-call-mute"
                    role="switch"
                    aria-checked={!isMuted}
                    title={t('videoCallOverlayMicrophone')}
                  >
                    {isMuted ? <Icon.MicOffIcon width={16} height={16} /> : <Icon.MicOnIcon width={16} height={16} />}
                  </button>

                  {showSwitchMicrophone && (
                    <button
                      className="device-toggle-button"
                      css={audioOptionsOpen ? videoControlActiveStyles : videoControlInActiveStyles}
                      onClick={() => setAudioOptionsOpen(prev => !prev)}
                      onKeyDown={event => handleKeyDown(event, () => setAudioOptionsOpen(prev => !prev))}
                      onBlur={event => {
                        if (!event.currentTarget.contains(event.relatedTarget)) {
                          setAudioOptionsOpen(false);
                        }
                      }}
                    >
                      {audioOptionsOpen ? (
                        <>
                          <Select
                            // eslint-disable-next-line jsx-a11y/no-autofocus
                            autoFocus
                            value={selectedAudioOptions}
                            id="select-microphone"
                            dataUieName="select-microphone"
                            controlShouldRenderValue={false}
                            isClearable={false}
                            backspaceRemovesValue={false}
                            hideSelectedOptions={false}
                            options={audioOptions}
                            onChange={selectedOption => {
                              updateAudioOptions(
                                String(selectedOption?.value),
                                String(selectedOption?.value).includes('input'),
                              );
                            }}
                            onKeyDown={event => isEscapeKey(event) && setAudioOptionsOpen(false)}
                            menuPlacement="top"
                            menuIsOpen
                            wrapperCSS={{marginBottom: 0}}
                          />
                          <Icon.ChevronIcon css={{height: '16px'}} />
                        </>
                      ) : (
                        <Icon.ChevronIcon css={{rotate: '180deg', height: '16px'}} />
                      )}
                    </button>
                  )}
                </li>

                {showToggleVideo && (
                  <li className="video-controls__item">
                    <button
                      className="video-controls__button"
                      data-uie-value={selfSharesCamera ? 'active' : 'inactive'}
                      onClick={() => toggleCamera(call)}
                      onKeyDown={event => handleKeyDown(event, () => toggleCamera(call))}
                      role="switch"
                      aria-checked={selfSharesCamera}
                      tabIndex={TabIndex.FOCUSABLE}
                      css={selfSharesCamera ? videoControlActiveStyles : videoControlInActiveStyles}
                      data-uie-name="do-call-controls-toggle-video"
                      title={t('videoCallOverlayCamera')}
                    >
                      {selfSharesCamera ? (
                        <Icon.CameraIcon width={16} height={16} />
                      ) : (
                        <Icon.CameraOffIcon width={16} height={16} />
                      )}
                    </button>

                    <button
                      className="device-toggle-button"
                      css={videoOptionsOpen ? videoControlActiveStyles : videoControlInActiveStyles}
                      onClick={() => setVideoOptionsOpen(prev => !prev)}
                      onKeyDown={event => handleKeyDown(event, () => setVideoOptionsOpen(prev => !prev))}
                      onBlur={event => {
                        if (!event.currentTarget.contains(event.relatedTarget)) {
                          setVideoOptionsOpen(false);
                        }
                      }}
                    >
                      {videoOptionsOpen ? (
                        <>
                          <Select
                            // eslint-disable-next-line jsx-a11y/no-autofocus
                            autoFocus
                            value={selectedVideoOptions}
                            onChange={selectedOption => updateVideoOptions(String(selectedOption?.value))}
                            onKeyDown={event => isEscapeKey(event) && setVideoOptionsOpen(false)}
                            id="select-camera"
                            dataUieName="select-camera"
                            controlShouldRenderValue={false}
                            isClearable={false}
                            backspaceRemovesValue={false}
                            hideSelectedOptions={false}
                            options={videoOptions}
                            menuPlacement="top"
                            menuIsOpen
                            wrapperCSS={{marginBottom: 0}}
                          />
                          <Icon.ChevronIcon css={{height: '16px'}} />
                        </>
                      ) : (
                        <Icon.ChevronIcon css={{rotate: '180deg', height: '16px'}} />
                      )}
                    </button>
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
                    onKeyDown={event => handleKeyDown(event, () => toggleScreenshare(call))}
                    type="button"
                    data-uie-value={selfSharesScreen ? 'active' : 'inactive'}
                    data-uie-enabled={canShareScreen ? 'true' : 'false'}
                    data-uie-name="do-toggle-screen"
                    title={t('videoCallOverlayShareScreen')}
                  >
                    {selfSharesScreen ? (
                      <Icon.ScreenshareIcon width={16} height={16} />
                    ) : (
                      <Icon.ScreenshareOffIcon width={16} height={16} />
                    )}
                  </button>
                </li>

                {Config.getConfig().FEATURE.ENABLE_IN_CALL_REACTIONS && (
                  <li className="video-controls__item">
                    <button
                      css={showEmojisBar ? videoControlActiveStyles : videoControlInActiveStyles}
                      className="video-controls__button"
                      onClick={() => setShowEmojisBar(prev => !prev)}
                      type="button"
                      aria-labelledby="show-emoji-bar"
                      data-uie-name="do-call-controls-video-call-cancel"
                    >
                      <Icon.LikeIcon />
                      <span id="show-emoji-bar" className="video-controls__button__label">
                        {t('callReactions')}
                      </span>
                    </button>
                  </li>
                )}

                <li className="video-controls__item">
                  <button
                    className="video-controls__button video-controls__button--red"
                    onClick={() => leave(call)}
                    onKeyDown={event => handleKeyDown(event, () => leave(call))}
                    type="button"
                    data-uie-name="do-call-controls-video-call-cancel"
                    title={t('videoCallOverlayHangUp')}
                  >
                    <Icon.HangupIcon />
                  </button>
                </li>
              </div>
              {!horizontalXsBreakpoint && (
                <div
                  css={{
                    ...(!horizontalSmBreakpoint && {minWidth: '157px'}),
                    display: 'flex',
                    justifyContent: 'flex-end',
                  }}
                >
                  {participants.length > 2 && (
                    <li className="video-controls__item">
                      <button
                        className="video-controls__button video-controls__button--small"
                        onClick={toggleCallView}
                        onKeyDown={event => handleKeyDown(event, toggleCallView)}
                        css={isCallViewOpen ? videoControlActiveStyles : videoControlInActiveStyles}
                        type="button"
                        data-uie-name="do-call-controls-video-call-view"
                        role="switch"
                        aria-checked={!isMuted}
                        title={t('videoCallOverlayChangeViewMode')}
                      >
                        <Select
                          // eslint-disable-next-line jsx-a11y/no-autofocus
                          autoFocus
                          value={selectedCallViewOption}
                          id="select-call-view"
                          dataUieName="select-call-view"
                          controlShouldRenderValue={false}
                          isClearable={false}
                          backspaceRemovesValue={false}
                          hideSelectedOptions={false}
                          options={callViewOptions}
                          onChange={selectedOption => {
                            if (isCallViewOption(selectedOption)) {
                              setActiveCallViewTab(selectedOption.value);
                              setMaximizedParticipant(call, null);
                            }
                          }}
                          onKeyDown={event => isEscapeKey(event) && setAudioOptionsOpen(false)}
                          menuPlacement="top"
                          menuIsOpen={isCallViewOpen}
                          wrapperCSS={{marginBottom: 0, width: 0, height: 0}}
                          menuCSS={{right: 0, bottom: 10}}
                        />
                        <GridIcon width={16} height={16} />
                      </button>
                    </li>
                  )}
                  <li className="video-controls__item">
                    <button
                      className="video-controls__button video-controls__button--small"
                      data-uie-value={isParticipantsListOpen ? 'active' : 'inactive'}
                      onClick={toggleParticipantsList}
                      onKeyDown={event => handleKeyDown(event, toggleParticipantsList)}
                      css={isParticipantsListOpen ? videoControlActiveStyles : videoControlInActiveStyles}
                      type="button"
                      data-uie-name="do-toggle-call-participants-list"
                      role="switch"
                      aria-checked={isParticipantsListOpen}
                      title={
                        isParticipantsListOpen
                          ? t('videoCallOverlayHideParticipantsList')
                          : t('videoCallOverlayShowParticipantsList')
                      }
                    >
                      <Icon.PeopleIcon width={16} height={16} />
                    </button>
                  </li>
                </div>
              )}
            </ul>
          </div>
        )}
      </div>
      {isParticipantsListOpen && (
        <CallingParticipantList
          callingRepository={callingRepository}
          conversation={conversation}
          participants={participants}
          isModerator={isModerator}
          isSelfVerified={selfUser?.is_verified()}
          showParticipants={true}
        />
      )}
    </div>
  );
};

export {FullscreenVideoCall};
