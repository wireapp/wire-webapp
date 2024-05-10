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

import {HTMLProps, useState, FC, useEffect} from 'react';

import ko from 'knockout';

import {ChevronIcon, IconButton} from '@wireapp/react-ui-kit';

import {Conversation as ConversationEntity} from '../../entity/Conversation';
import {Message} from '../../entity/message/Message';

export interface MessageVisibility {
  message: Message;
  isVisible: boolean;
}

export interface LastMessageVisibilityTrackerProps extends HTMLProps<HTMLElement> {
  onGoToLastMessage: () => void;
  messageVisibility: ko.Observable<MessageVisibility>;
  conversation: ConversationEntity;
}

// conversation.last_event_timestamp doesn't contain system messages
const lastMessageId = (conversation: ConversationEntity): string => {
  if (!conversation.hasLastReceivedMessageLoaded() || (conversation.messages()?.length || 0) === 0) {
    return '';
  }
  return conversation.messages()[conversation.messages().length - 1].id;
};

export const LastMessageVisibilityTracker: FC<LastMessageVisibilityTrackerProps> = ({
  onGoToLastMessage,
  messageVisibility,
  conversation,
  ...rest
}: LastMessageVisibilityTrackerProps) => {
  const [lastMessageShown, setLastMessageShown] = useState<boolean>(false);

  useEffect(() => {
    const subscription = messageVisibility.subscribe(({message, isVisible}: MessageVisibility) => {
      if (!conversation.hasLastReceivedMessageLoaded()) {
        setLastMessageShown(false);
      } else if (message.id === lastMessageId(conversation)) {
        setLastMessageShown(isVisible);
      }
    });

    return () => {
      subscription.dispose();
    };
  }, []);

  if (lastMessageShown) {
    return null;
  }

  return (
    <IconButton onClick={onGoToLastMessage} {...rest}>
      <ChevronIcon css={{rotate: '90deg', height: 16, width: 16, path: {fill: '#0667C8'}}} />
    </IconButton>
  );
};
