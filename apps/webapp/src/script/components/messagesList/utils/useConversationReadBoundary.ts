/*
 * Wire
 * Copyright (C) 2026 Wire Swiss GmbH
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

import {useEffect, useRef, useState} from 'react';
import type {Dispatch, MutableRefObject, SetStateAction} from 'react';

import {Conversation} from 'Repositories/entity/Conversation';
import {useKoSubscribableChildren} from 'Util/componentUtil';

export type ConversationReadBoundary = {
  readonly timestamp: number;
  readonly timestampReference: MutableRefObject<number>;
  readonly setTimestamp: Dispatch<SetStateAction<number>>;
};

export function useConversationReadBoundary(conversation: Conversation): ConversationReadBoundary {
  const {manualUnreadTimestamp} = useKoSubscribableChildren(conversation, ['manualUnreadTimestamp']);
  const [timestamp, setTimestamp] = useState(conversation.effectiveReadTimestamp());
  const timestampReference = useRef(timestamp);

  useEffect(() => {
    setTimestamp(conversation.effectiveReadTimestamp());
  }, [conversation, manualUnreadTimestamp]);

  useEffect(() => {
    timestampReference.current = timestamp;
  }, [timestamp]);

  return {timestamp, timestampReference, setTimestamp};
}
