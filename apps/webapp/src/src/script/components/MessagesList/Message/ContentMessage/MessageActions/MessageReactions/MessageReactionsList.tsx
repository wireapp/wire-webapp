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

import type {QualifiedId} from '@wireapp/api-client/lib/user/';

import {User} from 'Repositories/entity/User';
import {ReactionMap} from 'Repositories/storage';
import {getEmojiUnicode} from 'Util/EmojiUtil';
import {matchQualifiedIds} from 'Util/QualifiedId';

import {EmojiPill} from './EmojiPill';
import {messageReactionWrapper} from './MessageReactions.styles';

export interface MessageReactionsListProps {
  reactions: ReactionMap;
  handleReactionClick: (emoji: string) => void;
  selfUserId: QualifiedId;
  isMessageFocused: boolean;
  onTooltipReactionCountClick: () => void;
  onLastReactionKeyEvent: () => void;
  isRemovedFromConversation: boolean;
  users: User[];
}

const MessageReactionsList = ({reactions, ...props}: MessageReactionsListProps) => {
  const {selfUserId, users: conversationUsers, ...emojiPillProps} = props;

  return (
    <div css={messageReactionWrapper} data-uie-name="message-reactions">
      {reactions.map(([emoji, users], index) => {
        const emojiUnicode = getEmojiUnicode(emoji);
        const emojiListCount = users.length;
        const hasUserReacted = users.some(user => matchQualifiedIds(selfUserId, user));

        const reactingUsers = users
          .map(qualifiedId => conversationUsers.find(user => matchQualifiedIds(qualifiedId, user.qualifiedId)))
          .filter((user): user is User => typeof user !== 'undefined');

        return (
          <EmojiPill
            reactingUsers={reactingUsers}
            hasUserReacted={hasUserReacted}
            emojiUnicode={emojiUnicode}
            emoji={emoji}
            index={index}
            emojiListCount={emojiListCount}
            {...emojiPillProps}
            key={emojiUnicode + index}
          />
        );
      })}
    </div>
  );
};

export {MessageReactionsList};
