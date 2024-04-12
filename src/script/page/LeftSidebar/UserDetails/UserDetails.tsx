/*
 * Wire
 * Copyright (C) 2024 Wire Swiss GmbH
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

import {memo} from 'react';

import {TabIndex} from '@wireapp/react-ui-kit/lib/types/enums';

import {Avatar, AVATAR_SIZE} from 'Components/Avatar';
import {LegalHoldDot} from 'Components/LegalHoldDot';
import {UserVerificationBadges} from 'Components/VerificationBadge';
import {useKoSubscribableChildren} from 'Util/ComponentUtil';
import {t} from 'Util/LocalizerUtil';

import * as styles from './UserDetails.styles';

import {User} from '../../../entity/User';
import {AvailabilityContextMenu} from '../../../ui/AvailabilityContextMenu';

type UserDetailsProps = {
  user: User;
  groupId?: string;
  isTeam?: boolean;
  isSideBarOpen?: boolean;
};

const UserDetailsComponent = ({user, isTeam = false, groupId, isSideBarOpen = false}: UserDetailsProps) => {
  const {
    availability,
    name: userName,
    username: userHandle,
    isOnLegalHold,
    hasPendingLegalHold,
  } = useKoSubscribableChildren(user, ['availability', 'hasPendingLegalHold', 'isOnLegalHold', 'name', 'username']);

  const showLegalHold = isOnLegalHold || hasPendingLegalHold;

  return (
    <div css={styles.wrapper(isSideBarOpen)}>
      <Avatar
        availability={availability}
        className="see-through user-details-avatar"
        participant={user}
        avatarSize={isSideBarOpen ? AVATAR_SIZE.MEDIUM : AVATAR_SIZE.SMALL}
        avatarAlt={t('selfProfileImageAlt')}
      />

      <div css={styles.userDetailsWrapper(isSideBarOpen)}>
        {!isTeam ? (
          <>
            <div css={styles.userDetails} data-uie-name="status-availability">
              <button
                css={styles.userFullName}
                onClick={event => AvailabilityContextMenu.show(event.nativeEvent, 'left-list-availability-menu')}
              >
                <span data-uie-name="status-label" css={{...styles.userName, ...styles.textEllipsis}} title={userName}>
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
          <div css={styles.userFullName}>
            <span
              css={styles.textEllipsis}
              data-uie-name="status-name"
              role="presentation"
              tabIndex={TabIndex.FOCUSABLE}
              title={userName}
            >
              {userName}
            </span>
          </div>
        )}
      </div>

      <div css={styles.userHandle(isSideBarOpen)} data-uie-name="user-handle">
        @{userHandle}
      </div>
    </div>
  );
};

export const UserDetails = memo(UserDetailsComponent);
