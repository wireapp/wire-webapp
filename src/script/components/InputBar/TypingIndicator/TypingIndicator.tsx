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

import {Avatar, AVATAR_SIZE} from 'Components/Avatar';
import * as Icon from 'Components/Icon';
import {t} from 'Util/LocalizerUtil';

import {
  dotOneStyles,
  dotThreeStyles,
  dotTwoStyles,
  editIconStyles,
  indicatorAnimationWrapperStyles,
  indicatorTitleStyles,
  wrapperStyles,
} from './TypingIndicator.styles';
import {useTypingIndicatorState} from './useTypingIndicatorState/useTypingIndicatorState';

export interface TypingIndicatorProps {
  conversationId: string;
}

export const TypingIndicator = ({conversationId}: TypingIndicatorProps) => {
  const users = useTypingIndicatorState(state => state.getTypingUsersInConversation(conversationId));
  const usersCount = users.length;

  if (usersCount === 0) {
    return null;
  }

  return (
    <div css={wrapperStyles} data-uie-name="typing-indicator">
      <div aria-hidden css={{display: 'flex', marginRight: 8}}>
        {users.slice(0, 3).map((user, index) => (
          <Avatar
            key={user.id}
            className="cursor-default"
            style={index > 0 ? {marginLeft: -8} : {}}
            participant={user}
            avatarSize={AVATAR_SIZE.XXX_SMALL}
            isResponsive
            hideAvailabilityStatus
          />
        ))}
      </div>
      <p css={indicatorTitleStyles} data-uie-name="typing-indicator-title">
        {usersCount === 1 && t('tooltipConversationInputOneUserTyping', {user1: users[0].name()}, undefined, true)}
        {usersCount === 2 &&
          t(
            'tooltipConversationInputTwoUserTyping',
            {
              user1: users[0].name(),
              user2: users[1].name(),
            },
            undefined,
            true,
          )}
        {usersCount > 2 &&
          t(
            'tooltipConversationInputMoreThanTwoUserTyping',
            {
              user1: users[0].name(),
              count: (usersCount - 1).toString(),
            },
            undefined,
            true,
          )}
      </p>
      <div css={indicatorAnimationWrapperStyles}>
        <div css={dotOneStyles} />
        <div css={dotTwoStyles} />
        <div css={dotThreeStyles} />
        <Icon.EditIcon width={10} height={10} css={editIconStyles} />
      </div>
    </div>
  );
};
