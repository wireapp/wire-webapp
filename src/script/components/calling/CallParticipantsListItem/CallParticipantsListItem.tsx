/*
 * Wire
 * Copyright (C) 2018 Wire Swiss GmbH
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

import React from 'react';

import {TabIndex} from '@wireapp/react-ui-kit/lib/types/enums';

import {AvailabilityState} from 'Components/AvailabilityState';
import {Avatar, AVATAR_SIZE} from 'Components/Avatar';
import {ParticipantMicOnIcon} from 'Components/calling/ParticipantMicOnIcon';
import {Icon} from 'Components/Icon';
import {Participant} from 'src/script/calling/Participant';
import {User} from 'src/script/entity/User';
import {useKoSubscribableChildren} from 'Util/ComponentUtil';
import {KEY} from 'Util/KeyboardUtil';
import {t} from 'Util/LocalizerUtil';
import {capitalizeFirstChar} from 'Util/StringUtil';
import {noop, setContextMenuPosition} from 'Util/util';

export interface ParticipantItemProps extends Omit<React.HTMLProps<HTMLDivElement>, 'onClick' | 'onKeyDown'> {
  participant: User;
  callParticipant: Participant;
  selfInTeam?: boolean;
  isSelfVerified?: boolean;
  external?: boolean;
  showDropdown?: boolean;
}

export const CallParticipantsListItem = ({
  callParticipant,
  external,
  isSelfVerified = false,
  participant,
  selfInTeam,
  showDropdown = false,
  onContextMenu = noop,
}: React.PropsWithChildren<ParticipantItemProps>): React.ReactElement | null => {
  const {
    isDirectGuest,
    is_verified: isVerified,
    availability,
    name: participantName,
  } = useKoSubscribableChildren(participant, ['isDirectGuest', 'is_verified', 'availability', 'name']);

  const {sharesCamera, sharesScreen, isActivelySpeaking, isMuted} = useKoSubscribableChildren(callParticipant, [
    'sharesCamera',
    'sharesScreen',
    'isActivelySpeaking',
    'isMuted',
  ]);

  const handleContextKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if ([KEY.SPACE, KEY.ENTER].includes(event.key)) {
      const newEvent = setContextMenuPosition(event);
      onContextMenu(newEvent as unknown as React.MouseEvent<HTMLDivElement>);
    }
  };

  const isSelf = participant.isMe;
  const isFederated = participant.isFederated;
  const selfString = `(${capitalizeFirstChar(t('conversationYouNominative'))})`;

  return (
    <div
      tabIndex={TabIndex.FOCUSABLE}
      role="button"
      onContextMenu={onContextMenu}
      onClick={onContextMenu}
      onKeyDown={handleContextKeyDown}
      data-uie-name="item-user"
      data-uie-value={participantName}
      aria-label={t('accessibility.openConversation', participantName)}
      className="participant-item-wrapper no-interaction no-underline"
    >
      <div className="participant-item">
        <div className="participant-item__image">
          <Avatar avatarSize={AVATAR_SIZE.SMALL} participant={participant} aria-hidden="true" />
        </div>

        <div className="participant-item__content">
          <div className="participant-item__content__text">
            <div className="participant-item__content__name-wrapper">
              {selfInTeam && (
                <AvailabilityState
                  availability={availability}
                  className="participant-item__content__availability participant-item__content__name"
                  dataUieName="status-name"
                  label={participantName}
                />
              )}

              {!selfInTeam && (
                <div className="participant-item__content__name" data-uie-name="status-name">
                  {participantName}
                </div>
              )}
              {isSelf && <div className="participant-item__content__self-indicator">{selfString}</div>}
            </div>
          </div>

          {showDropdown && (
            <button
              tabIndex={TabIndex.UNFOCUSABLE}
              className="participant-item__content__chevron"
              onClick={event => onContextMenu(event as unknown as React.MouseEvent<HTMLDivElement>)}
              type="button"
              data-uie-name="participant-menu-icon"
            >
              <Icon.Chevron />
            </button>
          )}
        </div>

        {isDirectGuest && (
          <span
            className="guest-icon with-tooltip with-tooltip--external"
            data-tooltip={t('conversationGuestIndicator')}
          >
            <Icon.Guest data-uie-name="status-guest" />
          </span>
        )}

        {isFederated && (
          <span
            className="federation-icon with-tooltip with-tooltip--external"
            data-tooltip={t('conversationFederationIndicator')}
          >
            <Icon.Federation data-uie-name="status-federated-user" />
          </span>
        )}

        {external && (
          <span className="partner-icon with-tooltip with-tooltip--external" data-tooltip={t('rolePartner')}>
            <Icon.External data-uie-name="status-external" />
          </span>
        )}

        {isSelfVerified && isVerified && (
          <span className="verified-icon">
            <Icon.Verified data-uie-name="status-verified" />
          </span>
        )}

        {
          <>
            {sharesScreen && <Icon.Screenshare className="screenshare-icon" data-uie-name="status-screenshare" />}

            {sharesCamera && <Icon.Camera className="camera-icon" data-uie-name="status-video" />}

            {!isMuted && (
              <ParticipantMicOnIcon
                className="participant-mic-on-icon"
                isActive={isActivelySpeaking}
                data-uie-name={isActivelySpeaking ? 'status-active-speaking' : 'status-audio-on'}
              />
            )}

            {isMuted && (
              <Icon.MicOff className="mic-off-icon" data-uie-name="status-audio-off" style={{height: 12, width: 12}} />
            )}
          </>
        }
      </div>
    </div>
  );
};
