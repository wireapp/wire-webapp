/*
 * Wire
 * Copyright (C) 2024 Wire Swiss GmbH
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

import {useEffect, useState} from 'react';

import {useDebouncedCallback} from 'use-debounce';

import {ChevronIcon, IconButton} from '@wireapp/react-ui-kit';

import {
  jumpToLastMessageButtonStyles,
  jumpToLastMessageChevronStyles,
} from 'Components/MessagesList/MessageList.styles';
import {Conversation} from 'Repositories/entity/Conversation';
import {t} from 'Util/LocalizerUtil';

interface JumpToLastMessageButtonProps {
  onGoToLastMessage: () => void;
  conversation: Conversation;
}

export const JumpToLastMessageButton = ({onGoToLastMessage, conversation}: JumpToLastMessageButtonProps) => {
  const [isLastMessageVisible, setIsLastMessageVisible] = useState(conversation.isLastMessageVisible());

  const debouncedSetVisibility = useDebouncedCallback((value: boolean) => {
    setIsLastMessageVisible(value);
  }, 200);

  useEffect(() => {
    const subscription = conversation.isLastMessageVisible.subscribe(debouncedSetVisibility);
    return () => {
      subscription.dispose();
    };
  }, [conversation, debouncedSetVisibility]);

  if (isLastMessageVisible) {
    return null;
  }

  return (
    <IconButton
      aria-label={t('jumpToLastMessage')}
      data-uie-name="jump-to-last-message-button"
      onClick={onGoToLastMessage}
      css={jumpToLastMessageButtonStyles}
    >
      <ChevronIcon css={jumpToLastMessageChevronStyles} />
    </IconButton>
  );
};
