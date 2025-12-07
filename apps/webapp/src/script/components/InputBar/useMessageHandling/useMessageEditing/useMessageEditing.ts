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
import {ContentMessage} from 'Repositories/entity/message/ContentMessage';

import {WebAppEvents} from '@wireapp/webapp-events';

export const useMessageEditing = () => {
  const [editedMessage, setEditedMessage] = useState<ContentMessage | undefined>();

  const cancelMessageEditing = useCallback((callback?: () => void) => {
    setEditedMessage(undefined);
    callback?.();
  }, []);

  const editMessage = useCallback((messageEntity: ContentMessage) => {
    setEditedMessage(messageEntity);
  }, []);

  useEffect(() => {
    amplify.subscribe(WebAppEvents.CONVERSATION.MESSAGE.EDIT, editMessage);

    return () => {
      amplify.unsubscribeAll(WebAppEvents.CONVERSATION.MESSAGE.EDIT);
    };
  }, [editMessage]);

  return {
    editedMessage,
    editMessage,
    isEditing: !!editedMessage,
    cancelMessageEditing,
  };
};
