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

import React, {useEffect, useState} from 'react';

import {DefaultConversationRoleName} from '@wireapp/api-client/lib/conversation/';
import {TabIndex} from '@wireapp/react-ui-kit/lib/types/enums';
import cx from 'classnames';
import {container} from 'tsyringe';

import {Checkbox, CheckboxLabel, IconButton, IconButtonVariant} from '@wireapp/react-ui-kit';
import {WebAppEvents} from '@wireapp/webapp-events';

import {useAppNotification} from 'Components/AppNotification/AppNotification';
import {useCallAlertState} from 'Components/calling/useCallAlertState';
import {ConversationClassifiedBar} from 'Components/ClassifiedBar/ClassifiedBar';
import * as Icon from 'Components/Icon';
import {ModalComponent} from 'Components/Modals/ModalComponent';
import {CallingRepository} from 'src/script/calling/CallingRepository';
import {useActiveWindowMatchMedia} from 'src/script/hooks/useActiveWindowMatchMedia';
import {useToggleState} from 'src/script/hooks/useToggleState';
import {CallViewTab} from 'src/script/view_model/CallingViewModel';
import {useKoSubscribableChildren} from 'Util/ComponentUtil';
import {isDetachedCallingFeatureEnabled} from 'Util/isDetachedCallingFeatureEnabled';
import {handleKeyDown} from 'Util/KeyboardUtil';
import {t} from 'Util/LocalizerUtil';
import {preventFocusOutside} from 'Util/util';

import {CallingParticipantList} from './CallingCell/CallIngParticipantList';
import {Duration} from './Duration';
import {
  classifiedBarStyles,
  headerActionsWrapperStyles,
  paginationButtonStyles,
  paginationWrapperStyles,
  videoControlInActiveStyles,
  videoTopBarStyles,
} from './FullscreenVideoCall.styles';
import {GroupVideoGrid} from './GroupVideoGrid';
import {Pagination} from './Pagination';
import {useSyncCurrentRange} from './useSyncCurrentRange';
import {VideoControls} from './VideoControls/VideoControls';

import type {Call} from '../../calling/Call';
import {CallingViewMode, CallState, MuteState} from '../../calling/CallState';
import {Participant} from '../../calling/Participant';
import type {Grid} from '../../calling/videoGridHandler';
import type {Conversation} from '../../entity/Conversation';
import {MediaDevicesHandler} from '../../media/MediaDevicesHandler';
import {TeamState} from '../../team/TeamState';
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
  sendHandRaised: (isHandUp: boolean, call: Call) => void;
  videoGrid: Grid;
}

const LOCAL_STORAGE_KEY_FOR_SCREEN_SHARING_CONFIRM_MODAL = 'DO_NOT_ASK_AGAIN_FOR_SCREEN_SHARING_CONFIRM_MODAL';

const DEFAULT_VISIBLE_DOTS = 5;

