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

import {ChangeEvent, type FunctionComponent, useEffect, useRef, useState} from 'react';

import type {FireAndForgetInvoker} from '@enormora/fire-and-forget';
import {isNullOrUndefined} from '@sindresorhus/is';
import cx from 'classnames';
import {container} from 'tsyringe';

import {CallingParticipantList} from './CallingCell/CallIngParticipantList';
import {CallSecurityLine} from './callSecurityLine/callSecurityLine';
import {Duration} from './Duration';
import {
  classifiedBarStyles,
  headerActionsWrapperStyles,
  minimizeButtonStyles,
  openDetachedWindowButtonStyles,
  paginationStyles,
  paginationWrapperStyles,
  videoTopBarStyles,
} from './FullscreenVideoCall.styles';
import {GroupVideoGrid} from './GroupVideoGrid';
import {Pagination} from './Pagination/Pagination';
import {useCallAlertState} from './useCallAlertState';
import {VideoBackgroundPerformancePanel} from './VideoControls/videoBackgroundPerformancePanel/videoBackgroundPerformancePanel';
import {VideoBackgroundSettings} from './VideoControls/VideoBackgroundSettings/VideoBackgroundSettings';
import {VideoControls} from './VideoControls/VideoControls';

import {DefaultConversationRoleName} from '../../apiClient/conversation/conversationRole';
import {Config} from '../../Config';
import {
  callSecurityLineFeatureToggleName,
  minimizeSelfViewFeatureToggleName,
} from '../../featureToggles/startupFeatureToggleNames';
import {useActiveWindowMatchMedia} from '../../hooks/useActiveWindowMatchMedia';
import {useToggleState} from '../../hooks/useToggleState';
import {useApplicationContext} from '../../page/rootProvider';
import type {Call} from '../../repositories/calling/Call';
import {CallingRepository} from '../../repositories/calling/CallingRepository';
import {CallingViewMode, CallState, MuteState} from '../../repositories/calling/CallState';
import {Participant} from '../../repositories/calling/Participant';
import type {Grid} from '../../repositories/calling/videoGridHandler';
import type {Conversation} from '../../repositories/entity/Conversation';
import {detectCapabilities} from '../../repositories/media/backgroundEffects';
import {MediaDevicesHandler} from '../../repositories/media/MediaDevicesHandler';
import {BackgroundEffectsQuality, useBackgroundEffectsStore} from '../../repositories/media/useBackgroundEffectsStore';
import type {BackgroundEffectSelection} from '../../repositories/media/VideoBackgroundEffects';
import {BUILTIN_BACKGROUNDS} from '../../repositories/media/VideoBackgroundEffects';
import {PropertiesRepository} from '../../repositories/properties/propertiesRepository';
import {TeamState} from '../../repositories/team/TeamState';
import {CloseDetachedWindowIcon} from '../../uiKit/dataDisplay/icon/closeDetachedWindowIcon';
import {OpenDetachedWindowIcon} from '../../uiKit/dataDisplay/icon/openDetachedWindowIcon';
import {Checkbox, CheckboxLabel} from '../../uiKit/inputs/checkbox/checkbox';
import {IconButton, IconButtonVariant} from '../../uiKit/inputs/iconButton/iconButton';
import {TabIndex} from '../../uiKit/utils/enums';
import {QUERY} from '../../uiKit/utils/mediaQueries';
import {useKoSubscribableChildren} from '../../util/componentUtil';
import {isDetachedCallingFeatureEnabled} from '../../util/isDetachedCallingFeatureEnabled';
import {handleKeyDown, isTabKey, KEY} from '../../util/keyboardUtil';
import {preventFocusOutside} from '../../util/util';
import {CallViewTab} from '../../view_model/CallingViewModel';
import {useWarningsState} from '../../view_model/WarningsContainer/WarningsState';
import {CONFIG, TYPE} from '../../view_model/WarningsContainer/WarningsTypes';
import {WebAppEvents} from '../../webAppEvents';
import {useAppNotification} from '../appNotification/appNotification';
import {ConversationClassifiedBar} from '../classifiedBar/classifiedBar';
import * as Icon from '../icon';
import {ModalComponent} from '../Modals/ModalComponent';

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
  propertiesRepository: PropertiesRepository;
  callingRepository: CallingRepository;
  mediaDevicesHandler: MediaDevicesHandler;
  muteState: MuteState;
  setActiveCallViewTab: (tab: CallViewTab) => void;
  setMaximizedParticipant: (call: Call, participant: Participant | null) => void;
  switchCameraInput: (deviceId: string) => void;
  switchMicrophoneInput: (deviceId: string) => void;
  switchSpeakerOutput: (deviceId: string) => void;
  switchVideoBackgroundEffect: (effect: BackgroundEffectSelection) => void;
  fireAndForgetInvoker: FireAndForgetInvoker;
  teamState?: TeamState;
  callState?: CallState;
  toggleCamera: (call: Call) => void;
  toggleMute: (call: Call, muteState: boolean) => void;
  toggleScreenshare: (call: Call) => void;
  sendEmoji: (emoji: string, call: Call) => void;
  sendHandRaised: (isHandUp: boolean, call: Call) => void;
  videoGrid: Grid;
}

