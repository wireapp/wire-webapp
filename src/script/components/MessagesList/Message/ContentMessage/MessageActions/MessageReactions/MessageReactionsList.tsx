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

import {Tooltip} from '@wireapp/react-ui-kit';

import {useMessageFocusedTabIndex} from 'Components/MessagesList/Message/util';
import {getEmojiUnicode, getEmojiTitleFromEmojiUnicode} from 'Util/EmojiUtil';
import {isTabKey} from 'Util/KeyboardUtil';
import {t} from 'Util/LocalizerUtil';
import {Reactions, getEmojiUrl, groupByReactionUsers} from 'Util/ReactionUtil';

import {EmojiImg} from './EmojiImg';
import {
  messageReactionButton,
  messageReactionCount,
  messageReactionWrapper,
  getReactionsButtonCSS,
  messageReactionButtonTooltip,
  messageReactionButtonTooltipTextLink,
  messageReactionButtonTooltipText,
  messageReactionButtonTooltipImage,
} from './MessageReactions.styles';

export interface MessageReactionsListProps {
  reactions: Reactions;
  handleReactionClick: (emoji: string) => void;
  isMessageFocused: boolean;
  onTooltipReactionCountClick: () => void;
  onLastReactionKeyEvent: () => void;
  isRemovedFromConversation: boolean;
}

const MessageReactionsList: FC<MessageReactionsListProps> = ({
  reactions,
  handleReactionClick,
  onTooltipReactionCountClick,
  isMessageFocused,
  onLastReactionKeyEvent,
  isRemovedFromConversation,
}) => {
  const [isSelectedEmoji, setSelected] = useState('');
  const reactionGroupedByUser = groupByReactionUsers(reactions);
  const messageFocusedTabIndex = useMessageFocusedTabIndex(isMessageFocused);
  const reactionsList = Array.from(reactionGroupedByUser);
  return (
    <div css={messageReactionWrapper} data-uie-name="message-reactions">
      {reactionsList.map(([emoji, users], index) => {
        const emojiUnicode = getEmojiUnicode(emoji);
        const emojiUrl = getEmojiUrl(emojiUnicode);
        const emojiName = getEmojiTitleFromEmojiUnicode(emojiUnicode);
        const emojiCount = users.length;
        const isActive = isSelectedEmoji === emojiUrl && !isRemovedFromConversation;
        return (
          <Fragment key={emojiUnicode}>
            <Tooltip
              body={
                <div css={messageReactionButtonTooltip}>
                  <EmojiImg
                    emojiImgSize={{
                      width: '1.2rem',
                    }}
                    styles={messageReactionButtonTooltipImage}
                    emojiUrl={emojiUrl}
                    emojiName={emojiName}
                  />
                  <p css={messageReactionButtonTooltipText}>
                    {/* eslint-disable-next-line jsx-a11y/no-static-element-interactions, jsx-a11y/click-events-have-key-events */}
                    <span onClick={onTooltipReactionCountClick} css={messageReactionButtonTooltipTextLink}>
                      {t('conversationLikesCaption', {number: emojiCount.toString()})}
                    </span>{' '}
                    {t('conversationLikesCaptionReacted', {emojiName})}
                  </p>
                </div>
              }
            >
              <button
                css={{...messageReactionButton, ...getReactionsButtonCSS(isActive, isRemovedFromConversation)}}
                aria-label={t('messageReactionDetails', {emojiCount: emojiCount.toString(), emojiName})}
                title={emojiName}
                aria-pressed={isActive}
                type="button"
                tabIndex={messageFocusedTabIndex}
                className="button-reset-default"
                data-uie-name="emoji-pill"
                onClick={() => {
                  setSelected(emojiUrl);
                  handleReactionClick(emoji);
                }}
                onKeyDown={event => {
                  // is last reaction then on tab key press it should hide the reaction menu
                  if (index === reactionsList.length - 1) {
                    if (!event.shiftKey && isTabKey(event)) {
                      onLastReactionKeyEvent();
                    }
                  }
                }}
              >
                <EmojiImg emojiUrl={emojiUrl} emojiName={emojiName} />
                <span css={messageReactionCount(isActive)}>{emojiCount}</span>
              </button>
            </Tooltip>
          </Fragment>
        );
      })}
    </div>
  );
};

export {MessageReactionsList};