const FullscreenVideoCall = ({
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
  sendHandRaised,
  teamState = container.resolve(TeamState),
  callState = container.resolve(CallState),
}: FullscreenVideoCallProps) => {
  const [isConfirmCloseModalOpen, setIsConfirmCloseModalOpen] = useState<boolean>(false);
  const selfParticipant = call.getSelfParticipant();
  const {sharesCamera: selfSharesCamera} = useKoSubscribableChildren(selfParticipant, ['sharesScreen', 'sharesCamera']);

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

    if (isSharingScreen && isScreenSharingSourceFromDetachedWindow && !hasAlreadyConfirmed) {
      setIsConfirmCloseModalOpen(true);
      return;
    }

    callingRepository.setViewModeMinimized();
  };
  const openPopup = () => callingRepository.setViewModeDetached();

  const [isParticipantsListOpen, toggleParticipantsList] = useToggleState(false);

  const handRaisedNotification = useAppNotification({
    activeWindow: viewMode === CallingViewMode.DETACHED_WINDOW ? detachedWindow! : window,
  });

  useEffect(() => {
    const handRaisedHandler = (event: Event) => {
      handRaisedNotification.show({
        message: (event as CustomEvent<{notificationMessage: string}>).detail.notificationMessage,
      });
    };

    window.addEventListener(WebAppEvents.CALL.HAND_RAISED, handRaisedHandler);

    return () => {
      window.removeEventListener(WebAppEvents.CALL.HAND_RAISED, handRaisedHandler);
    };
  }, [handRaisedNotification]);

  function toggleIsHandRaised(currentIsHandRaised: boolean) {
    selfParticipant.handRaisedAt(new Date().getTime());
    sendHandRaised(!currentIsHandRaised, call);
  }

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent): void => {
      if (viewMode !== CallingViewMode.FULL_SCREEN) {
        return;
      }

      event.preventDefault();
      event.stopPropagation();

      preventFocusOutside(event, 'video-calling');
    };

    document.addEventListener('keydown', onKeyDown);

    return () => {
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [viewMode]);

  const {showAlert, isGroupCall, clearShowAlert} = useCallAlertState();

  const totalPages = callPages.length;

  // To be changed when design chooses a breakpoint, the conditional can be integrated to the ui-kit directly
  const horizontalSmBreakpoint = useActiveWindowMatchMedia('max-width: 680px');

  const callGroupStartedAlert = t(isGroupCall ? 'startedVideoGroupCallingAlert' : 'startedVideoCallingAlert', {
    conversationName,
    cameraStatus: t(selfSharesCamera ? 'cameraStatusOn' : 'cameraStatusOff'),
  });

  const onGoingGroupCallAlert = t(isGroupCall ? 'ongoingGroupVideoCall' : 'ongoingVideoCall', {
    conversationName,
    cameraStatus: t(selfSharesCamera ? 'cameraStatusOn' : 'cameraStatusOff'),
  });

  const isModerator = selfUser && roles[selfUser.id] === DefaultConversationRoleName.WIRE_ADMIN;

  const [currentStart, setCurrentStart] = useState(0);
  const visibleDots = DEFAULT_VISIBLE_DOTS > totalPages ? totalPages : DEFAULT_VISIBLE_DOTS;

  useSyncCurrentRange({
    currentStart,
    currentPage,
    totalPages,
    visibleDots,
    setCurrentStart,
  });

  const handlePreviousPage = () => {
    if (currentPage === 0) {
      return;
    }

    const previousPage = currentPage - 1;

    // previousPage !== 0 --> jest niepotrzebne prawdopodnie
    if (previousPage === currentStart && previousPage !== 0) {
      setCurrentStart(currentStart => currentStart - 1);
    }

    changePage(previousPage, call);
  };

  const handleNextPage = () => {
    if (currentPage === totalPages - 1) {
      return;
    }

    const nextPage = currentPage + 1;

    if (nextPage === currentStart + visibleDots - 1 && nextPage !== totalPages - 1) {
      setCurrentStart(currentStart => currentStart + 1);
    }

    changePage(nextPage, call);
  };

  return (
    <div
      className={cx('video-calling-wrapper', {
        'app--small-offset': hasOffset && isMiniMode,
        'app--large-offset': hasOffset && !isMiniMode,
      })}
    >
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
          <div css={headerActionsWrapperStyles}>
            {!maximizedParticipant && activeCallViewTab === CallViewTab.ALL && totalPages > 1 && (
              <div css={paginationWrapperStyles}>
                <button
                  data-uie-name="pagination-previous"
                  type="button"
                  onClick={handlePreviousPage}
                  onKeyDown={event => handleKeyDown(event, handlePreviousPage)}
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
                  currentStart={currentStart}
                  visibleDots={visibleDots}
                />
                <button
                  data-uie-name="pagination-next"
                  onClick={handleNextPage}
                  onKeyDown={event => handleKeyDown(event, handleNextPage)}
                  type="button"
                  className="button-reset-default"
                  disabled={currentPage === totalPages - 1}
                  css={{
                    ...paginationButtonStyles,
                    borderBottomLeftRadius: 32,
                    borderTopLeftRadius: 32,
                    right: 0,
                    marginRight: 14,
                  }}
                >
                  <Icon.ChevronRight css={{left: 4, position: 'relative'}} />
                </button>
              </div>
            )}

            {isDetachedCallingFeatureEnabled() && viewMode !== CallingViewMode.DETACHED_WINDOW && (
              <button
                className="video-controls__button video-controls__button--small"
                css={videoControlInActiveStyles}
                onClick={openPopup}
                onKeyDown={event => handleKeyDown(event, () => openPopup())}
                type="button"
                data-uie-name="do-call-controls-video-maximize"
                title={t('videoCallOverlayOpenPopupWindow')}
              >
                <Icon.OpenDetachedWindowIcon />
              </button>
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
        </div>

        {!isChoosingScreen && (
          <div id="video-controls" className="video-controls">
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
            <VideoControls
              activeCallViewTab={activeCallViewTab}
              call={call}
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
              switchBlurredBackground={switchBlurredBackground}
              switchCameraInput={switchCameraInput}
              setActiveCallViewTab={setActiveCallViewTab}
              setMaximizedParticipant={setMaximizedParticipant}
              sendEmoji={sendEmoji}
            />
          </div>
        )}
      </div>
      {isParticipantsListOpen && (
        <CallingParticipantList
          handRaisedParticipants={handRaisedParticipants}
          callingRepository={callingRepository}
          conversation={conversation}
          participants={participants}
          isModerator={isModerator}
          isSelfVerified={selfUser?.is_verified()}
          showParticipants={true}
        />
      )}
      <ModalComponent
        isShown={isConfirmCloseModalOpen}
        onClosed={() => setIsConfirmCloseModalOpen(false)}
        onBgClick={() => setIsConfirmCloseModalOpen(false)}
        data-uie-name="confirm-close-with-active-screen-share-modal"
        wrapperCSS={{borderRadius: 10, width: 328}}
      >
        {isConfirmCloseModalOpen && (
          <>
            <div className="modal__header" data-uie-name="status-modal-title">
              <h2 className="text-medium" id="modal-title">
                {t('videoCallScreenShareEndConfirm')}
              </h2>
            </div>

            <div className="modal__body">
              <div id="modal-description-text">{t('videoCallScreenShareEndConfirmDescription')}</div>
              <Checkbox
                wrapperCSS={{marginTop: 16}}
                data-uie-name="do-not-ask-again-checkbox"
                id="do-not-ask-again-checkbox"
                onChange={(event: React.ChangeEvent<HTMLInputElement>) =>
                  localStorage.setItem(
                    LOCAL_STORAGE_KEY_FOR_SCREEN_SHARING_CONFIRM_MODAL,
                    event.target.checked.toString(),
                  )
                }
              >
                <CheckboxLabel className="label-xs" htmlFor="do-not-ask-again-checkbox">
                  {t('qualityFeedback.doNotAskAgain')}
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
                  {t('modalConfirmSecondary')}
                </button>
                <button
                  type="button"
                  onClick={() => callingRepository.setViewModeMinimized()}
                  className="modal__button modal__button--primary"
                  data-uie-name="do-action"
                  key="modal-primary-button"
                >
                  {t('modalAcknowledgeAction')}
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
    </div>
  );
};

export {FullscreenVideoCall};
