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

import {FC, useState} from 'react';

import {Tooltip} from '@wireapp/react-ui-kit';

import {useMessageFocusedTabIndex} from 'Components/MessagesList/Message/util';
import {getEmojiTitleFromEmojiUnicode} from 'Util/EmojiUtil';
import {isTabKey} from 'Util/KeyboardUtil';
import {t} from 'Util/LocalizerUtil';
import {getEmojiUrl} from 'Util/ReactionUtil';

import {EmojiImg} from './EmojiImg';
import {
  getReactionsButtonCSS,
  messageReactionButton,
  messageReactionButtonTooltip,
  messageReactionButtonTooltipImage,
  messageReactionButtonTooltipText,
  messageReactionButtonTooltipTextLink,
  messageReactionCount,
} from './MessageReactions.styles';

export interface EmojiPillProps {
  emoji: string;
  emojiUnicode: string;
  emojiCount: number;
  handleReactionClick: (emoji: string) => void;
  isMessageFocused: boolean;
  onTooltipReactionCountClick: () => void;
  onLastReactionKeyEvent: () => void;
  isRemovedFromConversation: boolean;
  index: number;
  emojiListCount: number;
}

const EmojiPill: FC<EmojiPillProps> = ({
  emoji,
  emojiUnicode,
  emojiCount,
  handleReactionClick,
  isMessageFocused,
  onTooltipReactionCountClick,
  onLastReactionKeyEvent,
  isRemovedFromConversation,
  index,
  emojiListCount,
}) => {
  const [isSelectedEmoji, setSelected] = useState('');
  const messageFocusedTabIndex = useMessageFocusedTabIndex(isMessageFocused);
  const [isOpen, setTooltipVisibility] = useState(false);
  const emojiUrl = getEmojiUrl(emojiUnicode);
  const emojiName = getEmojiTitleFromEmojiUnicode(emojiUnicode);
  const isActive = isSelectedEmoji === emojiUrl && !isRemovedFromConversation;
  return (
    <>
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
        isOpen={isOpen}
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
            if (index === emojiListCount - 1) {
              if (!event.shiftKey && isTabKey(event)) {
                onLastReactionKeyEvent();
              }
            }
          }}
          onMouseEnter={event => {
            setTooltipVisibility(true);
          }}
          onMouseLeave={event => {
            setTooltipVisibility(false);
          }}
          onFocus={() => {
            setTooltipVisibility(true);
          }}
          onBlur={() => {
            setTooltipVisibility(false);
          }}
        >
          <EmojiImg emojiUrl={emojiUrl} emojiName={emojiName} />
          <span css={messageReactionCount(isActive)}>{emojiCount}</span>
        </button>
      </Tooltip>
    </>
  );
};

export {EmojiPill};
