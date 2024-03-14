/*
 * Wire
 * Copyright (C) 2022 Wire Swiss GmbH
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

import {memo, ReactNode} from 'react';

import {TabIndex} from '@wireapp/react-ui-kit/lib/types/enums';

import {Availability} from '@wireapp/protocol-messaging';

import {Icon} from 'Components/Icon';
import {LegalHoldDot} from 'Components/LegalHoldDot';
import {UserVerificationBadges} from 'Components/VerificationBadge';
import {useKoSubscribableChildren} from 'Util/ComponentUtil';

import * as styles from './UserDetails.styles';

import {User} from '../../../entity/User';
import {AvailabilityContextMenu} from '../../../ui/AvailabilityContextMenu';

const availabilityIconBaseProps = {
  className: 'availability-state-icon',
  css: styles.iconStyles,
  'data-uie-name': 'status-availability-icon',
};

const availabilityIconRenderer: Record<Availability.Type, () => ReactNode> = {
  [Availability.Type.AVAILABLE]: () => (
    <Icon.AvailabilityAvailable {...availabilityIconBaseProps} data-uie-value="available" />
  ),
  [Availability.Type.AWAY]: () => <Icon.AvailabilityAway {...availabilityIconBaseProps} data-uie-value="away" />,
  [Availability.Type.BUSY]: () => <Icon.AvailabilityBusy {...availabilityIconBaseProps} data-uie-value="busy" />,
  [Availability.Type.NONE]: () => null,
};

type UserDetailsProps = {
  user: User;
  groupId?: string;
  isTeam?: boolean;
};

const UserDetailsComponent = ({user, isTeam = false, groupId}: UserDetailsProps) => {
  const {
    availability,
    name: userName,
    isOnLegalHold,
    hasPendingLegalHold,
  } = useKoSubscribableChildren(user, ['availability', 'hasPendingLegalHold', 'isOnLegalHold', 'name']);

  const renderAvailabilityIcon = availabilityIconRenderer[availability];
  const showLegalHold = isOnLegalHold || hasPendingLegalHold;

  return (
    <div css={styles.wrapper}>
      <div css={styles.userDetailsWrapper}>
        {isTeam ? (
          <>
            <div css={styles.userDetails}>
              <button
                css={styles.userFullName}
                onClick={event => AvailabilityContextMenu.show(event.nativeEvent, 'left-list-availability-menu')}
              >
                {renderAvailabilityIcon()}

                <span data-uie-name="user-name" css={styles.userName} title={userName}>
                  {userName}
                </span>
              </button>

              <UserVerificationBadges user={user} isSelfUser groupId={groupId} />
            </div>

            {showLegalHold && (
              <div css={styles.legalHold}>
                <LegalHoldDot
                  isPending={hasPendingLegalHold}
                  dataUieName={hasPendingLegalHold ? 'status-legal-hold-pending' : 'status-legal-hold'}
                  showText
                  isInteractive
                />
              </div>
            )}
          </>
        ) : (
          <span css={styles.userFullName} data-uie-name="user-name" role="presentation" tabIndex={TabIndex.FOCUSABLE}>
            {userName} - very long name for testing purposes
          </span>
        )}
      </div>

      <div css={styles.userHandle} data-uie-name="user-handle">
        {user.handle}
      </div>
    </div>
  );
};

export const UserDetails = memo(UserDetailsComponent);
