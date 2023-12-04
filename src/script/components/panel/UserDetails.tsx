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

import {amplify} from 'amplify';
import {ErrorBoundary} from 'react-error-boundary';
import {container} from 'tsyringe';

import {WebAppEvents} from '@wireapp/webapp-events';

import {Avatar, AVATAR_SIZE} from 'Components/Avatar';
import {ErrorFallback} from 'Components/ErrorFallback';
import {Icon} from 'Components/Icon';
import {UserClassifiedBar} from 'Components/input/ClassifiedBar';
import {UserInfo} from 'Components/UserInfo';
import {UserVerificationBadges} from 'Components/VerificationBadge';
import {TeamState} from 'src/script/team/TeamState';
import {useKoSubscribableChildren} from 'Util/ComponentUtil';
import {t} from 'Util/LocalizerUtil';

import {User} from '../../entity/User';

interface UserDetailsProps {
  badge?: string;
  groupId?: string;
  classifiedDomains?: string[];
  isGroupAdmin?: boolean;
  isVerified?: boolean;
  participant: User;
  avatarStyles?: React.CSSProperties;
  teamState?: TeamState;
}

const UserDetailsComponent: React.FC<UserDetailsProps> = ({
  badge,
  participant,
  groupId,
  isGroupAdmin,
  avatarStyles,
  classifiedDomains,
  teamState = container.resolve(TeamState),
}) => {
  const user = useKoSubscribableChildren(participant, ['isGuest', 'isTemporaryGuest', 'expirationText', 'isAvailable']);

  useEffect(() => {
    // This will trigger a user refresh
    amplify.publish(WebAppEvents.USER.UPDATE, participant.qualifiedId);
  }, [participant]);

  return (
    <div className="panel-participant">
      <div className="panel-participant__head">
        <UserInfo
          className="panel-participant__head__name"
          user={participant}
          dataUieName="status-name"
          showAvailability={teamState.isInTeam(participant)}
        >
          {<UserVerificationBadges user={participant} groupId={groupId} />}
        </UserInfo>
      </div>

      {participant.handle && (
        <p className="panel-participant__user-name" data-uie-name="status-username" title={participant.handle}>
          {participant.handle}
        </p>
      )}

      {classifiedDomains && <UserClassifiedBar users={[participant]} classifiedDomains={classifiedDomains} />}

      <Avatar
        className="panel-participant__avatar"
        participant={participant}
        avatarSize={AVATAR_SIZE.X_LARGE}
        data-uie-name="status-profile-picture"
        style={avatarStyles}
      />

      {badge && (
        <div className="panel-participant__label panel-participant__label--external" data-uie-name="status-external">
          <Icon.External />
          <span>{badge}</span>
        </div>
      )}

      {participant.isFederated && (
        <div className="panel-participant__label" data-uie-name="status-federated-user">
          <Icon.Federation />
          <span>{t('conversationFederationIndicator')}</span>
        </div>
      )}

      {user.isGuest && user.isAvailable && (
        <div className="panel-participant__label" data-uie-name="status-guest">
          <Icon.Guest />
          <span>{t('conversationGuestIndicator')}</span>
        </div>
      )}

      {user.isTemporaryGuest && user.isAvailable && (
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

export const UserDetails: React.FC<UserDetailsProps> = props => {
  return (
    <ErrorBoundary FallbackComponent={ErrorFallback}>
      <UserDetailsComponent {...props} />
    </ErrorBoundary>
  );
};
