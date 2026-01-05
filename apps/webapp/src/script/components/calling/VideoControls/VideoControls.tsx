/*
 * Wire
 * Copyright (C) 2025 Wire Swiss GmbH
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

import React, {useCallback, useEffect, useMemo, useState} from 'react';

import classNames from 'classnames';
import {container} from 'tsyringe';

import {CALL_TYPE} from '@wireapp/avs';
import {EmojiIcon, GridIcon, MoreIcon, QUERY, RaiseHandIcon, TabIndex} from '@wireapp/react-ui-kit';
import {WebAppEvents} from '@wireapp/webapp-events';

import * as Icon from 'Components/Icon';
import {useActiveWindowMatchMedia} from 'Hooks/useActiveWindowMatchMedia';
import {useUserPropertyValue} from 'Hooks/useUserProperty';
import {Call} from 'Repositories/calling/Call';
import {CallingViewMode, CallState} from 'Repositories/calling/CallState';
import {Participant} from 'Repositories/calling/Participant';
import {Conversation} from 'Repositories/entity/Conversation';
import {ElectronDesktopCapturerSource, MediaDevicesHandler} from 'Repositories/media/MediaDevicesHandler';
import {useMediaDevicesStore} from 'Repositories/media/useMediaDevicesStore';
import {PropertiesRepository} from 'Repositories/properties/PropertiesRepository';
import {PROPERTIES_TYPE} from 'Repositories/properties/PropertiesType';
import {TeamState} from 'Repositories/team/TeamState';
import {Config} from 'src/script/Config';
import {isCallViewOption} from 'src/script/guards/CallView';
import {isMediaDevice} from 'src/script/guards/MediaDevice';
import {ContextMenuEntry, showContextMenu} from 'src/script/ui/ContextMenu';
import {CallViewTab} from 'src/script/view_model/CallingViewModel';
import {useKoSubscribableChildren} from 'Util/ComponentUtil';
import {handleKeyDown, isEscapeKey, KEY} from 'Util/KeyboardUtil';
import {t} from 'Util/LocalizerUtil';

import {EmojisBar} from './EmojisBar/EmojisBar';
import {VideoCallCancelButton} from './VideoCallCancelButton/VideoCallCancelButton';
import {
  moreControlsWrapperStyles,
  videoControlActiveStyles,
  videoControlDisabledStyles,
  videoControlInActiveStyles,
  videoControlsWrapperStyles,
} from './VideoControls.styles';
import {VideoControlsSelect} from './VideoControlsSelect/VideoControlsSelect';

enum BlurredBackgroundStatus {
  OFF = 'bluroff',
  ON = 'bluron',
}

/**
 * Maps video input devices to select options.
 */
const mapVideoInputDevices = (devices: (MediaDeviceInfo | ElectronDesktopCapturerSource)[]) => {
  if (!devices.length) {
    return [
      {
        label: t('videoCallNoCameraAvailable'),
        value: 'no-camera',
        dataUieName: 'no-camera',
        id: 'no-camera',
        isDisabled: true,
      },
    ];
  }

  return devices.map(device => {
    if (isMediaDevice(device)) {
      return {
        label: device.label,
        value: device.deviceId,
        dataUieName: device.deviceId,
        id: device.deviceId,
      };
    }

    return {
      label: device.name,
      value: device.id,
      dataUieName: device.id,
      id: device.id,
    };
  });
};

