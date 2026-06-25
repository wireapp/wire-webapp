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

import {ChangeEvent, useEffect, useRef, useState} from 'react';

import {DefaultConversationRoleName} from '@wireapp/api-client/lib/conversation/';
import cx from 'classnames';
import {container} from 'tsyringe';

import {FireAndForgetInvoker} from '@wireapp/core';
import {
  Checkbox,
  CheckboxLabel,
  CloseDetachedWindowIcon,
  IconButton,
  IconButtonVariant,
  OpenDetachedWindowIcon,
  QUERY,
  TabIndex,
} from '@wireapp/react-ui-kit';
import {WebAppEvents} from '@wireapp/webapp-events';

import {useAppNotification} from 'Components/appNotification/appNotification';
import {useCallAlertState} from 'Components/calling/useCallAlertState';
import {VideoBackgroundPerformancePanel} from 'Components/calling/videoControls/videoBackgroundPerformancePanel/videoBackgroundPerformancePanel';
import {ConversationClassifiedBar} from 'Components/classifiedBar/classifiedBar';
import * as Icon from 'Components/icon';
import {ModalComponent} from 'Components/modals/modalComponent';
import type {Call} from 'Repositories/calling/Call';
import {CallingRepository} from 'Repositories/calling/CallingRepository';
import {CallingViewMode, CallState, MuteState} from 'Repositories/calling/CallState';
import {Participant} from 'Repositories/calling/Participant';
import type {Grid} from 'Repositories/calling/videoGridHandler';
import type {Conversation} from 'Repositories/entity/Conversation';
import {detectCapabilities} from 'Repositories/media/backgroundEffects';
import {MediaDevicesHandler} from 'Repositories/media/MediaDevicesHandler';
import {useBackgroundEffectsStore} from 'Repositories/media/useBackgroundEffectsStore';
import type {BackgroundEffectSelection} from 'Repositories/media/VideoBackgroundEffects';
import {BUILTIN_BACKGROUNDS} from 'Repositories/media/VideoBackgroundEffects';
import {PropertiesRepository} from 'Repositories/properties/propertiesRepository';
import {TeamState} from 'Repositories/team/TeamState';
import {useActiveWindowMatchMedia} from 'src/script/hooks/useActiveWindowMatchMedia';
import {useToggleState} from 'src/script/hooks/useToggleState';
import {useApplicationContext} from 'src/script/page/rootProvider';
import {CallViewTab} from 'src/script/view_model/CallingViewModel';
import {useKoSubscribableChildren} from 'Util/componentUtil';
import {isDetachedCallingFeatureEnabled} from 'Util/isDetachedCallingFeatureEnabled';
import {handleKeyDown, isTabKey, KEY} from 'Util/keyboardUtil';
import {preventFocusOutside} from 'Util/util';

import {CallingParticipantList} from './callingCell/callIngParticipantList';
import {Duration} from './duration';
import {
  classifiedBarStyles,
  headerActionsWrapperStyles,
  minimizeButtonStyles,
  openDetachedWindowButtonStyles,
  paginationStyles,
  paginationWrapperStyles,
  videoTopBarStyles,
} from './fullscreenVideoCall.styles';
import {GroupVideoGrid} from './groupVideoGrid';
import {Pagination} from './pagination/pagination';
import {VideoBackgroundSettings} from './videoControls/videoBackgroundSettings/videoBackgroundSettings';
import {VideoControls} from './videoControls/videoControls';

import {useWarningsState} from '../../view_model/WarningsContainer/WarningsState';
import {CONFIG, TYPE} from '../../view_model/WarningsContainer/WarningsTypes';

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

