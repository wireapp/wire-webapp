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

import React, {Fragment} from 'react';
import cx from 'classnames';

import {registerReactComponent, useKoSubscribableChildren} from 'Util/ComponentUtil';
import Avatar, {AVATAR_SIZE} from 'Components/Avatar';
import {UserlistMode} from 'Components/UserList';
import {t} from 'Util/LocalizerUtil';
import {capitalizeFirstChar} from 'Util/StringUtil';
import {noop} from 'Util/util';

import {User} from '../../entity/User';
import {ServiceEntity} from '../../integration/ServiceEntity';
import {useViewPortObserver} from '../../ui/viewportObserver';

import 'Components/AvailabilityState';
import {Participant} from '../../calling/Participant';
import AvailabilityState from 'Components/AvailabilityState';
import ParticipantMicOnIcon from 'Components/calling/ParticipantMicOnIcon';
import Icon from 'Components/Icon';
import useEffectRef from 'Util/useEffectRef';

export interface ParticipantItemProps<UserType> extends Omit<React.HTMLProps<HTMLDivElement>, 'onClick' | 'onKeyDown'> {
  badge?: boolean;
  callParticipant?: Participant;
  canSelect?: boolean;
  customInfo?: string;
  external?: boolean;
  hideInfo?: boolean;
  highlighted?: boolean;
  isSelected?: boolean;
  isSelfVerified?: boolean;
  mode?: UserlistMode;
  noInteraction?: boolean;
  noUnderline?: boolean;
  onClick?: (user: UserType, event: MouseEvent) => void;
  onKeyDown?: (user: UserType, event: KeyboardEvent) => void;
  participant: UserType;
  selfInTeam?: boolean;
  showArrow?: boolean;
  showDropdown?: boolean;
}

const ParticipantItem = <UserType extends User | ServiceEntity>(
  props: React.PropsWithChildren<ParticipantItemProps<UserType>>,
): React.ReactElement | null => {
  const {
    badge,
    callParticipant,
    canSelect,
    customInfo,
    external,
    hideInfo,
    highlighted = false,
    isSelected,
    isSelfVerified = false,
    mode = UserlistMode.DEFAULT,
    noInteraction = false,
    noUnderline = false,
    participant,
    selfInTeam,
    showArrow = false,
    showDropdown = false,
    onContextMenu = noop,
    onClick = noop,
    onKeyDown = noop,
  } = props;
  const [viewportElementRef, setViewportElementRef] = useEffectRef<HTMLDivElement>();
  const isInViewport = useViewPortObserver(viewportElementRef);
  const isUser = participant instanceof User && !participant.isService;
  const isService = participant instanceof ServiceEntity || participant.isService;
  const isSelf = !!(participant as User).isMe;
  const selfString = `(${capitalizeFirstChar(t('conversationYouNominative'))})`;
  const hasCustomInfo = !!customInfo;
  const isTemporaryGuest = isUser && (participant as User).isTemporaryGuest();
  const hasUsernameInfo = isUser && !hideInfo && !hasCustomInfo && !isTemporaryGuest;
  const isOthersMode = mode === UserlistMode.OTHERS;

  const {
    is_verified: isVerified,
    isDirectGuest,
    availability,
    expirationText,
    name: participantName,
  } = useKoSubscribableChildren(
    // We need to make TS believe that this is a User, otherwise it will complain about
    // the fields in the array that don't exist on ServiceEntity
    participant as User,
    participant instanceof User ? ['isDirectGuest', 'is_verified', 'availability', 'expirationText', 'name'] : ['name'],
  );

  const isFederated = participant instanceof User && participant.isFederated;

  const {sharesCamera, sharesScreen, isActivelySpeaking, isMuted} = useKoSubscribableChildren(callParticipant, [
    'sharesCamera',
    'sharesScreen',
    'isActivelySpeaking',
    'isMuted',
  ]);

  const contentInfoText = (() => {
    if (hasCustomInfo) {
      return customInfo;
    }
    if (hideInfo) {
      return '';
    }
    if (isService) {
      return (participant as ServiceEntity).summary;
    }
    if (isTemporaryGuest) {
      return expirationText;
    }
    return (participant as User).handle;
  })();

  return (
    <div
      className={cx('participant-item-wrapper', {
        highlighted,
        'no-interaction': noInteraction,
        'no-underline': noUnderline,
      })}
      role="button"
      tabIndex={0}
      onContextMenu={onContextMenu}
      onClick={noInteraction ? noop : event => onClick(participant, event.nativeEvent)}
      onKeyDown={noInteraction ? noop : event => onKeyDown(participant, event.nativeEvent)}
    >
      <div
        className="participant-item"
        data-uie-name={isUser ? 'item-user' : 'item-service'}
        data-uie-value={participantName}
        ref={setViewportElementRef}
      >
        {isInViewport && (
          <>
            <div className="participant-item__image">
              <Avatar avatarSize={AVATAR_SIZE.SMALL} participant={participant} />
            </div>

            <div className="participant-item__content">
              <div className="participant-item__content__text">
                <div className="participant-item__content__name-wrapper">
                  {isUser && selfInTeam && (
                    <AvailabilityState
                      availability={availability}
                      className="participant-item__content__availability participant-item__content__name"
                      dataUieName="status-name"
                      label={participantName}
                    />
                  )}

                  {(isService || !selfInTeam) && (
                    <div className="participant-item__content__name" data-uie-name="status-name">
                      {participantName}
                    </div>
                  )}
                  {isSelf && <div className="participant-item__content__self-indicator">{selfString}</div>}
                </div>
                <div className="participant-item__content__info">
                  {contentInfoText && (
                    <Fragment>
                      <span
                        className={cx('participant-item__content__username label-username-notext', {
                          'label-username': hasUsernameInfo,
                        })}
                        data-uie-name="status-username"
                      >
                        {contentInfoText}
                      </span>
                      {hasUsernameInfo && badge && (
                        <span className="participant-item__content__badge" data-uie-name="status-partner">
                          {badge}
                        </span>
                      )}
                    </Fragment>
                  )}
                </div>
              </div>
              {showDropdown && (
                <button
                  className="participant-item__content__chevron"
                  onClick={event => onContextMenu(event as unknown as React.MouseEvent<HTMLDivElement>)}
                  type="button"
                  data-uie-name="participant-menu-icon"
                >
                  <Icon.Chevron />
                </button>
              )}
            </div>

            {!isOthersMode && isDirectGuest && (
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

            {isUser && isSelfVerified && isVerified && (
              <Icon.Verified className="verified-icon" data-uie-name="status-verified" />
            )}

            {callParticipant && (
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
                  <Icon.MicOff
                    className="mic-off-icon"
                    data-uie-name="status-audio-off"
                    style={{height: 12, width: 12}}
                  />
                )}
              </>
            )}

            {canSelect && (
              <div
                className={cx('search-list-item-select icon-check', {selected: isSelected})}
                data-uie-name="status-selected"
              />
            )}
            {showArrow && <Icon.Disclose className="disclose-icon" />}
          </>
        )}
      </div>
    </div>
  );
};

export default ParticipantItem;

registerReactComponent('participant-item', {
  bindings:
    'badge, callParticipant, showArrow, highlighted, noInteraction, noUnderline, canSelect, customInfo: ko.unwrap(customInfo), external: ko.unwrap(external), hideInfo, isSelected: ko.unwrap(isSelected), isSelfVerified: ko.unwrap(isSelfVerified), mode, participant, selfInTeam, onClick, onKeyDown',
  component: ParticipantItem,
});
