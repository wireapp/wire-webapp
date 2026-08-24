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

import {useRef, useState} from 'react';

import type {QualifiedId} from '@wireapp/api-client/lib/user';
import {task} from 'true-myth';

import {Tooltip} from '@wireapp/react-ui-kit';

import {useMessageFocusedTabIndex} from 'Components/MessagesList/Message/util';
import type {User} from 'Repositories/entity/User';
import {getEmojiTitleFromEmojiUnicode} from 'Util/emojiUtil';
import {isTabKey} from 'Util/keyboardUtil';
import type {Translate} from 'Util/localizerUtil';
import {replaceReactComponents} from 'Util/localizerUtil/reactLocalizerUtil';
import {matchQualifiedIds} from 'Util/qualifiedId';

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
  translate: Translate;
  emoji: string;
  emojiUnicode: string;
  handleReactionClick: (emoji: string) => void;
  isMessageFocused: boolean;
  onTooltipReactionCountClick: () => void;
  onLastReactionKeyEvent: () => void;
  isRemovedFromConversation: boolean;
  index: number;
  emojiListCount: number;
  emojiCount: number;
  hasUserReacted: boolean;
  reactingUsers: User[];
  reactorIds: QualifiedId[];
  loadUsersByIdsFromDb: (userIds: QualifiedId[]) => Promise<User[]>;
}

const MAX_USER_NAMES_TO_SHOW = 2;

export const EmojiPill = ({
  translate,
  emoji,
  emojiUnicode,
  handleReactionClick,
  isMessageFocused,
  onTooltipReactionCountClick,
  onLastReactionKeyEvent,
  isRemovedFromConversation,
  index,
  emojiListCount,
  emojiCount,
  hasUserReacted,
  reactingUsers,
  reactorIds,
  loadUsersByIdsFromDb,
}: EmojiPillProps) => {
  const [storedReactingUsers, setStoredReactingUsers] = useState<User[]>([]);
  const isLoadingStoredUsers = useRef(false);
  const messageFocusedTabIndex = useMessageFocusedTabIndex(isMessageFocused);
  const emojiName = getEmojiTitleFromEmojiUnicode(emojiUnicode);
  const isActive = hasUserReacted && !isRemovedFromConversation;

  // Prefer the already-cached conversation members and resolve departed reactors from IndexedDB only on demand.
  const resolvedReactingUsers = [...reactingUsers, ...storedReactingUsers];
  const tooltipReactorIds = reactorIds.slice(0, MAX_USER_NAMES_TO_SHOW);
  const missingReactorIds = tooltipReactorIds.filter(
    reactorId => !resolvedReactingUsers.some(user => matchQualifiedIds(reactorId, user.qualifiedId)),
  );

  const reactingUserNames = tooltipReactorIds.map(reactorId => {
    const user = resolvedReactingUsers.find(reactingUser => matchQualifiedIds(reactorId, reactingUser.qualifiedId));
    return user?.name() || translate('deletedUser');
  });

  async function loadMissingReactingUsers(): Promise<void> {
    if (missingReactorIds.length === 0 || isLoadingStoredUsers.current) {
      return;
    }

    isLoadingStoredUsers.current = true;
    try {
      const loadResult = await task.tryOrElse(
        () => 'failedToLoadReactionUsers' as const,
        () => loadUsersByIdsFromDb(missingReactorIds),
      );

      if (loadResult.isErr) {
        return;
      }

      setStoredReactingUsers(currentUsers => {
        const newUsers = loadResult.value.filter(
          loadedUser => !currentUsers.some(user => matchQualifiedIds(loadedUser.qualifiedId, user.qualifiedId)),
        );
        return [...currentUsers, ...newUsers];
      });
    } finally {
      isLoadingStoredUsers.current = false;
    }
  }

  const conversationReactionCaption = () => {
    if (emojiCount > MAX_USER_NAMES_TO_SHOW) {
      return translate(
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
      return translate(
        'conversationLikesCaptionPlural',
        {
          firstUser: reactingUserNames[0],
          secondUser: reactingUserNames[1],
        },
        {},
        true,
      );
    }

    return translate('conversationLikesCaptionSingular', {userName: reactingUserNames?.[0] || ''}, {}, true);
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
                ? translate('conversationLikesCaptionReactedPlural', {emojiName})
                : translate('conversationLikesCaptionReactedSingular', {emojiName})}
            </p>
          </div>
        }
      >
        <button
          css={{...messageReactionButton, ...getReactionsButtonCSS(isActive, isRemovedFromConversation)}}
          aria-label={
            emojiCount > 1
              ? translate('accessibility.messageReactionDetailsPlural', {
                  emojiCount: emojiCount.toString(),
                  emojiName,
                })
              : translate('accessibility.messageReactionDetailsSingular', {
                  emojiCount: emojiCount.toString(),
                  emojiName,
                })
          }
          title={emojiName}
          aria-pressed={isActive}
          type="button"
          tabIndex={messageFocusedTabIndex}
          className="button-reset-default"
          data-uie-name="emoji-pill"
          onMouseEnter={() => {
            void loadMissingReactingUsers();
          }}
          onFocus={() => {
            void loadMissingReactingUsers();
          }}
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
