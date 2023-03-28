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

import {TabIndex} from '@wireapp/react-ui-kit/lib/types/enums';

import {Availability} from '@wireapp/protocol-messaging';

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
} from './ParticipantItemContent.styles';

export interface ParticipantItemContentProps {
  name: string;
  selfInTeam?: boolean;
  availability?: Availability.Type;
  shortDescription?: string;
  selfString?: string;
  hasUsernameInfo?: boolean;
  showArrow?: boolean;
  onDropdownClick?: (event: React.MouseEvent<HTMLButtonElement>) => void;
}

export const ParticipantItemContent = ({
  name,
  selfInTeam = false,
  availability = Availability.Type.NONE,
  shortDescription = '',
  selfString = '',
  hasUsernameInfo = false,
  onDropdownClick,
  showArrow = false,
}: ParticipantItemContentProps) => {
  return (
    <div css={wrapper}>
      <div css={contentText}>
        <div css={nameWrapper}>
          {selfInTeam && availability ? (
            <AvailabilityState
              availability={availability}
              css={[userName, userAvailability, ellipsis]}
              dataUieName="status-name"
              label={name}
            />
          ) : (
            <div css={[userName, ellipsis]} data-uie-name="status-name">
              {name}
            </div>
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

            {/* TODO: It's not used, saved for future if it will be needed, and add prop badge */}
            {/*{hasUsernameInfo && badge && (*/}
            {/*<span css={badge} data-uie-name="status-partner">*/}
            {/*  {badge}*/}
            {/*</span>*/}
            {/*)}*/}
          </div>
        )}
      </div>

      {onDropdownClick && (
        <button
          tabIndex={TabIndex.UNFOCUSABLE}
          css={chevronIcon}
          onClick={onDropdownClick}
          type="button"
          data-uie-name="participant-menu-icon"
        >
          <Icon.Chevron />
        </button>
      )}

      {showArrow && <Icon.ChevronRight css={chevronIcon} />}
    </div>
  );
};