interface VideoControlsProps {
  activeCallViewTab: string;
  call: Call;
  propertiesRepository: PropertiesRepository;
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

export const VideoControls = ({
  activeCallViewTab,
  call,
  propertiesRepository,
  isMuted,
  isParticipantsListOpen,
  toggleParticipantsList,
  canShareScreen,
  conversation,
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
}: VideoControlsProps) => {
  const selfParticipant = call.getSelfParticipant();
  const {
    sharesScreen: selfSharesScreen,
    sharesCamera: selfSharesCamera,
    handRaisedAt: selfHandRaisedAt,
  } = useKoSubscribableChildren(selfParticipant, ['sharesScreen', 'sharesCamera', 'handRaisedAt']);
  const {
    ENABLE_BLUR_BACKGROUND: isBlurredBackgroundEnabled,
    ENABLE_PRESS_SPACE_TO_UNMUTE: isPressSpaceToUnmuteEnable,
    ENABLE_IN_CALL_REACTIONS: isInCallReactionsEnable,
    ENABLE_IN_CALL_HAND_RAISE: isInCallHandRaiseEnable,
  } = Config.getConfig().FEATURE;

  const isSelfHandRaised = Boolean(selfHandRaisedAt);

  const {is1to1: is1to1Conversation} = useKoSubscribableChildren(conversation, ['is1to1']);

  const {blurredVideoStream} = useKoSubscribableChildren(selfParticipant, ['blurredVideoStream']);
  const hasBlurredBackground = !!blurredVideoStream;

  const {participants} = useKoSubscribableChildren(call, ['participants']);

  const [showEmojisBar, setShowEmojisBar] = useState(false);

  const {viewMode, detachedWindow} = useKoSubscribableChildren(callState, ['viewMode', 'detachedWindow']);

  const {isVideoCallingEnabled} = useKoSubscribableChildren(teamState, ['isVideoCallingEnabled']);

  const {
    currentCameraDevice,
    currentMicrophoneDevice,
    currentSpeakerDevice,
    videoInputDevices,
    audioInputDevices,
    audioOutputDevices,
  } = useMediaDevicesStore(state => ({
    currentCameraDevice: state.video.input.selectedId,
    currentMicrophoneDevice: state.audio.input.selectedId,
    currentSpeakerDevice: state.audio.output.selectedId,
    videoInputDevices: state.video.input.devices,
    audioInputDevices: state.audio.input.devices,
    audioOutputDevices: state.audio.output.devices,
  }));

  const isMobile = useActiveWindowMatchMedia(QUERY.mobile);
  const isDesktop = useActiveWindowMatchMedia(QUERY.desktop);

  const [audioOptionsOpen, setAudioOptionsOpen] = useState(false);
  const [videoOptionsOpen, setVideoOptionsOpen] = useState(false);
  const [isCallViewOpen, setIsCallViewOpen] = useState(false);

  const showToggleVideo =
    isVideoCallingEnabled &&
    (call.initialType === CALL_TYPE.VIDEO || conversation.supportsVideoCall(call.isConference));

  const showSwitchMicrophone = audioInputDevices.length > 1;

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

  const audioOptions = useMemo(
    () => [
      {
        label: t('videoCallaudioInputMicrophone'),
        options: audioInputDevices.map((device: MediaDeviceInfo | ElectronDesktopCapturerSource) => {
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
        options: audioOutputDevices.map((device: MediaDeviceInfo | ElectronDesktopCapturerSource) => {
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
    ],
    [audioInputDevices, audioOutputDevices],
  );

  const [allMicrophones, allSpeaker] = audioOptions;

  // Helper to get the selected audio options from current device IDs
  const getSelectedAudioOptions = useCallback(() => {
    const microphone =
      allMicrophones.options.find(({id}) => id === currentMicrophoneDevice) ?? allMicrophones.options[0];
    const speaker = allSpeaker.options.find(({id}) => id === currentSpeakerDevice) ?? allSpeaker.options[0];
    return [microphone, speaker];
  }, [allMicrophones, allSpeaker, currentMicrophoneDevice, currentSpeakerDevice]);

  const [selectedAudioOptions, setSelectedAudioOptions] = useState(getSelectedAudioOptions);

  // Sync selectedAudioOptions with store when devices change externally (e.g., device removal/fallback)
  useEffect(() => {
    setSelectedAudioOptions(getSelectedAudioOptions());
  }, [getSelectedAudioOptions]);

  const updateAudioOptions = (selectedOption: string, input: boolean) => {
    const [selectedMicrophone, selectedSpeaker] = selectedAudioOptions;
    const microphone = input
      ? (audioOptions[0].options.find(({value}) => value === selectedOption) ?? selectedAudioOptions[0])
      : selectedAudioOptions[0];
    const speaker = !input
      ? (audioOptions[1].options.find(({value}) => value === selectedOption) ?? selectedAudioOptions[1])
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
      options: mapVideoInputDevices(videoInputDevices),
    },
    ...(isBlurredBackgroundEnabled ? [blurredBackgroundOptions] : []),
  ];

  const selectedVideoOptions = [currentCameraDevice, hasBlurredBackground]
    .flatMap(device => videoOptions.flatMap(options => options.options.filter(item => item.id === device)) ?? [])
    .concat(hasBlurredBackground ? blurredBackgroundOptions.options[0] : blurredBackgroundOptions.options[1]);

  const updateVideoOptions = (selectedOption: string | BlurredBackgroundStatus) => {
    const camera = videoOptions[0].options.find(({value}) => value === selectedOption) ?? selectedVideoOptions[0];
    if (selectedOption === BlurredBackgroundStatus.ON) {
      switchBlurredBackground(true);
    } else if (selectedOption === BlurredBackgroundStatus.OFF) {
      switchBlurredBackground(false);
    } else {
      switchCameraInput(camera.id);
    }
  };

  const handleEmojiClick = (selectedEmoji: string) => sendEmoji(selectedEmoji, call);

  const onMoreInteractionsMenuClick = (event: React.MouseEvent) => {
    const mobileEntires: ContextMenuEntry[] = isMobile
      ? [
          {
            click: () => {
              setAudioOptionsOpen(prev => !prev);
            },
            label: t('videoCallMenuMoreAudioSettings'),
            icon: Icon.MicOnIcon,
          },
          {
            click: () => {
              setVideoOptionsOpen(prev => !prev);
            },
            label: t('videoCallMenuMoreVideoSettings'),
            icon: Icon.CameraIcon,
          },
        ]
      : [];

    const emojiBarEntry: ContextMenuEntry[] = isInCallReactionsEnable
      ? [
          {
            click: () => setShowEmojisBar(prev => !prev),
            label: showEmojisBar ? t('videoCallMenuMoreCloseReactions') : t('videoCallMenuMoreAddReaction'),
            icon: props => <EmojiIcon {...props} height={16} width={16} scale={1} />,
          },
        ]
      : [];

    showContextMenu({
      event: event.nativeEvent,
      entries: [
        ...mobileEntires,
        {
          click: () => toggleIsHandRaised(isSelfHandRaised),
          label: isSelfHandRaised ? t('videoCallMenuMoreLowerHand') : t('videoCallMenuMoreRaiseHand'),
          icon: props => <RaiseHandIcon {...props} height={16} width={16} scale={1} />,
        },
        {
          click: () => setIsCallViewOpen(prev => !prev),
          label: t('videoCallMenuMoreChangeView'),
          icon: props => <GridIcon {...props} height={16} width={16} scale={1} />,
        },
        ...emojiBarEntry,
        {
          click: toggleParticipantsList,
          label: isParticipantsListOpen
            ? t('videoCallMenuMoreHideParticipants')
            : t('videoCallMenuMoreSeeParticipants'),
          icon: Icon.PeopleIcon,
        },
      ],
      identifier: 'more-interactions-menu',
    });
  };

  const isPressSpaceToUnmuteEnabled =
    useUserPropertyValue(
      () => propertiesRepository.getPreference(PROPERTIES_TYPE.CALL.ENABLE_PRESS_SPACE_TO_UNMUTE),
      WebAppEvents.PROPERTIES.UPDATE.CALL.ENABLE_PRESS_SPACE_TO_UNMUTE,
    ) && isPressSpaceToUnmuteEnable;

  const isMoreInteractionsMenuActive = isParticipantsListOpen || showEmojisBar || isSelfHandRaised;

  const isInCallHandRaiseControlVisible = isInCallHandRaiseEnable && !is1to1Conversation;

  const emojisBarTargetWindow = viewMode === CallingViewMode.DETACHED_WINDOW ? detachedWindow! : window;

  return (
    <ul id="video-controls" className="video-controls" css={videoControlsWrapperStyles}>
      <div
        css={{
          position: 'absolute',
          top: 0,
          left: 0,
        }}
      >
        {isMobile && audioOptionsOpen && (
          <VideoControlsSelect
            value={selectedAudioOptions}
            id="select-microphone"
            dataUieName="select-microphone"
            options={audioOptions}
            onChange={selectedOption => {
              updateAudioOptions(String(selectedOption?.value), String(selectedOption?.value).includes('input'));
              setAudioOptionsOpen(false);
            }}
            onKeyDown={event => isEscapeKey(event) && setAudioOptionsOpen(false)}
            onMenuClose={() => setAudioOptionsOpen(false)}
            menuIsOpen={audioOptionsOpen}
            menuCSS={{width: '100vw', minWidth: 'initial'}}
          />
        )}
        {isMobile && videoOptionsOpen && (
          <VideoControlsSelect
            value={selectedVideoOptions}
            onChange={selectedOption => {
              updateVideoOptions(String(selectedOption?.value));
              setVideoOptionsOpen(false);
            }}
            onKeyDown={event =>
              handleKeyDown({
                event,
                callback: () => toggleCamera(call),
                keys: [KEY.ENTER, KEY.SPACE],
              })
            }
            id="select-camera"
            dataUieName="select-camera"
            options={videoOptions}
            onMenuClose={() => setVideoOptionsOpen(false)}
            menuIsOpen={videoOptionsOpen}
            menuCSS={{width: '100vw', minWidth: 'initial'}}
          />
        )}
        {!isDesktop && isCallViewOpen && (
          <VideoControlsSelect
            value={selectedCallViewOption}
            id="select-call-view"
            dataUieName="select-call-view"
            options={callViewOptions}
            onChange={selectedOption => {
              if (isCallViewOption(selectedOption)) {
                setIsCallViewOpen(false);
                setActiveCallViewTab(selectedOption.value);
                setMaximizedParticipant(call, null);
              }
            }}
            onKeyDown={event => isEscapeKey(event) && setAudioOptionsOpen(false)}
            onMenuClose={() => setIsCallViewOpen(false)}
            menuIsOpen={isCallViewOpen}
            menuCSS={{width: '100vw', minWidth: 'initial'}}
          />
        )}
      </div>

      {!isMobile && (
        <li className="video-controls__item__minimize">
          <button
            className="video-controls__button video-controls__button--small"
            css={videoControlInActiveStyles}
            onClick={minimize}
            onKeyDown={event =>
              handleKeyDown({
                event,
                callback: minimize,
                keys: [KEY.ENTER, KEY.SPACE],
              })
            }
            type="button"
            data-uie-name="do-call-controls-video-minimize"
            title={t('videoCallOverlayCloseFullScreen')}
          >
            {viewMode === CallingViewMode.DETACHED_WINDOW ? <Icon.CloseDetachedWindowIcon /> : <Icon.MessageIcon />}
          </button>
        </li>
      )}

      <div className="video-controls__centered-items">
        <li className="video-controls__item">
          <button
            className="video-controls__button"
            data-uie-value={isMuted ? 'inactive' : 'active'}
            onClick={() => toggleMute(call, !isMuted)}
            onKeyDown={event =>
              handleKeyDown({
                event,
                callback: () => toggleMute(call, !isMuted),
                keys: isPressSpaceToUnmuteEnabled ? [KEY.ENTER] : [KEY.ENTER, KEY.SPACE],
              })
            }
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
              onKeyDown={event =>
                handleKeyDown({
                  event,
                  callback: () => setAudioOptionsOpen(prev => !prev),
                  keys: [KEY.ENTER, KEY.SPACE],
                })
              }
              onBlur={event => {
                if (!event.currentTarget.contains(event.relatedTarget)) {
                  setAudioOptionsOpen(false);
                }
              }}
              aria-label={
                audioOptionsOpen
                  ? t('videoCallOverlayCloseOptions')
                  : t('videoCallOverlayOpenMicrophoneAndSpeakerOptions')
              }
            >
              {audioOptionsOpen ? (
                <>
                  <VideoControlsSelect
                    value={selectedAudioOptions}
                    id="select-microphone"
                    dataUieName="select-microphone"
                    options={audioOptions}
                    onChange={selectedOption => {
                      updateAudioOptions(
                        String(selectedOption?.value),
                        String(selectedOption?.value).includes('input'),
                      );
                    }}
                    onKeyDown={event => isEscapeKey(event) && setAudioOptionsOpen(false)}
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
              onKeyDown={event =>
                handleKeyDown({
                  event,
                  callback: () => toggleCamera(call),
                  keys: [KEY.ENTER, KEY.SPACE],
                })
              }
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
                onKeyDown={event =>
                  handleKeyDown({
                    event,
                    callback: () => setVideoOptionsOpen(prev => !prev),
                    keys: [KEY.ENTER, KEY.SPACE],
                  })
                }
                onBlur={event => {
                  if (!event.currentTarget.contains(event.relatedTarget)) {
                    setVideoOptionsOpen(false);
                  }
                }}
                aria-label={
                  videoOptionsOpen ? t('videoCallOverlayCloseOptions') : t('videoCallOverlayOpenCameraOptions')
                }
              >
                {videoOptionsOpen ? (
                  <>
                    <VideoControlsSelect
                      value={selectedVideoOptions}
                      onChange={selectedOption => updateVideoOptions(String(selectedOption?.value))}
                      onKeyDown={event => isEscapeKey(event) && setVideoOptionsOpen(false)}
                      id="select-camera"
                      dataUieName="select-camera"
                      options={videoOptions}
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
            onKeyDown={event =>
              handleKeyDown({
                event,
                callback: () => toggleScreenshare(call),
                keys: [KEY.ENTER, KEY.SPACE],
              })
            }
            type="button"
            data-uie-value={selfSharesScreen ? 'active' : 'inactive'}
            data-uie-enabled={canShareScreen ? 'true' : 'false'}
            data-uie-name="do-toggle-screen"
            role="switch"
            aria-checked={selfSharesScreen}
            title={t('videoCallOverlayShareScreen')}
          >
            {selfSharesScreen ? (
              <Icon.ScreenshareIcon width={16} height={16} />
            ) : (
              <Icon.ScreenshareOffIcon width={16} height={16} />
            )}
          </button>
        </li>
        {!isMobile && (
          <li className="video-controls__item">
            <VideoCallCancelButton onAction={() => leave(call)} />
          </li>
        )}
      </div>

      <div css={moreControlsWrapperStyles}>
        {!isDesktop && (
          <li className="video-controls__item">
            {showEmojisBar && (
              <EmojisBar
                onEmojiClick={handleEmojiClick}
                onPickerEmojiClick={() => setShowEmojisBar(false)}
                targetWindow={emojisBarTargetWindow}
              />
            )}
            <button
              title={t('callMenuMoreInteractions')}
              className={classNames(
                {
                  'video-controls__button': isMobile,
                  'video-controls__button_primary': !isMobile,
                },
                {active: isMoreInteractionsMenuActive},
              )}
              css={isMobile && (isMoreInteractionsMenuActive ? videoControlActiveStyles : videoControlInActiveStyles)}
              onClick={onMoreInteractionsMenuClick}
              type="button"
              data-uie-name="video-controls-menu-more-interactions"
            >
              <MoreIcon width={16} height={16} />
            </button>
          </li>
        )}

        {isMobile && (
          <li className="video-controls__item">
            <VideoCallCancelButton onAction={() => leave(call)} />
          </li>
        )}

        {isDesktop && (
          <>
            {isInCallHandRaiseControlVisible && (
              <li className="video-controls__item">
                <button
                  data-uie-value={isSelfHandRaised ? 'active' : 'inactive'}
                  onClick={() => toggleIsHandRaised(isSelfHandRaised)}
                  onKeyDown={event =>
                    handleKeyDown({
                      event,
                      callback: () => toggleIsHandRaised(isSelfHandRaised),
                      keys: [KEY.ENTER, KEY.SPACE],
                    })
                  }
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

            {participants.length > 2 && (
              <li className="video-controls__item">
                <button
                  onBlur={event => {
                    if (!event.currentTarget.contains(event.relatedTarget)) {
                      setIsCallViewOpen(false);
                    }
                  }}
                  className={classNames('video-controls__button_primary', {active: isCallViewOpen})}
                  onClick={() => setIsCallViewOpen(prev => !prev)}
                  onKeyDown={event =>
                    handleKeyDown({
                      event,
                      callback: () => setIsCallViewOpen(prev => !prev),
                      keys: [KEY.ENTER, KEY.SPACE],
                    })
                  }
                  type="button"
                  data-uie-name="do-call-controls-video-call-view"
                  role="switch"
                  aria-checked={!isMuted}
                  title={t('videoCallOverlayChangeViewMode')}
                >
                  {isCallViewOpen && (
                    <VideoControlsSelect
                      value={selectedCallViewOption}
                      id="select-call-view"
                      dataUieName="select-call-view"
                      options={callViewOptions}
                      onChange={selectedOption => {
                        if (isCallViewOption(selectedOption)) {
                          setActiveCallViewTab(selectedOption.value);
                          setMaximizedParticipant(call, null);
                        }
                      }}
                      onKeyDown={event => isEscapeKey(event) && setAudioOptionsOpen(false)}
                      menuIsOpen={isCallViewOpen}
                      wrapperCSS={{marginBottom: 0, width: 0, height: 0}}
                      menuCSS={{right: 0, bottom: 10}}
                    />
                  )}
                  <GridIcon width={16} height={16} />
                </button>
              </li>
            )}

            {isInCallReactionsEnable && (
              <li className="video-controls__item">
                {showEmojisBar && (
                  <EmojisBar
                    onEmojiClick={handleEmojiClick}
                    onPickerEmojiClick={() => setShowEmojisBar(false)}
                    targetWindow={emojisBarTargetWindow}
                  />
                )}
                <button
                  title={t('callReactions')}
                  className={classNames('video-controls__button_primary', {active: showEmojisBar})}
                  onClick={() => setShowEmojisBar(prev => !prev)}
                  type="button"
                  data-uie-name="do-toggle-emojis-bar"
                >
                  <EmojiIcon />
                </button>
              </li>
            )}

            <li className="video-controls__item">
              <button
                data-uie-value={isParticipantsListOpen ? 'active' : 'inactive'}
                onClick={toggleParticipantsList}
                onKeyDown={event =>
                  handleKeyDown({
                    event,
                    callback: toggleParticipantsList,
                    keys: [KEY.ENTER, KEY.SPACE],
                  })
                }
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
      </div>
    </ul>
  );
};
