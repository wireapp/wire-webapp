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

import React, {useEffect} from 'react';
import {WebAppEvents} from '@wireapp/webapp-events';
import {amplify} from 'amplify';

import {t} from 'Util/LocalizerUtil';
import {registerReactComponent, useKoSubscribable} from 'Util/ComponentUtil';

import type {User} from '../../entity/User';
import Avatar, {AVATAR_SIZE} from 'Components/Avatar';
import NamedIcon from 'Components/NamedIcon';
import AvailabilityState from 'Components/AvailabilityState';

export interface UserDetailsProps {
  badge?: string;
  isGroupAdmin: boolean;
  isSelfVerified: boolean;
  isVerified?: boolean;
  participant: User;
}

const UserDetails: React.FC<UserDetailsProps> = ({badge, participant, isSelfVerified, isVerified, isGroupAdmin}) => {
  const inTeam = useKoSubscribable(participant.inTeam);
  const isGuest = useKoSubscribable(participant.isGuest);
  const isTemporaryGuest = useKoSubscribable(participant.isTemporaryGuest);
  const expirationText = useKoSubscribable(participant.expirationText);
  const name = useKoSubscribable(participant.name);
  const availability = useKoSubscribable(participant.availability);

  useEffect(() => {
    amplify.publish(WebAppEvents.USER.UPDATE, participant.id);
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
        {isSelfVerified && isVerified && (
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
  optionalParams: ['badge', 'isVerified'],
  template:
    '<div data-bind="react: {badge: ko.unwrap(badge), isGroupAdmin, isSelfVerified: ko.unwrap(isSelfVerified), isVerified: ko.unwrap(isVerified), participant: ko.unwrap(participant)}">',
});
