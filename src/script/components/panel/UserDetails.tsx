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
import {registerReactComponent, useKoSubscribableChildren} from 'Util/ComponentUtil';

import type {User} from '../../entity/User';
import Avatar, {AVATAR_SIZE} from 'Components/Avatar';
import Icon from 'Components/Icon';
import AvailabilityState from 'Components/AvailabilityState';
import ClassifiedBar from 'Components/input/ClassifiedBar';

export interface UserDetailsProps {
  badge?: string;
  classifiedDomains?: string[];
  isGroupAdmin?: boolean;
  isSelfVerified: boolean;
  isVerified?: boolean;
  participant: User;
}

const UserDetails: React.FC<UserDetailsProps> = ({
  badge,
  participant,
  isSelfVerified,
  isGroupAdmin,
  classifiedDomains,
}) => {
  const user = useKoSubscribableChildren(participant, [
    'inTeam',
    'isGuest',
    'isTemporaryGuest',
    'expirationText',
    'name',
    'availability',
    'is_verified',
  ]);

  useEffect(() => {
    amplify.publish(WebAppEvents.USER.UPDATE, participant.qualifiedId);
  }, [participant]);

  const isFederated = participant.isFederated;
  const isGuest = !isFederated && participant.isGuest();

  return (
    <div className="panel-participant">
      <div className="panel-participant__head">
        {user.inTeam ? (
          <AvailabilityState
            className="panel-participant__head__name"
            availability={user.availability}
            label={user.name}
            dataUieName="status-name"
          />
        ) : (
          <h2 className="panel-participant__head__name" data-uie-name="status-name">
            {user.name}
          </h2>
        )}
        {isSelfVerified && user.is_verified && (
          <Icon.Verified
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

      {classifiedDomains && (
        <ClassifiedBar
          users={[participant]}
          classifiedDomains={classifiedDomains}
          style={{width: 'calc(100% + 32px)'}}
        />
      )}

      <Avatar
        className="panel-participant__avatar"
        participant={participant}
        avatarSize={AVATAR_SIZE.X_LARGE}
        data-uie-name="status-profile-picture"
      />

      {badge && (
        <div className="panel-participant__label panel-participant__label--external" data-uie-name="status-external">
          <Icon.External />
          <span>{badge}</span>
        </div>
      )}

      {isFederated && (
        <div className="panel-participant__label" data-uie-name="status-federated-user">
          <Icon.Federation />
          <span>{t('conversationFederationIndicator')}</span>
        </div>
      )}

      {isGuest && (
        <div className="panel-participant__label" data-uie-name="status-guest">
          <Icon.Guest />
          <span>{t('conversationGuestIndicator')}</span>
        </div>
      )}

      {user.isTemporaryGuest && (
        <div className="panel-participant__guest-expiration" data-uie-name="status-expiration-text">
          {user.expirationText}
        </div>
      )}

      {isGroupAdmin && (
        <div className="panel-participant__label" data-uie-name="status-admin">
          <Icon.GroupAdmin />
          <span>{t('conversationDetailsGroupAdmin')}</span>
        </div>
      )}
    </div>
  );
};

export default UserDetails;

registerReactComponent('panel-user-details', {
  component: UserDetails,
  template:
    '<div data-bind="react: {badge: ko.unwrap(badge), isGroupAdmin: ko.unwrap(isGroupAdmin), isSelfVerified: ko.unwrap(isSelfVerified), isVerified: ko.unwrap(isVerified), participant: ko.unwrap(participant), classifiedDomains: ko.unwrap(classifiedDomains)}"></div>',
});
