/*
 * Wire
 * Copyright (C) 2024 Wire Swiss GmbH
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

import cx from 'classnames';
import {container} from 'tsyringe';

import {
  cellControlsList,
  cellControlsWrapper,
} from 'Components/calling/CallingCell/CallingControls/CallingControls.styles';
import {useCallAlertState} from 'Components/calling/useCallAlertState';
import * as Icon from 'Components/Icon';
import {Call} from 'Repositories/calling/Call';
import {DesktopScreenShareMenu} from 'Repositories/calling/CallState';
import {Participant} from 'Repositories/calling/Participant';
import {TeamState} from 'Repositories/team/TeamState';
import {useKoSubscribableChildren} from 'Util/ComponentUtil';
import {t} from 'Util/LocalizerUtil';

import {CallActions} from '../../../../view_model/CallingViewModel';

interface CallingControlsProps {
  answerCall: () => void;
  call: Call;
  callActions: CallActions;
  call1To1StartedAlert: string;
  isDetachedWindow: boolean;
  isFullUi?: boolean;
  isMuted?: boolean;
  isIncoming: boolean;
  isOutgoing: boolean;
  isOngoing: boolean;
  isDeclined: boolean;
  isGroup: boolean;
  isVideoCall: boolean;
  isConnecting?: boolean;
  selfParticipant: Participant;
  disableScreenButton: boolean;
  teamState: TeamState;
  supportsVideoCall: boolean;
  isAnswerButtonDisabled?: boolean;
}

export const CallingControls = ({
  answerCall,
  call,
  callActions,
  call1To1StartedAlert,
  isFullUi,
  isMuted,
  isConnecting,
  isDetachedWindow,
  isIncoming,
  isOutgoing,
  isDeclined,
  disableScreenButton,
  isVideoCall,
  isOngoing,
  isGroup,
  selfParticipant,
  teamState = container.resolve(TeamState),
  supportsVideoCall,
  isAnswerButtonDisabled = false,
}: CallingControlsProps) => {
  const {isVideoCallingEnabled} = useKoSubscribableChildren(teamState, ['isVideoCallingEnabled']);
  const {sharesScreen: selfSharesScreen, sharesCamera: selfSharesCamera} = useKoSubscribableChildren(selfParticipant, [
    'sharesScreen',
    'sharesCamera',
  ]);

  const {showAlert, clearShowAlert} = useCallAlertState();

  const isVideoUnsupported = !selfSharesCamera && !supportsVideoCall;
  const showVideoButton = isVideoCallingEnabled && (isVideoCall || isOngoing);
  const disableVideoButton = (isOutgoing && selfSharesCamera) || isVideoUnsupported;

  return (
    <div css={cellControlsWrapper}>
      <ul css={cellControlsList}>
        {isFullUi && (
          <>
            <li>
              <button
                className={cx('call-ui__button', {'call-ui__button--active': !isMuted})}
                onClick={() => callActions.toggleMute(call, !isMuted)}
                data-uie-name="do-toggle-mute"
                data-uie-value={isMuted ? 'active' : 'inactive'}
                title={t('videoCallOverlayMicrophone')}
                type="button"
                role="switch"
                aria-checked={!isMuted}
                disabled={isConnecting}
              >
                {isMuted ? <Icon.MicOffIcon className="small-icon" /> : <Icon.MicOnIcon className="small-icon" />}
              </button>
            </li>

            {showVideoButton && (
              <li>
                <button
                  className={cx('call-ui__button', {'call-ui__button--active': selfSharesCamera})}
                  onClick={() => callActions.toggleCamera(call)}
                  disabled={disableVideoButton}
                  data-uie-name="do-toggle-video"
                  title={t('videoCallOverlayCamera')}
                  type="button"
                  role="switch"
                  aria-checked={selfSharesCamera}
                  data-uie-value={selfSharesCamera ? 'active' : 'inactive'}
                >
                  {selfSharesCamera ? (
                    <Icon.CameraIcon className="small-icon" />
                  ) : (
                    <Icon.CameraOffIcon className="small-icon" />
                  )}
                </button>
              </li>
            )}

            {isOngoing && (
              <li>
                <button
                  className={cx('call-ui__button', {
                    'call-ui__button--active': selfSharesScreen,
                    'call-ui__button--disabled': disableScreenButton,
                    'with-tooltip with-tooltip--bottom': disableScreenButton,
                  })}
                  data-tooltip={disableScreenButton ? t('videoCallScreenShareNotSupported') : undefined}
                  onClick={() => callActions.toggleScreenshare(call, DesktopScreenShareMenu.MAIN_WINDOW)}
                  type="button"
                  data-uie-name="do-call-controls-toggle-screenshare"
                  data-uie-value={selfSharesScreen ? 'active' : 'inactive'}
                  data-uie-enabled={disableScreenButton ? 'false' : 'true'}
                  title={t('videoCallOverlayShareScreen')}
                  disabled={disableScreenButton}
                >
                  {selfSharesScreen ? (
                    <Icon.ScreenshareIcon className="small-icon" />
                  ) : (
                    <Icon.ScreenshareOffIcon className="small-icon" />
                  )}
                </button>
              </li>
            )}
          </>
        )}
      </ul>

      <ul css={cellControlsList}>
        {(isIncoming || isOutgoing) && !isDeclined && (
          <li>
            <button
              ref={element => {
                if (showAlert && !isGroup) {
                  element?.focus();
                }
              }}
              className="call-ui__button call-ui__button--red call-ui__button--large"
              onClick={() => (isIncoming ? callActions.reject(call) : callActions.leave(call))}
              onBlur={() => clearShowAlert()}
              title={!isGroup && showAlert ? call1To1StartedAlert : t('videoCallOverlayHangUp')}
              aria-label={!isGroup && showAlert ? call1To1StartedAlert : t('videoCallOverlayHangUp')}
              type="button"
              data-uie-name="do-call-controls-call-decline"
            >
              <Icon.HangupIcon className="small-icon" style={{maxWidth: 17}} />
            </button>
          </li>
        )}

        {isIncoming && (
          <li>
            {isDeclined ? (
              <button
                className="call-ui__button call-ui__button--green call-ui__button--join call-ui__button--join--large "
                onClick={answerCall}
                type="button"
                data-uie-name="do-call-controls-call-join"
                disabled={isAnswerButtonDisabled}
              >
                {t('callJoin')}
              </button>
            ) : (
              <button
                className="call-ui__button call-ui__button--green call-ui__button--large"
                onClick={answerCall}
                type="button"
                title={t('callAccept')}
                aria-label={t('callAccept')}
                data-uie-name="do-call-controls-call-accept"
                disabled={isAnswerButtonDisabled}
              >
                <Icon.PickupIcon className="small-icon" />
              </button>
            )}
          </li>
        )}

        {(isConnecting || isOngoing) && (
          <li>
            <button
              className="call-ui__button call-ui__button--red"
              onClick={() => callActions.leave(call)}
              title={t('videoCallOverlayHangUp')}
              type="button"
              data-uie-name="do-call-controls-call-leave"
            >
              <Icon.HangupIcon className="small-icon" style={{maxWidth: 17}} />
            </button>
          </li>
        )}
      </ul>
    </div>
  );
};
