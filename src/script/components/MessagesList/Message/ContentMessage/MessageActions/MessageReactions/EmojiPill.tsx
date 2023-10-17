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
  hasUserReacted: boolean;
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
  hasUserReacted,
}) => {
  const messageFocusedTabIndex = useMessageFocusedTabIndex(isMessageFocused);
  const [isOpen, setTooltipVisibility] = useState(false);
  const emojiUrl = getEmojiUrl(emojiUnicode);
  const emojiName = getEmojiTitleFromEmojiUnicode(emojiUnicode);
  const isActive = hasUserReacted && !isRemovedFromConversation;

  const showTooltip = () => {
    setTooltipVisibility(true);
  };

  const hideTooltip = () => {
    setTooltipVisibility(false);
  };
  return (
    <div onMouseEnter={showTooltip} onMouseLeave={hideTooltip} onFocus={showTooltip} onBlur={hideTooltip}>
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
                {emojiCount > 1
                  ? t('conversationLikesCaptionPlural', {number: emojiCount.toString()})
                  : t('conversationLikesCaptionSingular', {number: emojiCount.toString()})}
              </span>{' '}
              {emojiCount > 1
                ? t('conversationLikesCaptionReactedPlural', {emojiName})
                : t('conversationLikesCaptionReactedSingular', {emojiName})}
            </p>
          </div>
        }
        isOpen={isOpen}
      >
        <button
          css={{...messageReactionButton, ...getReactionsButtonCSS(isActive, isRemovedFromConversation)}}
          aria-label={
            emojiCount > 1
              ? t('accessibility.messageReactionDetailsPlural', {emojiCount: emojiCount.toString(), emojiName})
              : t('accessibility.messageReactionDetailsSingular', {emojiCount: emojiCount.toString(), emojiName})
          }
          title={emojiName}
          aria-pressed={isActive}
          type="button"
          tabIndex={messageFocusedTabIndex}
          className="button-reset-default"
          data-uie-name="emoji-pill"
          onClick={() => {
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
        >
          <EmojiImg
            emojiUrl={emojiUrl}
            emojiName={emojiName}
            emojiImgSize={{
              width: 'var(--font-size-medium)',
            }}
          />
          <span css={messageReactionCount(isActive)}>{emojiCount}</span>
        </button>
      </Tooltip>
    </div>
  );
};

export {EmojiPill};
