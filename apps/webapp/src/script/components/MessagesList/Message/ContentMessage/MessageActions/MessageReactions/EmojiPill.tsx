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

import {useMessageFocusedTabIndex} from 'Components/MessagesList/Message/util';
import {User} from 'Repositories/entity/User';
import {getEmojiTitleFromEmojiUnicode} from 'Util/EmojiUtil';
import {isTabKey} from 'Util/KeyboardUtil';
import {t} from 'Util/LocalizerUtil';
import {replaceReactComponents} from 'Util/LocalizerUtil/ReactLocalizerUtil';

import {Tooltip} from '@wireapp/react-ui-kit';

import {EmojiChar} from './EmojiChar';
import {
  getReactionsButtonCSS,
  messageReactionButton,
  messageReactionButtonTooltip,
  messageReactionButtonTooltipImage,
  messageReactionButtonTooltipText,
  messageReactionButtonTooltipTextLink,
  messageReactionCount,
  userBoldStyle,
} from './MessageReactions.styles';

interface EmojiPillProps {
  emoji: string;
  emojiUnicode: string;
  handleReactionClick: (emoji: string) => void;
  isMessageFocused: boolean;
  onTooltipReactionCountClick: () => void;
  onLastReactionKeyEvent: () => void;
  isRemovedFromConversation: boolean;
  index: number;
  emojiListCount: number;
  hasUserReacted: boolean;
  reactingUsers: User[];
}

const MAX_USER_NAMES_TO_SHOW = 2;

export const EmojiPill = ({
  emoji,
  emojiUnicode,
  handleReactionClick,
  isMessageFocused,
  onTooltipReactionCountClick,
  onLastReactionKeyEvent,
  isRemovedFromConversation,
  index,
  emojiListCount,
  hasUserReacted,
  reactingUsers,
}: EmojiPillProps) => {
  const messageFocusedTabIndex = useMessageFocusedTabIndex(isMessageFocused);
  const emojiName = getEmojiTitleFromEmojiUnicode(emojiUnicode);
  const isActive = hasUserReacted && !isRemovedFromConversation;

  const emojiCount = reactingUsers.length;

  const reactingUserNames = reactingUsers.slice(0, MAX_USER_NAMES_TO_SHOW).map(user => user.name());

  const conversationReactionCaption = () => {
    if (emojiCount > MAX_USER_NAMES_TO_SHOW) {
      return t(
        'conversationLikesCaptionPluralMoreThan2',
        {
          number: (emojiCount - MAX_USER_NAMES_TO_SHOW).toString(),
          userNames: reactingUserNames.join(', '),
        },
        {},
        true,
      );
    }

    if (emojiCount === MAX_USER_NAMES_TO_SHOW) {
      return t(
        'conversationLikesCaptionPlural',
        {
          firstUser: reactingUserNames[0],
          secondUser: reactingUserNames[1],
        },
        {},
        true,
      );
    }

    return t('conversationLikesCaptionSingular', {userName: reactingUserNames?.[0] || ''}, {}, true);
  };

  const caption = conversationReactionCaption();

  const content = replaceReactComponents(caption, [
    {
      start: '<strong>',
      end: '</strong>',
      render: text => (
        <strong key={text} css={userBoldStyle}>
          {text}
        </strong>
      ),
    },
    {
      start: '[showmore]',
      end: '[/showmore]',
      render: text => (
        <button key={text} onClick={onTooltipReactionCountClick} css={messageReactionButtonTooltipTextLink}>
          {text}
        </button>
      ),
    },
  ]);

  return (
    !!emojiCount && (
      <Tooltip
        body={
          <div css={messageReactionButtonTooltip}>
            <EmojiChar styles={messageReactionButtonTooltipImage} emoji={emoji} />
            <p css={messageReactionButtonTooltipText}>
              {content}{' '}
              {emojiCount > 1
                ? t('conversationLikesCaptionReactedPlural', {emojiName})
                : t('conversationLikesCaptionReactedSingular', {emojiName})}
            </p>
          </div>
        }
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
          <EmojiChar emoji={emoji} />
          <span css={messageReactionCount(isActive)}>{emojiCount}</span>
        </button>
      </Tooltip>
    )
  );
};
