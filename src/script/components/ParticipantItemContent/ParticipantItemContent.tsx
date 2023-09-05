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

import {Availability} from '@wireapp/protocol-messaging';

import {AutoscrollingContainer} from 'Components/AutoscrollingContainer';
import {AvailabilityState} from 'Components/AvailabilityState';
import {Icon} from 'Components/Icon';

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
  name: string;
  selfInTeam?: boolean;
  availability?: Availability.Type;
  shortDescription?: string;
  selfString?: string;
  hasUsernameInfo?: boolean;
  showArrow?: boolean;
  onDropdownClick?: (event: React.MouseEvent<HTMLButtonElement>) => void;
  showAvailabilityState?: boolean;
}

export const ParticipantItemContent = ({
  name,
  selfInTeam = false,
  availability = Availability.Type.NONE,
  shortDescription = '',
  selfString = '',
  hasUsernameInfo = false,
  showArrow = false,
  showAvailabilityState = false,
}: ParticipantItemContentProps) => {
  return (
    <div css={wrapper}>
      <div css={contentText}>
        <div css={nameWrapper}>
          {showAvailabilityState && selfInTeam ? (
            <AvailabilityState
              availability={availability}
              css={[userName, userAvailability]}
              dataUieName="status-name"
              label={name}
            />
          ) : (
            <AutoscrollingContainer css={[userName, ellipsis]} data-uie-name="status-name">
              {name}
            </AutoscrollingContainer>
          )}

          {selfString && <div css={selfIndicator}>{selfString}</div>}
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
