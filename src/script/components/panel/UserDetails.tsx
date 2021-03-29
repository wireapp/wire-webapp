/*
 * Wire
 * Copyright (C) 2019 Wire Swiss GmbH
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
import {WebAppEvents} from '@wireapp/webapp-events';
import {amplify} from 'amplify';

import {t} from 'Util/LocalizerUtil';
import {registerReactComponent} from 'Util/ComponentUtil';

import type {User} from '../../entity/User';
import Avatar, {AVATAR_SIZE} from 'Components/Avatar';
import NamedIcon from 'Components/NamedIcon';
import AvailabilityState from 'Components/AvailabilityState';
import {Availability} from '@wireapp/protocol-messaging';

export interface UserDetailsProps {
  badge?: string;
  isGroupAdmin?: boolean;
  isSelfVerified: boolean;
  isVerified?: boolean;
  participant: User;
}

const UserDetails: React.FC<UserDetailsProps> = ({badge, participant, isSelfVerified, isVerified, isGroupAdmin}) => {
  const [inTeam, setInTeam] = useState<boolean>();
  const [isGuest, setIsGuest] = useState<boolean>();
  const [isTemporaryGuest, setIsTemporaryGuest] = useState<boolean>();
  const [expirationText, setExpirationText] = useState<string>();
  const [name, setName] = useState<string>();
  const [availability, setAvailability] = useState<Availability.Type>();
  const [verified, setVerified] = useState<boolean>(isVerified);

  useEffect(() => {
    amplify.publish(WebAppEvents.USER.UPDATE, participant.id);

    setInTeam(participant.inTeam());
    const inTeamSub = participant.inTeam.subscribe(value => setInTeam(value));

    setIsGuest(participant.isGuest());
    const isGuestSub = participant.isGuest.subscribe(value => setIsGuest(value));

    setIsTemporaryGuest(participant.isTemporaryGuest());
    const isTemporaryGuestSub = participant.isTemporaryGuest.subscribe(value => setIsTemporaryGuest(value));

    setExpirationText(participant.expirationText());
    const expirationTextSub = participant.expirationText.subscribe(value => setExpirationText(value));

    setName(participant.name());
    const nameSub = participant.name.subscribe(value => setName(value));

    setAvailability(participant.availability());
    const availabilitySub = participant.availability.subscribe(value => setAvailability(value));

    let verifiedSub: ko.Subscription;
    if (isVerified === undefined) {
      setVerified(participant.is_verified());
      verifiedSub = participant.is_verified.subscribe(value => setVerified(value));
    }

    return () => {
      inTeamSub.dispose();
      isGuestSub.dispose();
      isTemporaryGuestSub.dispose();
      expirationTextSub.dispose();
      nameSub.dispose();
      availabilitySub.dispose();
      verifiedSub?.dispose();
    };
  }, [participant]);

  return (
    <div className="panel-participant">
      <div className="panel-participant__head">
        {inTeam ? (
          <AvailabilityState
            className="panel-participant__head__name"
            availability={availability}
            label={name}
            dataUieName="status-name"
          />
        ) : (
          <div className="panel-participant__head__name" data-uie-name="status-name">
            {name}
          </div>
        )}
        {isSelfVerified && verified && (
          <NamedIcon
            width={16}
            height={16}
            name="verified-icon"
            className="panel-participant__head__verified-icon"
            data-uie-name="status-verified-participant"
          />
        )}
      </div>

      {participant.handle && (
        <div className="panel-participant__user-name" data-uie-name="status-username">
          {participant.handle}
        </div>
      )}

      <Avatar
        className="panel-participant__avatar"
        participant={participant}
        avatarSize={AVATAR_SIZE.X_LARGE}
        data-uie-name="status-profile-picture"
      />

      {badge && (
        <div className="panel-participant__label" data-uie-name="status-external">
          <NamedIcon name="partner-icon" width={16} height={16} />
          <span>{badge}</span>
        </div>
      )}

      {isGuest && (
        <div className="panel-participant__label" data-uie-name="status-guest">
          <NamedIcon name="guest-icon" width={16} height={16} />
          <span>{t('conversationGuestIndicator')}</span>
        </div>
      )}

      {isTemporaryGuest && (
        <div className="panel-participant__guest-expiration" data-uie-name="status-expiration-text">
          {expirationText}
        </div>
      )}

      {isGroupAdmin && (
        <div className="panel-participant__label" data-uie-name="status-admin">
          <NamedIcon name="group-admin-icon" width={16} height={16} />
          <span>{t('conversationDetailsGroupAdmin')}</span>
        </div>
      )}
    </div>
  );
};

export default UserDetails;

registerReactComponent('panel-user-details', {
  component: UserDetails,
  optionalParams: ['badge', 'isVerified', 'isGroupAdmin'],
  template:
    '<div data-bind="react: {badge: ko.unwrap(badge), isGroupAdmin: ko.unwrap(isGroupAdmin), isSelfVerified: ko.unwrap(isSelfVerified), isVerified: ko.unwrap(isVerified), participant: ko.unwrap(participant)}">',
});
