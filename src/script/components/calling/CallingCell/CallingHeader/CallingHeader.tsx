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

import {TabIndex} from '@wireapp/react-ui-kit/lib/types/enums';

import {Avatar, AVATAR_SIZE, GroupAvatar} from 'Components/Avatar';
import {useDetachedCallingFeatureState} from 'Components/calling/DetachedCallingCell/DetachedCallingFeature.state';
import {Duration} from 'Components/calling/Duration';
import * as Icon from 'Components/Icon';
import {t} from 'Util/LocalizerUtil';

import {
  callAvatar,
  callDescription,
  callDetails,
  callingHeaderContainer,
  callingHeaderWrapper,
  cbrCallState,
  conversationCallName,
  detachedWindowButton,
} from './CallingHeader.styles';

import {User} from '../../../../entity/User';
import {createNavigate, createNavigateKeyboard} from '../../../../router/routerBindings';

interface CallingHeaderProps {
  isOngoing: boolean;
  isGroup: boolean;

  showAlert: boolean;
  isVideoCall: boolean;
  clearShowAlert: () => void;
  conversationUrl: string;
  callStartedAlert: string;
  ongoingCallAlert: string;
  isTemporaryUser: boolean;
  conversationParticipants: User[];
  conversationName: string;
  currentCallStatus: any;
  startedAt?: number;
  isCbrEnabled: boolean;
  toggleDetachedWindow: () => void;
  isDetached: boolean;
  isDetachedWindow: boolean;
}

export const CallingHeader = ({
  isGroup,
  isOngoing,
  showAlert,
  isVideoCall,
  clearShowAlert,
  conversationUrl,
  callStartedAlert,
  ongoingCallAlert,
  isTemporaryUser,
  conversationParticipants,
  conversationName,
  currentCallStatus,
  startedAt,
  isCbrEnabled,
  toggleDetachedWindow,
  isDetached,
  isDetachedWindow,
}: CallingHeaderProps) => {
  const isDetachedCallingFeatureEnabled = useDetachedCallingFeatureState(state => state.isSupported());
  const isDetachedWindowActive = isDetachedWindow ? isDetached : true;

  return (
    <div css={callingHeaderContainer}>
      <div
        ref={element => {
          if ((isGroup || isOngoing) && showAlert && !isVideoCall) {
            element?.focus();
          }
        }}
        css={callingHeaderWrapper}
        onClick={createNavigate(conversationUrl)}
        onBlur={() => {
          if (isGroup || isOngoing) {
            clearShowAlert();
          }
        }}
        onKeyDown={createNavigateKeyboard(conversationUrl)}
        tabIndex={TabIndex.FOCUSABLE}
        role="button"
        aria-label={
          showAlert
            ? callStartedAlert
            : `${isOngoing ? `${ongoingCallAlert} ` : ''}${t('accessibility.openConversation', conversationName)}`
        }
      >
        {isDetachedWindowActive && !isTemporaryUser && (
          <div css={callAvatar}>
            {isGroup && <GroupAvatar users={conversationParticipants} />}
            {!isGroup && !!conversationParticipants.length && (
              <Avatar participant={conversationParticipants[0]} avatarSize={AVATAR_SIZE.SMALL} />
            )}
          </div>
        )}

        <h2 css={callDetails}>
          <div css={conversationCallName}>{conversationName} - long name test</div>

          {currentCallStatus && (
            <div data-uie-name={currentCallStatus.dataUieName} css={callDescription}>
              {currentCallStatus.text}
            </div>
          )}

          {isOngoing && startedAt && (
            <div css={callDescription}>
              {isDetachedWindow && !isDetached ? (
                <span data-uie-name="call-lead" aria-label={t('viewingInAnotherWindow')}>
                  {t('viewingInAnotherWindow')}
                </span>
              ) : (
                <span data-uie-name="call-duration" aria-label={t('callDurationLabel')}>
                  <Duration {...{startedAt}} />
                </span>
              )}

              {isCbrEnabled && isDetachedWindowActive && (
                <span
                  title={t('callStateCbr')}
                  aria-label={t('callStateCbr')}
                  data-uie-name="call-cbr"
                  css={cbrCallState}
                >
                  CBR
                </span>
              )}
            </div>
          )}
        </h2>
      </div>

      {isOngoing && isDetachedCallingFeatureEnabled && (
        <div>
          <button css={detachedWindowButton} onClick={toggleDetachedWindow}>
            {isDetachedWindow ? <Icon.CloseDetachedWindowIcon /> : <Icon.OpenDetachedWindowIcon />}
          </button>
        </div>
      )}
    </div>
  );
};
