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

import {AvailabilityState} from 'Components/AvailabilityState';
import {Icon} from 'Components/Icon';
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
  renderParticipantBadges?: (user: User) => React.ReactNode;
  participant: User | ServiceEntity;
  selfInTeam?: boolean;
  shortDescription?: string;
  selfString?: string;
  hasUsernameInfo?: boolean;
  showArrow?: boolean;
  onDropdownClick?: (event: React.MouseEvent<HTMLButtonElement>) => void;
  showAvailabilityState?: boolean;
  isSelectable?: boolean;
  isProteusVerified?: boolean;
  isMLSVerified?: boolean;
}

export const ParticipantItemContent = ({
  renderParticipantBadges,
  participant,
  selfInTeam = false,
  shortDescription = '',
  selfString = '',
  hasUsernameInfo = false,
  showArrow = false,
  showAvailabilityState = false,
  isSelectable = false,
}: ParticipantItemContentProps) => {
  const {name} = useKoSubscribableChildren(participant, ['name']);

  const isService = participant instanceof ServiceEntity;

  return (
    <div css={wrapper}>
      <div css={contentText}>
        <div css={nameWrapper}>
          {!isService && showAvailabilityState && selfInTeam ? (
            <AvailabilityState
              user={participant}
              css={[userName, userAvailability, ellipsis]}
              dataUieName="status-name"
              selfString={selfString}
            >
              {!isSelectable && renderParticipantBadges?.(participant)}
            </AvailabilityState>
          ) : (
            <>
              <div css={[userName, ellipsis]} data-uie-name="status-name">
                {name}

                {selfString && <span css={selfIndicator}>{selfString}</span>}
              </div>

              {!isSelectable && !isService && renderParticipantBadges?.(participant)}
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