const FullscreenVideoCall = ({
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
  const {translate} = useApplicationContext();
  const [isConfirmCloseModalOpen, setIsConfirmCloseModalOpen] = useState<boolean>(false);
  const selfParticipant = call.getSelfParticipant();
  const {sharesCamera: selfSharesCamera} = useKoSubscribableChildren(selfParticipant, ['sharesCamera']);

  // Warnings banner
  const warnings = useWarningsState(state => state.warnings);
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
  } = useKoSubscribableChildren(call, [
    'activeSpeakers',
    'currentPage',
    'pages',
    'startedAt',
    'participants',
    'handRaisedParticipants',
  ]);
  const {display_name: conversationName} = useKoSubscribableChildren(conversation, ['display_name']);
  const {classifiedDomains} = useKoSubscribableChildren(teamState, ['classifiedDomains']);

  const {selfUser, roles} = useKoSubscribableChildren(conversation, ['selfUser', 'roles']);
  const {emojis, viewMode, detachedWindow, isScreenSharingSourceFromDetachedWindow} = useKoSubscribableChildren(
    callState,
    ['emojis', 'viewMode', 'detachedWindow', 'isScreenSharingSourceFromDetachedWindow'],
  );

  const minimize = () => {
    const isSharingScreen = call?.getSelfParticipant().sharesScreen();

    const hasAlreadyConfirmed = localStorage.getItem(LOCAL_STORAGE_KEY_FOR_SCREEN_SHARING_CONFIRM_MODAL) === 'true';

    const isDetachedWindow = viewMode === CallingViewMode.DETACHED_WINDOW;

    if (isSharingScreen && isScreenSharingSourceFromDetachedWindow && isDetachedWindow && !hasAlreadyConfirmed) {
      setIsConfirmCloseModalOpen(true);
      return;
    }

    callingRepository.setViewModeMinimized();
  };
  const openPopup = () => callingRepository.setViewModeDetached();

  const [isParticipantsListOpen, toggleParticipantsList] = useToggleState(false);
  const [isBackgroundSidebarOpen, setIsBackgroundSidebarOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  const backgroundSidebarHandler = (newValue: boolean): void => {
    setIsBackgroundSidebarOpen(newValue);

    if (isBackgroundSidebarOpen && newValue === false) {
      wrapperRef.current?.focus();
    }
  };

  const callNotification = useAppNotification({
    activeWindow: viewMode === CallingViewMode.DETACHED_WINDOW ? detachedWindow! : window,
  });

  useEffect(() => {
    const handRaisedHandler = (event: Event) => {
      callNotification.show({
        message: (event as CustomEvent<{notificationMessage: string}>).detail.notificationMessage,
      });
    };

    const remoteMutedHandler = (event: Event) => {
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

  function toggleIsHandRaised(currentIsHandRaised: boolean) {
    selfParticipant.handRaisedAt(new Date().getTime());
    sendHandRaised(!currentIsHandRaised, call);
  }

  useEffect(() => {
    const isFullScreen = viewMode === CallingViewMode.FULL_SCREEN || viewMode === CallingViewMode.DETACHED_WINDOW;

    if (!isFullScreen) {
      return undefined;
    }

    const targetDocument =
      viewMode === CallingViewMode.DETACHED_WINDOW && detachedWindow ? detachedWindow.document : document;

    const onKeyDown = (event: KeyboardEvent): void => {
      const target = event.target as HTMLElement;

      if (target?.getAttribute('aria-controls') === 'epr-search-id') {
        // Exclude emoji search input
        return;
      }

      // Allow focus to move into the ChooseScreen dialog if it's open
      const chooseScreenDialog = targetDocument.querySelector('.choose-screen[role="dialog"]');
      if (chooseScreenDialog) {
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
  const isPaginationVisible = !maximizedParticipant && activeCallViewTab === CallViewTab.ALL && totalPages > 1;

  const isModerator = selfUser && roles[selfUser.id] === DefaultConversationRoleName.WIRE_ADMIN;
  const backgroundEffectsHandler = callingRepository.getBackgroundEffectsHandler();
  const isWebGLAvailable = detectCapabilities().webgl2;

  const selectedBackgroundEffect = useBackgroundEffectsStore(state => state.preferredEffect);
  const isHighQualityBlurEnabled = useBackgroundEffectsStore(state => state.isHighQualityBlurEnabled);

  const handleBackgroundSidebarSelect = (effect: BackgroundEffectSelection) => {
    fireAndForgetInvoker.fireAndForget(async (): Promise<void> => {
      await switchVideoBackgroundEffect(effect);
    });
  };

  const handleEnableHighQualityBlur = (event: ChangeEvent<HTMLInputElement>) => {
    callingRepository.allowSuperhighQualityTier(event.target.checked);
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
              onBlur={() => clearShowAlert()}
            >
              <h2 className="video-remote-title">{conversationName}</h2>

              <div data-uie-name="video-timer" className="video-timer label-xs">
                <Duration startedAt={startedAt} />
              </div>
            </div>
          </div>
          <div css={headerActionsWrapperStyles}>
            {!isMobile && isPaginationVisible && (
              <Pagination
                totalPages={totalPages}
                currentPage={currentPage}
                onChangePage={newPage => changePage(newPage, call)}
              />
            )}

            {isMobile && (
              <IconButton
                variant={IconButtonVariant.PRIMARY}
                css={minimizeButtonStyles}
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
                onKeyDown={event =>
                  handleKeyDown({
                    event,
                    callback: openPopup,
                    keys: [KEY.ENTER, KEY.SPACE],
                  })
                }
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
              onEnableHighQualityBlur={handleEnableHighQualityBlur}
              onClose={() => backgroundSidebarHandler(false)}
              highQualityBlurAllowed={isHighQualityBlurEnabled}
              isWebGLAvailable={isWebGLAvailable}
            />
          )}
        </div>

        {isMobile && isPaginationVisible && (
          <div css={paginationWrapperStyles}>
            <Pagination
              totalPages={totalPages}
              currentPage={currentPage}
              onChangePage={newPage => changePage(newPage, call)}
              className={paginationStyles}
            />
          </div>
        )}

        {!isChoosingScreen && (
          <>
            {emojis.map(({id, emoji, left, from}) => (
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
            ))}
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
              onOpenBackgroundSettings={() => backgroundSidebarHandler(true)}
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
          onEnableHighQualityBlur={handleEnableHighQualityBlur}
          onClose={() => backgroundSidebarHandler(false)}
          highQualityBlurAllowed={isHighQualityBlurEnabled}
          isWebGLAvailable={isWebGLAvailable}
        />
      )}
      <ModalComponent
        isShown={isConfirmCloseModalOpen}
        onClosed={() => setIsConfirmCloseModalOpen(false)}
        onBgClick={() => setIsConfirmCloseModalOpen(false)}
        data-uie-name="confirm-close-with-active-screen-share-modal"
        wrapperCSS={{borderRadius: 10, width: 328}}
        container={
          viewMode === CallingViewMode.DETACHED_WINDOW && detachedWindow ? detachedWindow.document.body : undefined
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
                onChange={(event: ChangeEvent<HTMLInputElement>) =>
                  localStorage.setItem(
                    LOCAL_STORAGE_KEY_FOR_SCREEN_SHARING_CONFIRM_MODAL,
                    event.target.checked.toString(),
                  )
                }
              >
                <CheckboxLabel className="label-xs" htmlFor="do-not-ask-again-checkbox">
                  {translate('qualityFeedback.doNotAskAgain')}
                </CheckboxLabel>
              </Checkbox>
              <div className="modal__buttons">
                <button
                  key="cancel"
                  type="button"
                  onClick={() => setIsConfirmCloseModalOpen(false)}
                  data-uie-name="do-close"
                  className="modal__button modal__button--secondary"
                >
                  {translate('modalConfirmSecondary')}
                </button>
                <button
                  type="button"
                  onClick={() => callingRepository.setViewModeMinimized()}
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
              onClick={() => setIsConfirmCloseModalOpen(false)}
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
