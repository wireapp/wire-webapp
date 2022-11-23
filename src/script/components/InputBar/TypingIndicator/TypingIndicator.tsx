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

import {FC} from 'react';

import {Avatar, AVATAR_SIZE} from 'Components/Avatar';
import {Icon} from 'Components/Icon';
import {StringIdentifer, t} from 'Util/LocalizerUtil';

import {useTypingIndicatorState} from './TypingIndicator.state';
import {
  dotOneStyles,
  dotThreeStyles,
  dotTwoStyles,
  editIconStyles,
  indicatorAnimationWrapperStyles,
  indicatorTitleStyles,
  wrapperStyles,
} from './TypingIndicator.styles';

export interface TypingIndicatorProps {
  conversationId: string;
}

const TypingIndicator: FC<TypingIndicatorProps> = ({conversationId}) => {
  const users = useTypingIndicatorState(state => state.getTypingUsersInConversation(conversationId));
  const usersCount = users.length;

  if (usersCount === 0) {
    return null;
  }

  return (
    <div css={wrapperStyles} data-uie-name="typing-indicator">
      <div css={{display: 'flex', marginRight: 8}}>
        {users.slice(0, 3).map((user, index) => (
          <Avatar
            key={user.id}
            className="cursor-default"
            style={index > 0 ? {marginLeft: -15} : {}}
            participant={user}
            avatarSize={AVATAR_SIZE.XXX_SMALL}
          />
        ))}
      </div>
      <span css={indicatorTitleStyles} data-uie-name="typing-indicator-title">
        {usersCount === 1 && t('tooltipConversationInputOneUserTyping' as StringIdentifer, {user1: users[0].name()})}
        {usersCount === 2 &&
          t('tooltipConversationInputTwoUserTyping' as StringIdentifer, {
            user1: users[0].name(),
            user2: users[1].name(),
          })}
        {usersCount > 2 &&
          t('tooltipConversationInputMoreThanTwoUserTyping' as StringIdentifer, {
            user1: users[0].name(),
            count: (usersCount - 1).toString(),
          })}
      </span>
      <div css={indicatorAnimationWrapperStyles}>
        <div css={dotOneStyles} />
        <div css={dotTwoStyles} />
        <div css={dotThreeStyles} />
        <Icon.Edit width={10} height={10} css={editIconStyles} />
      </div>
    </div>
  );
};

export {TypingIndicator};
