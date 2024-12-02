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

import React, {useRef, useState} from 'react';

import {TabIndex} from '@wireapp/react-ui-kit/lib/types/enums';
import classNames from 'classnames';
import {container} from 'tsyringe';

import {CALL_TYPE} from '@wireapp/avs';
import {EmojiIcon, GridIcon, QUERY, RaiseHandIcon, Select} from '@wireapp/react-ui-kit';

import * as Icon from 'Components/Icon';
import {useActiveWindowMatchMedia} from 'Hooks/useActiveWindowMatchMedia';
import {useClickOutside} from 'Hooks/useClickOutside';
import {useToggleState} from 'Hooks/useToggleState';
import {Call} from 'src/script/calling/Call';
import {CallingRepository} from 'src/script/calling/CallingRepository';
import {CallingViewMode, CallState} from 'src/script/calling/CallState';
import {Participant} from 'src/script/calling/Participant';
import {Config} from 'src/script/Config';
import {Conversation} from 'src/script/entity/Conversation';
import {isCallViewOption} from 'src/script/guards/CallView';
import {isMediaDevice} from 'src/script/guards/MediaDevice';
import {ElectronDesktopCapturerSource, MediaDevicesHandler} from 'src/script/media/MediaDevicesHandler';
import {MediaDeviceType} from 'src/script/media/MediaDeviceType';
import {TeamState} from 'src/script/team/TeamState';
import {CallViewTab} from 'src/script/view_model/CallingViewModel';
import {useKoSubscribableChildren} from 'Util/ComponentUtil';
import {handleKeyDown, isEscapeKey} from 'Util/KeyboardUtil';
import {t} from 'Util/LocalizerUtil';

import {
  hangUpVideoControlStyles,
  minimizeVideoControlStyles,
  shareScreenVideoControlStyles,
  videoControlActiveStyles,
  videoControlDisabledStyles,
  videoControlsWrapperStyles,
} from './VideoControls.styles';

// TODO: move to a shared location
import {videoControlInActiveStyles} from '../FullscreenVideoCall.styles';

enum BlurredBackgroundStatus {
  OFF = 'bluroff',
  ON = 'bluron',
}

const EMOJIS_LIST = ['👍', '🎉', '❤️', '😂', '😮', '👏', '🤔', '😢', '👎'];

export interface VideoControlsProps {
  activeCallViewTab: string;
  call: Call;
  isMuted: boolean;
  isParticipantsListOpen: boolean;
  toggleParticipantsList: () => void;
  canShareScreen: boolean;
  conversation: Conversation;
  mediaDevicesHandler: MediaDevicesHandler;
  callState?: CallState;
  teamState?: TeamState;
  minimize: () => void;
  leave: (call: Call) => void;
  toggleMute: (call: Call, muteState: boolean) => void;
  toggleScreenshare: (call: Call) => void;
  toggleCamera: (call: Call) => void;
  toggleIsHandRaised: (isHandRaised: boolean) => void;
  switchMicrophoneInput: (deviceId: string) => void;
  switchSpeakerOutput: (deviceId: string) => void;
  switchBlurredBackground: (status: boolean) => void;
  switchCameraInput: (deviceId: string) => void;
  setActiveCallViewTab: (tab: CallViewTab) => void;
  setMaximizedParticipant: (call: Call, participant: Participant | null) => void;
  sendEmoji: (emoji: string, call: Call) => void;
}

