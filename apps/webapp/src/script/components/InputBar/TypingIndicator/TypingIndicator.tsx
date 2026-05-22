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
import * as Icon from 'Components/icon';
import {useApplicationContext} from 'src/script/page/RootProvider';

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

const MAX_VISIBLE_TYPING_USERS = 3;
const TWO_TYPING_USERS = 2;
const ADDITIONAL_TYPING_USER_OFFSET = 1;

export interface TypingIndicatorProps {
  conversationId: string;
}

export const TypingIndicator = ({conversationId}: TypingIndicatorProps) => {
  const {translate} = useApplicationContext();
  const users = useTypingIndicatorState(state => state.getTypingUsersInConversation(conversationId));
  const usersCount = users.length;

  if (usersCount === 0) {
    return null;
  }

  return (
    <div css={wrapperStyles} data-uie-name="typing-indicator">
      <div aria-hidden css={{display: 'flex', marginRight: 8}}>
        {users.slice(0, MAX_VISIBLE_TYPING_USERS).map((user, index) => (
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
        {usersCount === 1 &&
          translate('tooltipConversationInputOneUserTyping', {user1: users[0].name()}, undefined, true)}
        {usersCount === TWO_TYPING_USERS &&
          translate(
            'tooltipConversationInputTwoUserTyping',
            {
              user1: users[0].name(),
              user2: users[1].name(),
            },
            undefined,
            true,
          )}
        {usersCount > TWO_TYPING_USERS &&
          translate(
            'tooltipConversationInputMoreThanTwoUserTyping',
            {
              user1: users[0].name(),
              count: (usersCount - ADDITIONAL_TYPING_USER_OFFSET).toString(),
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
