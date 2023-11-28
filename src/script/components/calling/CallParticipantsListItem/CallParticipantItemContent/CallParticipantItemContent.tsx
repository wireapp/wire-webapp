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

import {AvailabilityState} from 'Components/AvailabilityState';
import {Icon} from 'Components/Icon';
import {User} from 'src/script/entity/User';
import {useKoSubscribableChildren} from 'Util/ComponentUtil';
import {t} from 'Util/LocalizerUtil';
import {capitalizeFirstChar} from 'Util/StringUtil';

import {
  selfIndicator,
  userName,
  userAvailability,
  ellipsis,
  nameWrapper,
  chevronIcon,
  contentText,
  wrapper,
} from './CallParticipantItemContent.styles';

export interface CallParticipantItemContentProps {
  user: User;
  selfInTeam?: boolean;
  isAudioEstablished: boolean;
  isSelf?: boolean;
  showContextMenu: boolean;
  onDropdownClick: (event: React.MouseEvent<HTMLButtonElement>) => void;
}

export const CallParticipantItemContent = ({
  user,
  selfInTeam = false,
  isAudioEstablished,
  isSelf = false,
  showContextMenu,
  onDropdownClick,
}: CallParticipantItemContentProps) => {
  const {name} = useKoSubscribableChildren(user, ['name']);
  const selfString = `(${capitalizeFirstChar(t('conversationYouNominative'))})`;

  return (
    <div css={wrapper}>
      <div css={contentText}>
        <div css={nameWrapper(isAudioEstablished)}>
          {selfInTeam ? (
            <AvailabilityState user={user} css={[userAvailability, ellipsis]} dataUieName="status-name" />
          ) : (
            <div css={[userName, ellipsis]} data-uie-name="status-name">
              {name}
            </div>
          )}

          {isSelf && <div css={selfIndicator}>{selfString}</div>}
        </div>
      </div>

      {isAudioEstablished && showContextMenu && (
        <button
          data-hoverClass="chevron-icon"
          tabIndex={TabIndex.UNFOCUSABLE}
          css={chevronIcon}
          onClick={onDropdownClick}
          type="button"
          data-uie-name="participant-menu-icon"
        >
          <Icon.Chevron />
        </button>
      )}
    </div>
  );
};
