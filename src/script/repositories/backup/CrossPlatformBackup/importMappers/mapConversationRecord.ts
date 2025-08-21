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

import {ConversationRecord} from 'Repositories/storage';

import {BackUpConversation} from '../CPB.library';

export const mapConversationRecord = ({
  id: qualifiedId,
  name,
  lastModifiedTime,
}: BackUpConversation): ConversationRecord | null => {
  if (!qualifiedId || !name) {
    return null;
  }

  const lastEventTimestamp = lastModifiedTime ? new Date(lastModifiedTime.date.toString()).getTime() : 0;

  // We dont get all the "required" fields from the backup, so we need to outsmart the type system.
  // ToDO: Fix the backup to include all required fields or check if we can make them optional without breaking anything.
  const conversationRecord: ConversationRecord = {
    id: qualifiedId.id.toString(),
    name: name.toString(),
    domain: qualifiedId.domain.toString(),
    last_read_timestamp: new Date().getTime(),
    last_event_timestamp: lastEventTimestamp,
  } as ConversationRecord;
  return conversationRecord;
};
