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

import {registerReactComponent} from 'Util/ComponentUtil';
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

export interface ParticipantItemProps {
  badge?: boolean;
  callParticipant?: Participant;
  canSelect?: boolean;
  customInfo?: string;
  external?: boolean;
  hideInfo?: boolean;
  isSelected?: boolean;
  isSelfVerified?: boolean;
  mode?: UserlistMode;
  participant: User | ServiceEntity;
  selfInTeam?: boolean;
}

const ParticipantItem: React.FC<ParticipantItemProps> = ({
  participant,
  badge,
  mode = UserlistMode.DEFAULT,
  canSelect,
  isSelected,
  callParticipant,
  customInfo,
  hideInfo,
  selfInTeam,
  external,
  isSelfVerified = false,
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

  let contentInfo: string;
  if (hasCustomInfo) {
    contentInfo = customInfo;
  } else if (hideInfo) {
    contentInfo = null;
  } else if (isService) {
    contentInfo = (participant as ServiceEntity).summary;
  } else if (isTemporaryGuest) {
    contentInfo = (participant as User).expirationText();
  } else {
    contentInfo = (participant as User).username();
  }

  return (
    <div
      className="participant-item"
      data-uie-name={isUser ? 'item-user' : 'item-service'}
      data-uie-value={ko.unwrap(participant.name)}
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
                  data-uie-name="status-name"
                  availability={(participant as User).availability()}
                  label={ko.unwrap(participant.name)}
                />
              )}

              {(isService || !selfInTeam) && (
                <div className="participant-item__content__name" data-uie-name="status-name">
                  {ko.unwrap(participant.name)}
                </div>
              )}
              {isSelf && <div className="participant-item__content__self-indicator">{selfString}</div>}
            </div>
            <div className="participant-item__content__info">
              {contentInfo && (
                <Fragment>
                  <span
                    className={cx('participant-item__content__username label-username-notext', {
                      'label-username': hasUsernameInfo,
                    })}
                    data-uie-name="status-username"
                  >
                    {contentInfo}
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
              {callParticipant.sharesCamera() && <NamedIcon name="camera-icon" data-uie-name="status-video" />}
              {callParticipant.sharesScreen() && (
                <NamedIcon name="screenshare-icon" data-uie-name="status-screenshare" />
              )}

              {!callParticipant.isMuted() && (
                <ParticipantMicOnIcon
                  isActive={callParticipant.isActivelySpeaking()}
                  data-uie-name={callParticipant.isActivelySpeaking() ? 'status-active-speaking' : 'status-audio-on'}
                />
              )}
              {callParticipant.isMuted() && <NamedIcon name="mic-off-icon" data-uie-name="status-audio-off" />}
            </Fragment>
          )}

          {isUser && !isOthersMode && (participant as User).isGuest() && (
            <NamedIcon width={14} height={12} name="guest-icon" data-uie-name="status-guest" />
          )}

          {external && <NamedIcon width={16} height={16} name="partner-icon" data-uie-name="status-external" />}

          {isUser && isSelfVerified && (participant as User).is_verified() && (
            <NamedIcon width={14} height={12} name="verified-icon" data-uie-name="status-verified" />
          )}

          {canSelect && (
            <div
              className={cx('search-list-item-select icon-check', {selected: isSelected})}
              data-uie-name="status-selected"
            ></div>
          )}
          <NamedIcon name="disclose-icon" className="disclose-icon" />
        </>
      )}
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
    'isSelected',
    'isSelfVerified',
    'mode',
    'selfInTeam',
  ],
  template:
    '<div data-bind="react: {badge, callParticipant, canSelect, customInfo, external, hideInfo, isSelected, isSelfVerified: ko.unwrap(isSelfVerified), mode, participant, selfInTeam}"></div>',
});
