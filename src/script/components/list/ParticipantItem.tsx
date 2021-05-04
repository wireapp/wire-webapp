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
import ko from 'knockout';
import cx from 'classnames';

import {registerReactComponent, useKoSubscribable} from 'Util/ComponentUtil';
import Avatar, {AVATAR_SIZE} from 'Components/Avatar';
import {UserlistMode} from 'Components/userList';
import {t} from 'Util/LocalizerUtil';
import {capitalizeFirstChar} from 'Util/StringUtil';

import {User} from '../../entity/User';
import {ServiceEntity} from '../../integration/ServiceEntity';
import {useViewPortObserver} from '../../ui/viewportObserver';

import 'Components/AvailabilityState';
import {Participant} from '../../calling/Participant';
import AvailabilityState from 'Components/AvailabilityState';
import ParticipantMicOnIcon from 'Components/calling/ParticipantMicOnIcon';
import Icon from 'Components/Icon';
import {Availability} from '@wireapp/protocol-messaging';
import {Config} from '../../Config';

export interface ParticipantItemProps {
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
  participant: User | ServiceEntity;
  selfInTeam?: boolean;
  showArrow?: boolean;
}

const ParticipantItem: React.FC<ParticipantItemProps> = ({
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
}) => {
  const [isInViewport, viewportElementRef] = useViewPortObserver();
  const isUser = participant instanceof User && !participant.isService;
  const isService = participant instanceof ServiceEntity || participant.isService;
  const isSelf = !!(participant as User).isMe;
  const selfString = `(${capitalizeFirstChar(t('conversationYouNominative'))})`;
  const hasCustomInfo = !!customInfo;
  const isTemporaryGuest = isUser && (participant as User).isTemporaryGuest();
  const hasUsernameInfo = isUser && !hideInfo && !hasCustomInfo && !isTemporaryGuest;
  const isOthersMode = mode === UserlistMode.OTHERS;

  const isGuest = useKoSubscribable((participant as User).isGuest ?? ko.observable(false));
  const isVerified = useKoSubscribable((participant as User).is_verified ?? ko.observable(false));
  const availability = useKoSubscribable((participant as User).availability ?? ko.observable<Availability.Type>());

  const participantName = useKoSubscribable(
    isUser ? (participant as User).name : ko.observable((participant as ServiceEntity).name),
  );
  const callParticipantSharesCamera = useKoSubscribable(callParticipant?.sharesCamera ?? ko.observable(false));
  const callParticipantSharesScreen = useKoSubscribable(callParticipant?.sharesScreen ?? ko.observable(false));
  const callParticipantIsActivelySpeaking = useKoSubscribable(
    callParticipant?.isActivelySpeaking ?? ko.observable(false),
  );

  const callParticipantIsMuted = useKoSubscribable(callParticipant ? callParticipant.isMuted : ko.observable());

  let contentInfo: ko.Observable;
  if (hasCustomInfo) {
    contentInfo = ko.observable(customInfo);
  } else if (hideInfo) {
    contentInfo = ko.observable('');
  } else if (isService) {
    contentInfo = ko.observable((participant as ServiceEntity).summary);
  } else if (isTemporaryGuest) {
    contentInfo = (participant as User).expirationText;
  } else {
    contentInfo = ko.observable((participant as User).handle);
  }

  const contentInfoText = useKoSubscribable(contentInfo);

  return (
    <div
      className={cx('participant-item-wrapper', {
        highlighted,
        'no-interaction': noInteraction,
        'no-underline': noUnderline,
        'show-arrow': showArrow,
      })}
    >
      <div
        className="participant-item"
        data-uie-name={isUser ? 'item-user' : 'item-service'}
        data-uie-value={participantName}
        ref={viewportElementRef}
      >
        {isInViewport && (
          <>
            <div className="participant-item__image">
              <Avatar avatarSize={AVATAR_SIZE.SMALL} participant={participant as User} />
            </div>

            <div className="participant-item__content">
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
            {callParticipant && (
              <Fragment>
                {callParticipantSharesCamera && <Icon.Camera className="camera-icon" data-uie-name="status-video" />}
                {callParticipantSharesScreen && (
                  <Icon.Screenshare className="screenshare-icon" data-uie-name="status-screenshare" />
                )}

                {!callParticipantIsMuted && (
                  <ParticipantMicOnIcon
                    className="participant-mic-on-icon"
                    isActive={callParticipantIsActivelySpeaking}
                    data-uie-name={callParticipantIsActivelySpeaking ? 'status-active-speaking' : 'status-audio-on'}
                  />
                )}

                {callParticipantIsMuted && (
                  <Icon.MicOff className="mic-off-icon" data-uie-name="status-audio-off" style={{height: 12}} />
                )}
              </Fragment>
            )}

            {isUser && !isOthersMode && isGuest && (
              <span
                className="guest-icon with-tooltip with-tooltip--external"
                data-tooltip={t('conversationGuestIndicator')}
              >
                <Icon.Guest data-uie-name="status-guest" />
              </span>
            )}

            {participant instanceof User &&
              Config.getConfig().FEATURE.ENABLE_FEDERATION &&
              !participant.isOnSameFederatedDomain() && (
                <Icon.Federation className="federation-icon" data-uie-name="status-federated-user" />
              )}

            {external && (
              <span className="partner-icon with-tooltip with-tooltip--external" data-tooltip={t('rolePartner')}>
                <Icon.External data-uie-name="status-external" />
              </span>
            )}

            {isUser && isSelfVerified && isVerified && (
              <Icon.Verified className="verified-icon" data-uie-name="status-verified" />
            )}

            {canSelect && (
              <div
                className={cx('search-list-item-select icon-check', {selected: isSelected})}
                data-uie-name="status-selected"
              />
            )}

            <Icon.Disclose className="disclose-icon" />
          </>
        )}
      </div>
    </div>
  );
};

export default ParticipantItem;

registerReactComponent<ParticipantItemProps>('participant-item', {
  bindings:
    'badge, callParticipant, showArrow, highlighted, noInteraction, noUnderline, canSelect, customInfo, external: ko.unwrap(external), hideInfo, isSelected: ko.unwrap(isSelected), isSelfVerified: ko.unwrap(isSelfVerified), mode, participant, selfInTeam',
  component: ParticipantItem,
  optionalParams: [
    'badge',
    'callParticipant',
    'canSelect',
    'customInfo',
    'external',
    'hideInfo',
    'highlighted',
    'isSelected',
    'isSelfVerified',
    'mode',
    'noInteraction',
    'noUnderline',
    'selfInTeam',
    'showArrow',
  ],
});
