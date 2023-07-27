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

import {getEmojiUnicode} from 'Util/EmojiUtil';
import {Reactions, groupByReactionUsers} from 'Util/ReactionUtil';

import {EmojiPill} from './EmojiPill';
import {messageReactionWrapper} from './MessageReactions.styles';

export interface MessageReactionsListProps {
  reactions: Reactions;
  handleReactionClick: (emoji: string) => void;
  userId: string;
  isMessageFocused: boolean;
  onTooltipReactionCountClick: () => void;
  onLastReactionKeyEvent: () => void;
  isRemovedFromConversation: boolean;
}

const MessageReactionsList: FC<MessageReactionsListProps> = ({reactions, ...props}) => {
  const reactionGroupedByUser = groupByReactionUsers(reactions);
  const reactionsList = Array.from(reactionGroupedByUser);
  return (
    <div css={messageReactionWrapper} data-uie-name="message-reactions">
      {reactionsList.map(([emoji, users], index) => {
        const emojiUnicode = getEmojiUnicode(emoji);
        const emojiListCount = reactionsList.length;
        const hasUserReacted = users.includes(props.userId);

        return (
          <EmojiPill
            emojiCount={users.length}
            hasUserReacted={hasUserReacted}
            emojiUnicode={emojiUnicode}
            emoji={emoji}
            index={index}
            emojiListCount={emojiListCount}
            {...props}
            key={emojiUnicode}
          />
        );
      })}
    </div>
  );
};

export {MessageReactionsList};
