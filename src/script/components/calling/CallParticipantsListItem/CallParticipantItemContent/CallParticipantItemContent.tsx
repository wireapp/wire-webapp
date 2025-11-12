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

import {TabIndex} from '@wireapp/react-ui-kit';

import * as Icon from 'Components/Icon';
import {UserInfo} from 'Components/UserInfo';
import {User} from 'Repositories/entity/User';
import {t} from 'Util/LocalizerUtil';
import {capitalizeFirstChar} from 'Util/StringUtil';

import {
  selfIndicator,
  ellipsis,
  nameWrapper,
  chevronIcon,
  contentText,
  wrapper,
} from './CallParticipantItemContent.styles';

interface CallParticipantItemContentProps {
  user: User;
  isAudioEstablished: boolean;
  isSelf?: boolean;
  showContextMenu: boolean;
  onDropdownClick: (event: React.MouseEvent<HTMLButtonElement>) => void;
}

export const CallParticipantItemContent = ({
  user,
  isAudioEstablished,
  isSelf = false,
  showContextMenu,
  onDropdownClick,
}: CallParticipantItemContentProps) => {
  const selfString = `(${capitalizeFirstChar(t('conversationYouNominative'))})`;

  return (
    <div css={wrapper}>
      <div css={contentText}>
        <div css={nameWrapper(isAudioEstablished)}>
          <UserInfo user={user} css={[ellipsis]} dataUieName="status-name" />
          {isSelf && <div css={selfIndicator}>{selfString}</div>}
          {isAudioEstablished && showContextMenu && (
            <button
              data-hoverClass="chevron-icon"
              tabIndex={TabIndex.UNFOCUSABLE}
              css={chevronIcon}
              onClick={onDropdownClick}
              type="button"
              data-uie-name="participant-menu-icon"
            >
              <Icon.ChevronIcon />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
