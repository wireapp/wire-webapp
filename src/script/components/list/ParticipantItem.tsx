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
import {container} from 'tsyringe';
import cx from 'classnames';

import {registerReactComponent, useKoSubscribable} from 'Util/ComponentUtil';
import ParticipantAvatar, {AVATAR_SIZE} from 'Components/ParticipantAvatar';
import {UserlistMode} from 'Components/userList';
import {t} from 'Util/LocalizerUtil';
import {capitalizeFirstChar} from 'Util/StringUtil';

import {User} from '../../entity/User';
import {ServiceEntity} from '../../integration/ServiceEntity';
import {useViewPortObserver} from '../../ui/viewportObserver';

import 'Components/AvailabilityState';
import {Participant} from '../../calling/Participant';
import {AssetRepository} from '../../assets/AssetRepository';
import AvailabilityState from 'Components/AvailabilityState';
import ParticipantMicOnIcon from 'Components/calling/ParticipantMicOnIcon';
import NamedIcon from 'Components/NamedIcon';
import {Availability} from '@wireapp/protocol-messaging';

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
  const {viewportElementRef, isInViewport} = useViewPortObserver<HTMLDivElement>();
  const assetRepository = container.resolve(AssetRepository);
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
              <ParticipantAvatar
                participant={participant as User}
                size={AVATAR_SIZE.SMALL}
                assetRepository={assetRepository}
              />
            </div>

            <div className="participant-item__content">
              <div className="participant-item__content__name-wrapper">
                {isUser && selfInTeam && (
                  <AvailabilityState
                    className="participant-item__content__availability participant-item__content__name"
                    dataUieName="status-name"
                    availability={availability}
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
                {callParticipantSharesCamera && (
                  <NamedIcon
                    name="camera-icon"
                    className="camera-icon"
                    data-uie-name="status-video"
                    width={16}
                    height={12}
                  />
                )}
                {callParticipantSharesScreen && (
                  <NamedIcon name="screenshare-icon" className="screenshare-icon" data-uie-name="status-screenshare" />
                )}

                {!callParticipantIsMuted && (
                  <ParticipantMicOnIcon
                    className="participant-mic-on-icon"
                    isActive={callParticipantIsActivelySpeaking}
                    data-uie-name={callParticipantIsActivelySpeaking ? 'status-active-speaking' : 'status-audio-on'}
                  />
                )}

                {callParticipantIsMuted && (
                  <NamedIcon
                    name="mic-off-icon"
                    className="mic-off-icon"
                    data-uie-name="status-audio-off"
                    width={16}
                    height={16}
                    style={{height: 12}}
                  />
                )}
              </Fragment>
            )}

            {isUser && !isOthersMode && isGuest && (
              <NamedIcon name="guest-icon" className="guest-icon" data-uie-name="status-guest" width={14} height={16} />
            )}

            {external && (
              <NamedIcon
                name="partner-icon"
                className="partner-icon"
                data-uie-name="status-external"
                width={16}
                height={16}
              />
            )}

            {isUser && isSelfVerified && isVerified && (
              <NamedIcon
                name="verified-icon"
                className="verified-icon"
                data-uie-name="status-verified"
                width={14}
                height={16}
              />
            )}

            {canSelect && (
              <div
                className={cx('search-list-item-select icon-check', {selected: isSelected})}
                data-uie-name="status-selected"
              />
            )}

            <NamedIcon name="disclose-icon" className="disclose-icon" width={5} height={8} />
          </>
        )}
      </div>
    </div>
  );
};

export default ParticipantItem;

registerReactComponent<ParticipantItemProps>('participant-item', {
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
  template:
    '<div data-bind="react: {badge, callParticipant, showArrow, highlighted, noInteraction, noUnderline, canSelect, customInfo, external: ko.unwrap(external), hideInfo, isSelected, isSelfVerified: ko.unwrap(isSelfVerified), mode, participant, selfInTeam}"></div>',
});