const LOCAL_STORAGE_KEY_FOR_SCREEN_SHARING_CONFIRM_MODAL = 'DO_NOT_ASK_AGAIN_FOR_SCREEN_SHARING_CONFIRM_MODAL';

const FullscreenVideoCall: FunctionComponent<FullscreenVideoCallProps> = ({
  call,
  canShareScreen,
  conversation,
  isChoosingScreen,
  sendEmoji,
  isMuted,
  mediaDevicesHandler,
  propertiesRepository,
  callingRepository,
  videoGrid,
  maximizedParticipant,
  activeCallViewTab,
  switchCameraInput,
  switchMicrophoneInput,
  switchSpeakerOutput,
  switchVideoBackgroundEffect,
  fireAndForgetInvoker,
  setMaximizedParticipant,
  setActiveCallViewTab,
  toggleMute,
  toggleCamera,
  toggleScreenshare,
  leave,
  changePage,
  sendHandRaised,
  teamState = container.resolve(TeamState),
  callState = container.resolve(CallState),
}: FullscreenVideoCallProps) => {
  const {isFeatureToggleEnabled, translate} = useApplicationContext();
  const [isConfirmCloseModalOpen, setIsConfirmCloseModalOpen] = useState<boolean>(false);
  const selfParticipant = call.getSelfParticipant();
  const {sharesCamera: selfSharesCamera} = useKoSubscribableChildren(selfParticipant, ['sharesCamera']);

  // Warnings banner
  const warnings = useWarningsState(state => {
    return state.warnings;
  });
  const visibleWarning = warnings[warnings.length - 1];
  const isConnectivityRecovery = visibleWarning === TYPE.CONNECTIVITY_RECOVERY;
  const hasOffset = warnings.length > 0 && !isConnectivityRecovery;
  const isMiniMode = CONFIG.MINI_MODES.includes(visibleWarning);

  const {
    activeSpeakers,
    currentPage,
    pages: callPages,
    startedAt,
    participants,
    handRaisedParticipants,
    state: callConnectionState,
  } = useKoSubscribableChildren(call, [
    'activeSpeakers',
    'currentPage',
    'pages',
    'startedAt',
    'participants',
    'handRaisedParticipants',
    'state',
  ]);
  const {display_name: conversationName} = useKoSubscribableChildren(conversation, ['display_name']);
  const {classifiedDomains} = useKoSubscribableChildren(teamState, ['classifiedDomains']);
  const {BRAND_NAME: brandName, URL: configUrls} = Config.getConfig();
  const isCallSecurityLineEnabled = isFeatureToggleEnabled(callSecurityLineFeatureToggleName);
  const isSelfViewMinimizationEnabled = isFeatureToggleEnabled(minimizeSelfViewFeatureToggleName);
  const callEncryptionSupportUrl = configUrls.SUPPORT.CALL_ENCRYPTION;

  const {selfUser, roles} = useKoSubscribableChildren(conversation, ['selfUser', 'roles']);
  const {emojis, viewMode, detachedWindow, isScreenSharingSourceFromDetachedWindow} = useKoSubscribableChildren(
    callState,
    ['emojis', 'viewMode', 'detachedWindow', 'isScreenSharingSourceFromDetachedWindow'],
  );

  const minimize = (): void => {
    const isSharingScreen = call?.getSelfParticipant().sharesScreen();

    const hasAlreadyConfirmed = localStorage.getItem(LOCAL_STORAGE_KEY_FOR_SCREEN_SHARING_CONFIRM_MODAL) === 'true';

    const isDetachedWindow = viewMode === CallingViewMode.DETACHED_WINDOW;

    if (isSharingScreen && isScreenSharingSourceFromDetachedWindow && isDetachedWindow && !hasAlreadyConfirmed) {
      setIsConfirmCloseModalOpen(true);
      return;
    }

    callingRepository.setViewModeMinimized();
  };
  const openPopup = (): Promise<void> => {
    return callingRepository.setViewModeDetached();
  };

  const [isParticipantsListOpen, toggleParticipantsList] = useToggleState(false);
  const [isBackgroundSidebarOpen, setIsBackgroundSidebarOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  const backgroundSidebarHandler = (newValue: boolean): void => {
    setIsBackgroundSidebarOpen(newValue);

    if (isBackgroundSidebarOpen && !newValue) {
      wrapperRef.current?.focus();
    }
  };

  const activeWindow = viewMode === CallingViewMode.DETACHED_WINDOW ? detachedWindow : window;
  if (isNullOrUndefined(activeWindow)) {
    throw new Error('The detached calling window is not available');
  }
  const callNotification = useAppNotification({activeWindow});

  useEffect(() => {
    const handRaisedHandler = (event: Event): void => {
      callNotification.show({
        message: (event as CustomEvent<{notificationMessage: string}>).detail.notificationMessage,
      });
    };

    const remoteMutedHandler = (event: Event): void => {
      callNotification.show({
        message: (event as CustomEvent<{notificationMessage: string}>).detail.notificationMessage,
      });
    };

    window.addEventListener(WebAppEvents.CALL.HAND_RAISED, handRaisedHandler);
    window.addEventListener(WebAppEvents.CALL.REMOTE_MUTED, remoteMutedHandler);

    return () => {
      window.removeEventListener(WebAppEvents.CALL.HAND_RAISED, handRaisedHandler);
      window.removeEventListener(WebAppEvents.CALL.REMOTE_MUTED, remoteMutedHandler);
    };
  }, [callNotification]);

  function toggleIsHandRaised(currentIsHandRaised: boolean): void {
    selfParticipant.handRaisedAt(new Date().getTime());
    sendHandRaised(!currentIsHandRaised, call);
  }

  useEffect(() => {
    const isFullScreen = viewMode === CallingViewMode.FULL_SCREEN || viewMode === CallingViewMode.DETACHED_WINDOW;

    if (!isFullScreen) {
      return undefined;
    }

    const targetDocument =
      viewMode === CallingViewMode.DETACHED_WINDOW && !isNullOrUndefined(detachedWindow)
        ? detachedWindow.document
        : document;

    const onKeyDown = (event: KeyboardEvent): void => {
      const target = event.target as HTMLElement;

      if (target?.getAttribute('aria-controls') === 'epr-search-id') {
        // Exclude emoji search input
        return;
      }

      // Allow focus to move into the ChooseScreen dialog if it's open
      const chooseScreenDialog = targetDocument.querySelector('.choose-screen[role="dialog"]');
      if (chooseScreenDialog !== null) {
        return;
      }

      if (!isTabKey(event)) {
        return;
      }

      event.preventDefault();
      event.stopPropagation();

      preventFocusOutside(event, 'video-calling-wrapper', targetDocument);
    };

    targetDocument.addEventListener('keydown', onKeyDown);

    return () => {
      targetDocument.removeEventListener('keydown', onKeyDown);
    };
  }, [viewMode, detachedWindow]);

  const {showAlert, isGroupCall, clearShowAlert} = useCallAlertState();

  const totalPages = callPages.length;

  const callGroupStartedAlert = translate(isGroupCall ? 'startedVideoGroupCallingAlert' : 'startedVideoCallingAlert', {
    conversationName,
    cameraStatus: translate(selfSharesCamera ? 'cameraStatusOn' : 'cameraStatusOff'),
  });

  const onGoingGroupCallAlert = translate(isGroupCall ? 'ongoingGroupVideoCall' : 'ongoingVideoCall', {
    conversationName,
    cameraStatus: translate(selfSharesCamera ? 'cameraStatusOn' : 'cameraStatusOff'),
  });

  const isMobile = useActiveWindowMatchMedia(QUERY.mobile);
  const isPaginationVisible =
    isNullOrUndefined(maximizedParticipant) && activeCallViewTab === CallViewTab.ALL && totalPages > 1;

  const isModerator = !isNullOrUndefined(selfUser) && roles[selfUser.id] === DefaultConversationRoleName.WIRE_ADMIN;
  const backgroundEffectsHandler = callingRepository.getBackgroundEffectsHandler();
  const isWebGLAvailable = detectCapabilities().webgl2;

  const selectedBackgroundEffect = useBackgroundEffectsStore(state => {
    return state.preferredEffect;
  });
  const backgroundEffectsQuality = useBackgroundEffectsStore(state => {
    return state.effectiveQualityTier;
  });

  const handleBackgroundSidebarSelect = (effect: BackgroundEffectSelection): void => {
    fireAndForgetInvoker.fireAndForget(async (): Promise<void> => {
      await switchVideoBackgroundEffect(effect);
    });
  };

  const handleBackgroundEffectsQualityChange = (quality: BackgroundEffectsQuality): void => {
    callingRepository.setBackgroundEffectsQualityTier(quality);
  };

  return (
    <div
      id="video-calling-wrapper"
      ref={wrapperRef}
      tabIndex={-1}
      data-uie-name="fullscreen-video-call"
      className={cx('video-calling-wrapper', {
        'app--small-offset': hasOffset && isMiniMode,
        'app--large-offset': hasOffset && !isMiniMode,
      })}
    >
      <div id="video-calling" className="video-calling">
        <div css={videoTopBarStyles}>
          <div id="video-title" className="video-title">
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
              onBlur={() => {
                return clearShowAlert();
              }}
            >
              <h2 className="video-remote-title">{conversationName}</h2>

              <div data-uie-name="video-timer" className="video-timer label-xs">
                {isCallSecurityLineEnabled ? (
                  <CallSecurityLine
                    callConnectionState={callConnectionState}
                    participants={participants}
                    startedAt={startedAt}
                    brandName={brandName}
                    supportUrl={callEncryptionSupportUrl}
                  />
                ) : (
                  <Duration startedAt={startedAt} />
                )}
              </div>
            </div>
          </div>
          <div css={headerActionsWrapperStyles}>
            {!isMobile && isPaginationVisible && (
              <Pagination
                totalPages={totalPages}
                currentPage={currentPage}
                onChangePage={newPage => {
                  return changePage(newPage, call);
                }}
              />
            )}

            {isMobile && (
              <IconButton
                variant={IconButtonVariant.PRIMARY}
                css={minimizeButtonStyles}
                onClick={minimize}
                onKeyDown={event => {
                  return handleKeyDown({
                    event,
                    callback: minimize,
                    keys: [KEY.ENTER, KEY.SPACE],
                  });
                }}
                type="button"
                data-uie-name="do-call-controls-video-minimize"
                title={translate('videoCallOverlayCloseFullScreen')}
              >
                {viewMode === CallingViewMode.DETACHED_WINDOW ? <CloseDetachedWindowIcon /> : <Icon.MessageIcon />}
              </IconButton>
            )}

            {isDetachedCallingFeatureEnabled() && viewMode !== CallingViewMode.DETACHED_WINDOW && (
              <IconButton
                variant={IconButtonVariant.PRIMARY}
                css={openDetachedWindowButtonStyles}
                onClick={openPopup}
                onKeyDown={event => {
                  return handleKeyDown({
                    event,
                    callback: openPopup,
                    keys: [KEY.ENTER, KEY.SPACE],
                  });
                }}
                type="button"
                data-uie-name="do-call-controls-video-maximize"
                title={translate('videoCallOverlayOpenPopupWindow')}
              >
                <OpenDetachedWindowIcon />
              </IconButton>
            )}
          </div>
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
            call={call}
            allowSelfVideoMinimize={isSelfViewMinimizationEnabled}
            setMaximizedParticipant={participant => {
              return setMaximizedParticipant(call, participant);
            }}
          />
          {classifiedDomains !== undefined && (
            <ConversationClassifiedBar
              conversation={conversation}
              classifiedDomains={classifiedDomains}
              style={{
                ...classifiedBarStyles,
              }}
            />
          )}

          {isMobile && isParticipantsListOpen && (
            <CallingParticipantList
              handRaisedParticipants={handRaisedParticipants}
              callingRepository={callingRepository}
              conversation={conversation}
              participants={participants}
              isModerator={isModerator}
              isSelfVerified={selfUser?.is_verified()}
              showParticipants={true}
              onClose={toggleParticipantsList}
            />
          )}
          {isMobile && isBackgroundSidebarOpen && (
            <VideoBackgroundSettings
              selectedEffect={selectedBackgroundEffect}
              backgrounds={BUILTIN_BACKGROUNDS}
              onSelectEffect={handleBackgroundSidebarSelect}
              backgroundEffectsQuality={backgroundEffectsQuality}
              onBackgroundEffectsQualityChange={handleBackgroundEffectsQualityChange}
              onClose={() => {
                return backgroundSidebarHandler(false);
              }}
              isWebGLAvailable={isWebGLAvailable}
            />
          )}
        </div>

        {isMobile && isPaginationVisible && (
          <div css={paginationWrapperStyles}>
            <Pagination
              totalPages={totalPages}
              currentPage={currentPage}
              onChangePage={newPage => {
                return changePage(newPage, call);
              }}
              className={paginationStyles}
            />
          </div>
        )}

        {!isChoosingScreen && (
          <>
            {emojis.map(({id, emoji, left, from}) => {
              return (
                <div
                  key={id}
                  role="img"
                  className="emoji"
                  aria-label={translate('callReactionsAriaLabel', {from, emoji})}
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
              );
            })}
            <VideoControls
              activeCallViewTab={activeCallViewTab}
              call={call}
              propertiesRepository={propertiesRepository}
              isMuted={isMuted}
              isParticipantsListOpen={isParticipantsListOpen}
              toggleParticipantsList={toggleParticipantsList}
              canShareScreen={canShareScreen}
              conversation={conversation}
              mediaDevicesHandler={mediaDevicesHandler}
              minimize={minimize}
              leave={leave}
              toggleMute={toggleMute}
              toggleScreenshare={toggleScreenshare}
              toggleCamera={toggleCamera}
              toggleIsHandRaised={toggleIsHandRaised}
              switchMicrophoneInput={switchMicrophoneInput}
              switchSpeakerOutput={switchSpeakerOutput}
              switchVideoBackgroundEffect={switchVideoBackgroundEffect}
              switchCameraInput={switchCameraInput}
              setActiveCallViewTab={setActiveCallViewTab}
              setMaximizedParticipant={setMaximizedParticipant}
              sendEmoji={sendEmoji}
              onOpenBackgroundSettings={() => {
                return backgroundSidebarHandler(true);
              }}
              isWebGLAvailable={isWebGLAvailable}
            />
          </>
        )}
      </div>
      {!isMobile && isParticipantsListOpen && (
        <CallingParticipantList
          handRaisedParticipants={handRaisedParticipants}
          callingRepository={callingRepository}
          conversation={conversation}
          participants={participants}
          isModerator={isModerator}
          isSelfVerified={selfUser?.is_verified()}
          showParticipants={true}
          onClose={toggleParticipantsList}
        />
      )}
      {!isMobile && isBackgroundSidebarOpen && (
        <VideoBackgroundSettings
          selectedEffect={selectedBackgroundEffect}
          backgrounds={BUILTIN_BACKGROUNDS}
          onSelectEffect={handleBackgroundSidebarSelect}
          backgroundEffectsQuality={backgroundEffectsQuality}
          onBackgroundEffectsQualityChange={handleBackgroundEffectsQualityChange}
          onClose={() => {
            return backgroundSidebarHandler(false);
          }}
          isWebGLAvailable={isWebGLAvailable}
        />
      )}
      <ModalComponent
        isShown={isConfirmCloseModalOpen}
        onClosed={() => {
          return setIsConfirmCloseModalOpen(false);
        }}
        onBgClick={() => {
          return setIsConfirmCloseModalOpen(false);
        }}
        data-uie-name="confirm-close-with-active-screen-share-modal"
        wrapperCSS={{borderRadius: 10, width: 328}}
        container={
          viewMode === CallingViewMode.DETACHED_WINDOW && !isNullOrUndefined(detachedWindow)
            ? detachedWindow.document.body
            : undefined
        }
      >
        {isConfirmCloseModalOpen && (
          <>
            <div className="modal__header" data-uie-name="status-modal-title">
              <h2 className="text-medium" id="modal-title">
                {translate('videoCallScreenShareEndConfirm')}
              </h2>
            </div>

            <div className="modal__body">
              <div id="modal-description-text">{translate('videoCallScreenShareEndConfirmDescription')}</div>
              <Checkbox
                wrapperCSS={{marginTop: 16}}
                data-uie-name="do-not-ask-again-checkbox"
                id="do-not-ask-again-checkbox"
                onChange={(event: ChangeEvent<HTMLInputElement>) => {
                  return localStorage.setItem(
                    LOCAL_STORAGE_KEY_FOR_SCREEN_SHARING_CONFIRM_MODAL,
                    event.target.checked.toString(),
                  );
                }}
              >
                <CheckboxLabel className="label-xs" htmlFor="do-not-ask-again-checkbox">
                  {translate('qualityFeedback.doNotAskAgain')}
                </CheckboxLabel>
              </Checkbox>
              <div className="modal__buttons">
                <button
                  key="cancel"
                  type="button"
                  onClick={() => {
                    return setIsConfirmCloseModalOpen(false);
                  }}
                  data-uie-name="do-close"
                  className="modal__button modal__button--secondary"
                >
                  {translate('modalConfirmSecondary')}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    return callingRepository.setViewModeMinimized();
                  }}
                  className="modal__button modal__button--primary"
                  data-uie-name="do-action"
                  key="modal-primary-button"
                >
                  {translate('modalAcknowledgeAction')}
                </button>
              </div>
            </div>

            <button
              type="button"
              className="modal__header__button"
              onClick={() => {
                return setIsConfirmCloseModalOpen(false);
              }}
              aria-label={'closeBtnTitle'}
              data-uie-name="do-close"
            >
              <Icon.CloseIcon className="modal__header__icon" aria-hidden="true" />
            </button>
          </>
        )}
      </ModalComponent>
      <VideoBackgroundPerformancePanel backgroundEffectsHandler={backgroundEffectsHandler} />
    </div>
  );
};

export {FullscreenVideoCall};
