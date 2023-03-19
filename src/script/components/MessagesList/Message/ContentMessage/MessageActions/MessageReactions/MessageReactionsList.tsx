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

import {FC, Fragment, useState} from 'react';

import {getEmojiUnicode, getEmojiTitleFromEmojiUnicode} from 'Util/EmojiUtil';
import {Reactions, getEmojiUrl, transformReactionObj} from 'Util/ReactionUtil';

import {EmojiImg} from './EmojiImg';
import {
  messageReactionButton,
  messageReactionCount,
  messageReactionWrapper,
  getReactionsButtonCSS,
} from './MessageReactions.styles';

export interface MessageReactionsListProps {
  reactions: Reactions;
  handleReactionClick: (emoji: string) => void;
}

const MessageReactionsList: FC<MessageReactionsListProps> = ({reactions, handleReactionClick}) => {
  const [isSelectedEmoji, setSelected] = useState('');
  const reactionGroupedByUser = transformReactionObj(reactions);
  return (
    <div css={messageReactionWrapper}>
      {Array.from(reactionGroupedByUser).map(([emoji, users], index) => {
        const emojiUnicode = getEmojiUnicode(emoji);
        const emojiUrl = getEmojiUrl(emojiUnicode);
        const emojiName = getEmojiTitleFromEmojiUnicode(emojiUnicode);
        const isActive = isSelectedEmoji === emojiUrl;
        return (
          <Fragment key={emojiUnicode}>
            <button
              css={{...messageReactionButton, ...getReactionsButtonCSS(isActive)}}
              aria-label={emojiName}
              aria-pressed={isActive}
              type="button"
              className="button-reset-default"
              onClick={() => {
                setSelected(emojiUrl);
                handleReactionClick(emoji);
              }}
            >
              <EmojiImg emojiUrl={emojiUrl} emojiName={emojiName} />
              <span css={messageReactionCount}>({users.length})</span>
            </button>
          </Fragment>
        );
      })}
    </div>
  );
};

export {MessageReactionsList};
