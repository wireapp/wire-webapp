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

import ko from 'knockout';

import {UserBlockedBadge, UserVerificationBadges} from 'Components/Badge';
import * as Icon from 'Components/Icon';
import {UserInfo} from 'Components/UserInfo';
import {User} from 'Repositories/entity/User';
import {ServiceEntity} from 'Repositories/integration/ServiceEntity';
import {useKoSubscribableChildren} from 'Util/ComponentUtil';

import {
  contentInfoWrapper,
  contentInfoText,
  selfIndicator,
  userName,
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
  shortDescription?: string;
  selfString?: string;
  hasUsernameInfo?: boolean;
  showArrow?: boolean;
  onDropdownClick?: (event: React.MouseEvent<HTMLButtonElement>) => void;
  isProteusVerified?: boolean;
  isMLSVerified?: boolean;
}

const servicePlaceholder = {isBlocked: ko.observable(false)};

export const ParticipantItemContent = ({
  groupId,
  participant,
  shortDescription = '',
  selfString = '',
  hasUsernameInfo = false,
  showArrow = false,
}: ParticipantItemContentProps) => {
  const {name} = useKoSubscribableChildren(participant, ['name']);

  const isService = participant instanceof ServiceEntity;

  const {isBlocked} = useKoSubscribableChildren(!isService ? participant : servicePlaceholder, ['isBlocked']);

  return (
    <div css={wrapper}>
      <div css={contentText}>
        <div css={nameWrapper}>
          {!isService ? (
            <UserInfo user={participant} css={[userName, ellipsis]} selfString={selfString} dataUieName="status-name">
              <UserVerificationBadges user={participant} groupId={groupId} />
              {isBlocked && (
                <span css={{marginLeft: 4}}>
                  <UserBlockedBadge />
                </span>
              )}
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
