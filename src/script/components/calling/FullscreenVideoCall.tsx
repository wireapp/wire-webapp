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
import cx from 'classnames';
import {container} from 'tsyringe';

import {
  TabIndex,
  Checkbox,
  CheckboxLabel,
  CloseDetachedWindowIcon,
  IconButton,
  IconButtonVariant,
  OpenDetachedWindowIcon,
  QUERY,
} from '@wireapp/react-ui-kit';
import {WebAppEvents} from '@wireapp/webapp-events';

import {useAppNotification} from 'Components/AppNotification/AppNotification';
import {useCallAlertState} from 'Components/calling/useCallAlertState';
import {ConversationClassifiedBar} from 'Components/ClassifiedBar/ClassifiedBar';
import * as Icon from 'Components/Icon';
import {ModalComponent} from 'Components/Modals/ModalComponent';
import type {Call} from 'Repositories/calling/Call';
import {CallingRepository} from 'Repositories/calling/CallingRepository';
import {CallingViewMode, CallState, MuteState} from 'Repositories/calling/CallState';
import {Participant} from 'Repositories/calling/Participant';
import type {Grid} from 'Repositories/calling/videoGridHandler';
import type {Conversation} from 'Repositories/entity/Conversation';
import {MediaDevicesHandler} from 'Repositories/media/MediaDevicesHandler';
import {PropertiesRepository} from 'Repositories/properties/PropertiesRepository';
import {TeamState} from 'Repositories/team/TeamState';
import {useActiveWindowMatchMedia} from 'src/script/hooks/useActiveWindowMatchMedia';
import {useToggleState} from 'src/script/hooks/useToggleState';
import {CallViewTab} from 'src/script/view_model/CallingViewModel';
import {useKoSubscribableChildren} from 'Util/ComponentUtil';
import {isDetachedCallingFeatureEnabled} from 'Util/isDetachedCallingFeatureEnabled';
import {handleKeyDown, KEY} from 'Util/KeyboardUtil';
import {t} from 'Util/LocalizerUtil';
import {preventFocusOutside} from 'Util/util';

import {CallingParticipantList} from './CallingCell/CallIngParticipantList';
import {Duration} from './Duration';
import {
  classifiedBarStyles,
  headerActionsWrapperStyles,
  paginationWrapperStyles,
  videoTopBarStyles,
  minimizeButtonStyles,
  openDetachedWindowButtonStyles,
  paginationStyles,
} from './FullscreenVideoCall.styles';
import {GroupVideoGrid} from './GroupVideoGrid';
import {Pagination} from './Pagination/Pagination';
import {VideoControls} from './VideoControls/VideoControls';

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

const FullscreenVideoCall = ({
  call,
  canShareScreen,
  conversation,
  isChoosingScreen,
  sendEmoji,
  isMuted,
  muteState,
  mediaDevicesHandler,
  propertiesRepository,
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

    if (isSharingScreen && isScreenSharingSourceFromDetachedWindow && !hasAlreadyConfirmed) {
      setIsConfirmCloseModalOpen(true);
      return;
    }

    callingRepository.setViewModeMinimized();
  };
  const openPopup = () => callingRepository.setViewModeDetached();

  const [isParticipantsListOpen, toggleParticipantsList] = useToggleState(false);

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
    const onKeyDown = (event: KeyboardEvent): void => {
      const target = event.target as HTMLElement;

      if (
        viewMode !== CallingViewMode.FULL_SCREEN ||
        target?.getAttribute('aria-controls') === 'epr-search-id' // Exclude emoji search input
      ) {
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

  const callGroupStartedAlert = t(isGroupCall ? 'startedVideoGroupCallingAlert' : 'startedVideoCallingAlert', {
    conversationName,
    cameraStatus: t(selfSharesCamera ? 'cameraStatusOn' : 'cameraStatusOff'),
  });

  const onGoingGroupCallAlert = t(isGroupCall ? 'ongoingGroupVideoCall' : 'ongoingVideoCall', {
    conversationName,
    cameraStatus: t(selfSharesCamera ? 'cameraStatusOn' : 'cameraStatusOff'),
  });

  const isMobile = useActiveWindowMatchMedia(QUERY.mobile);
  const isPaginationVisible = !maximizedParticipant && activeCallViewTab === CallViewTab.ALL && totalPages > 1;

  const isModerator = selfUser && roles[selfUser.id] === DefaultConversationRoleName.WIRE_ADMIN;

  return (
    <div
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
                title={t('videoCallOverlayCloseFullScreen')}
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
                title={t('videoCallOverlayOpenPopupWindow')}
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
              switchBlurredBackground={switchBlurredBackground}
              switchCameraInput={switchCameraInput}
              setActiveCallViewTab={setActiveCallViewTab}
              setMaximizedParticipant={setMaximizedParticipant}
              sendEmoji={sendEmoji}
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
