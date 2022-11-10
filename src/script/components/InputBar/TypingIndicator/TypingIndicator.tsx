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
import {StringIdentifer, t} from 'Util/LocalizerUtil';

import {useTypingIndicatorState} from './TypingIndicator.state';

export interface TypingIndicatorProps {
  conversationId: string;
}

const TypingIndicator: FC<TypingIndicatorProps> = ({conversationId}) => {
  const users = useTypingIndicatorState(state => state.getTypingUsersInConversation(conversationId));

  if (users.length === 0) {
    return null;
  }

  return (
    <div
      css={{
        display: 'flex',
        alignItems: 'center',
        marginBottom: '12px',
        marginLeft: '18px',
        color: 'var(--text-input-placeholder)',
        fontSize: '14px',
        fontWeight: 500,
      }}
    >
      <div css={{display: 'flex', marginRight: '18px'}}>
        {users.slice(0, 3).map((user, index) => (
          <Avatar
            key={user.id}
            className="cursor-default"
            style={index > 0 ? {marginLeft: -15} : {}}
            participant={user}
            avatarSize={AVATAR_SIZE.X_SMALL}
          />
        ))}
      </div>
      {users.length === 1 && t('tooltipConversationInputOneUserTyping' as StringIdentifer, {user1: users[0].name()})}
      {users.length === 2 &&
        t('tooltipConversationInputTwoUserTyping' as StringIdentifer, {
          user1: users[0].name(),
          user2: users[1].name(),
        })}
      {users.length > 2 &&
        t('tooltipConversationInputMoreThanTwoUserTyping' as StringIdentifer, {
          user1: users[0].name(),
          count: users.length.toString(),
        })}
    </div>
  );
};

export {TypingIndicator};