export const VideoControls: React.FC<VideoControlsProps> = ({
  activeCallViewTab,
  call,
  isMuted,
  isParticipantsListOpen,
  toggleParticipantsList,
  canShareScreen,
  conversation,
  mediaDevicesHandler,
  minimize,
  leave,
  toggleMute,
  toggleScreenshare,
  toggleCamera,
  toggleIsHandRaised,
  switchMicrophoneInput,
  switchSpeakerOutput,
  switchBlurredBackground,
  switchCameraInput,
  setActiveCallViewTab,
  setMaximizedParticipant,
  sendEmoji,
  teamState = container.resolve(TeamState),
  callState = container.resolve(CallState),
}) => {
  const selfParticipant = call.getSelfParticipant();
  const {
    sharesScreen: selfSharesScreen,
    sharesCamera: selfSharesCamera,
    handRaisedAt: selfHandRaisedAt,
  } = useKoSubscribableChildren(selfParticipant, ['sharesScreen', 'sharesCamera', 'handRaisedAt']);
  const isSelfHandRaised = Boolean(selfHandRaisedAt);

  const {is1to1: is1to1Conversation} = useKoSubscribableChildren(conversation, ['is1to1']);

  const emojiBarRef = useRef(null);
  const emojiBarToggleButtonRef = useRef(null);

  const {blurredVideoStream} = useKoSubscribableChildren(selfParticipant, ['blurredVideoStream']);
  const hasBlurredBackground = !!blurredVideoStream;

  const {participants} = useKoSubscribableChildren(call, ['participants']);

  const [showEmojisBar, setShowEmojisBar] = useState<boolean>(false);
  const [disabledEmojis, setDisabledEmojis] = useState<string[]>([]);

  const {viewMode, detachedWindow} = useKoSubscribableChildren(callState, ['viewMode', 'detachedWindow']);

  useClickOutside(emojiBarRef, () => setShowEmojisBar(false), emojiBarToggleButtonRef, detachedWindow?.document);

  const {isVideoCallingEnabled} = useKoSubscribableChildren(teamState, ['isVideoCallingEnabled']);

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

  const isMobile = useActiveWindowMatchMedia(QUERY.mobile);

  const [audioOptionsOpen, setAudioOptionsOpen] = useState(false);
  const [videoOptionsOpen, setVideoOptionsOpen] = useState(false);

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

  const isBlurredBackgroundEnabled = Config.getConfig().FEATURE.ENABLE_BLUR_BACKGROUND;

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
    ...(isBlurredBackgroundEnabled ? [blurredBackgroundOptions] : []),
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

  return (
    <ul className="video-controls__wrapper" css={videoControlsWrapperStyles}>
      {!isMobile && (
        <li className="video-controls__item__minimize" css={minimizeVideoControlStyles}>
          <button
            className="video-controls__button video-controls__button--small"
            css={videoControlInActiveStyles}
            onClick={minimize}
            onKeyDown={event => handleKeyDown(event, () => minimize())}
            type="button"
            data-uie-name="do-call-controls-video-minimize"
            title={t('videoCallOverlayCloseFullScreen')}
          >
            {viewMode === CallingViewMode.DETACHED_WINDOW ? <Icon.CloseDetachedWindowIcon /> : <Icon.MessageIcon />}
          </button>
        </li>
      )}
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

        {!isMobile && showSwitchMicrophone && (
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
                    updateAudioOptions(String(selectedOption?.value), String(selectedOption?.value).includes('input'));
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
          {!isMobile && (
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
          )}
        </li>
      )}

      <li className="video-controls__item" css={shareScreenVideoControlStyles}>
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

      <li className="video-controls__item" css={hangUpVideoControlStyles}>
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

      {!isMobile && (
        <>
          {participants.length > 2 && (
            <li className="video-controls__item">
              <button
                onBlur={event => {
                  if (!event.currentTarget.contains(event.relatedTarget) && isCallViewOpen) {
                    toggleCallView();
                  }
                }}
                className={classNames('video-controls__button_primary', {active: isCallViewOpen})}
                onClick={toggleCallView}
                onKeyDown={event => handleKeyDown(event, toggleCallView)}
                type="button"
                data-uie-name="do-call-controls-video-call-view"
                role="switch"
                aria-checked={!isMuted}
                title={t('videoCallOverlayChangeViewMode')}
              >
                {isCallViewOpen && (
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
                )}
                <GridIcon width={16} height={16} />
              </button>
            </li>
          )}

          {Config.getConfig().FEATURE.ENABLE_IN_CALL_HAND_RAISE && !is1to1Conversation && (
            <li className="video-controls__item">
              <button
                data-uie-value={isSelfHandRaised ? 'active' : 'inactive'}
                onClick={() => toggleIsHandRaised(isSelfHandRaised)}
                onKeyDown={event => handleKeyDown(event, () => toggleIsHandRaised(isSelfHandRaised))}
                className={classNames('video-controls__button_primary', {active: isSelfHandRaised})}
                type="button"
                data-uie-name="do-toggle-hand-raise"
                role="switch"
                aria-checked={isSelfHandRaised}
                title={
                  isSelfHandRaised ? t('videoCallParticipantLowerYourHand') : t('videoCallParticipantRaiseYourHand')
                }
              >
                <RaiseHandIcon width={16} height={16} />
              </button>
            </li>
          )}

          {Config.getConfig().FEATURE.ENABLE_IN_CALL_REACTIONS && (
            <li className="video-controls__item">
              {showEmojisBar && (
                <div
                  ref={emojiBarRef}
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
              <button
                ref={emojiBarToggleButtonRef}
                title={t('callReactions')}
                className={classNames('video-controls__button_primary', {active: showEmojisBar})}
                onClick={() => setShowEmojisBar(prev => !prev)}
                type="button"
                aria-labelledby="show-emoji-bar"
                data-uie-name="do-call-controls-video-call-cancel"
              >
                <EmojiIcon />
              </button>
            </li>
          )}

          <li className="video-controls__item">
            <button
              data-uie-value={isParticipantsListOpen ? 'active' : 'inactive'}
              onClick={toggleParticipantsList}
              onKeyDown={event => handleKeyDown(event, toggleParticipantsList)}
              className={classNames('video-controls__button_primary', {active: isParticipantsListOpen})}
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
        </>
      )}
    </ul>
  );
};
