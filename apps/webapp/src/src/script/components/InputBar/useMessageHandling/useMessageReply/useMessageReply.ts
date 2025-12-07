/*
 * Wire
 * Copyright (C) 2025 Wire Swiss GmbH
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

import {useCallback, useEffect, useState} from 'react';

import {amplify} from 'amplify';

import {WebAppEvents} from '@wireapp/webapp-events';

import {ContentMessage} from 'Repositories/entity/message/ContentMessage';

export const useMessageReply = () => {
  const [replyMessageEntity, setReplyMessageEntity] = useState<ContentMessage | null>(null);

  const replyMessage = useCallback((messageEntity: ContentMessage | null) => {
    setReplyMessageEntity(messageEntity);
  }, []);

  const handleRepliedMessageDeleted = useCallback(
    (messageId: string) => {
      if (replyMessageEntity?.id === messageId) {
        replyMessage(null);
      }
    },
    [replyMessageEntity?.id, replyMessage],
  );

  const handleRepliedMessageUpdated = useCallback(
    (originalMessageId: string, messageEntity: ContentMessage) => {
      if (replyMessageEntity?.id === originalMessageId) {
        replyMessage(messageEntity);
      }
    },
    [replyMessageEntity, replyMessage],
  );

  useEffect(() => {
    amplify.subscribe(WebAppEvents.CONVERSATION.MESSAGE.REMOVED, handleRepliedMessageDeleted);
    amplify.subscribe(WebAppEvents.CONVERSATION.MESSAGE.UPDATED, handleRepliedMessageUpdated);

    return () => {
      amplify.unsubscribeAll(WebAppEvents.CONVERSATION.MESSAGE.REMOVED);
      amplify.unsubscribeAll(WebAppEvents.CONVERSATION.MESSAGE.UPDATED);
    };
  }, [handleRepliedMessageDeleted, handleRepliedMessageUpdated, replyMessage]);

  return {
    isReplying: !!replyMessageEntity,
    replyMessageEntity,
    replyMessage,
  };
};
