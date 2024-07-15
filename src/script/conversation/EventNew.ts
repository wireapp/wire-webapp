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

import type {QualifiedId} from '@wireapp/api-client/lib/user';

import {createUuid} from 'Util/uuid';

import type {Conversation} from '../entity/Conversation';

function buildQualifiedId(conversation: QualifiedId | string) {
  const qualifiedId = typeof conversation === 'string' ? {domain: '', id: conversation} : conversation;
  return {
    conversation: qualifiedId.id,
    qualified_conversation: {domain: qualifiedId.domain, id: qualifiedId.id},
  };
}

type EventInput = {
  conversation: Conversation;
  eventType: string;
  additionalData?: {};
  from?: string;
  timestamp?: number;
};

export function createBaseEvent<T extends {type: string; data?: unknown}>({
  conversation,
  eventType,
  additionalData = {},
  from,
  timestamp,
}: EventInput): T {
  return {
    ...buildQualifiedId(conversation),
    data: additionalData,
    from: from ?? conversation.selfUser()?.id,
    id: createUuid(),
    time: new Date(timestamp || conversation.getNextTimestamp()).toISOString(),
    type: eventType,
  } as unknown as T;
}
