/*
 * Wire
 * Copyright (C) 2023 Wire Swiss GmbH
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

import React from 'react';

import {Icon} from 'Components/Icon';
import {UserInfo} from 'Components/UserInfo';
import {UserVerificationBadges} from 'Components/VerificationBadge';
import {User} from 'src/script/entity/User';
import {ServiceEntity} from 'src/script/integration/ServiceEntity';
import {useKoSubscribableChildren} from 'Util/ComponentUtil';

import {
  contentInfoWrapper,
  contentInfoText,
  selfIndicator,
  userName,
  userAvailability,
  ellipsis,
  nameWrapper,
  chevronIcon,
  contentText,
  wrapper,
} from './ParticipantItem.styles';

export interface ParticipantItemContentProps {
  /** the conversation context in which we are displaying the user (will enable e2ei verification badges) */
  groupId?: string;
  participant: User | ServiceEntity;
  selfInTeam?: boolean;
  shortDescription?: string;
  selfString?: string;
  hasUsernameInfo?: boolean;
  showArrow?: boolean;
  onDropdownClick?: (event: React.MouseEvent<HTMLButtonElement>) => void;
  showAvailabilityState?: boolean;
  isProteusVerified?: boolean;
  isMLSVerified?: boolean;
}

export const ParticipantItemContent = ({
  groupId,
  participant,
  selfInTeam = false,
  shortDescription = '',
  selfString = '',
  hasUsernameInfo = false,
  showArrow = false,
  showAvailabilityState = false,
}: ParticipantItemContentProps) => {
  const {name} = useKoSubscribableChildren(participant, ['name']);

  const isService = participant instanceof ServiceEntity;

  return (
    <div css={wrapper}>
      <div css={contentText}>
        <div css={nameWrapper}>
          {!isService ? (
            <UserInfo
              user={participant}
              css={[userName, userAvailability, ellipsis]}
              dataUieName="status-name"
              selfString={selfString}
              showAvailability={showAvailabilityState && selfInTeam}
            >
              <UserVerificationBadges user={participant} groupId={groupId} />
            </UserInfo>
          ) : (
            <>
              <div css={[userName, ellipsis]} data-uie-name="status-name">
                {name}

                {selfString && <span css={selfIndicator}>{selfString}</span>}
              </div>
            </>
          )}
        </div>

        {shortDescription && (
          <div css={contentInfoWrapper}>
            <span
              css={[contentInfoText(hasUsernameInfo), ellipsis]}
              className="subline"
              data-uie-name="status-username"
            >
              {shortDescription}
            </span>
          </div>
        )}
      </div>

      {showArrow && <Icon.ChevronRight css={chevronIcon} data-hoverClass="chevron-icon" />}
    </div>
  );
};
