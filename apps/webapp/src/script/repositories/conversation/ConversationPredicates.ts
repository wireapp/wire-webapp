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

import {isNonEmptyString} from '@sindresorhus/is';

import {CONVERSATION_TYPE} from '../../apiClient/conversation/conversation';

export function isProteusTeam1to1Conversation({
  name,
  type,
  inTeam,
  otherMembersLength,
}: {
  name: string | undefined;
  type: CONVERSATION_TYPE;
  inTeam: boolean;
  otherMembersLength: number;
}): boolean {
  const isGroupConversation = type === CONVERSATION_TYPE.REGULAR;
  const hasOneParticipant = otherMembersLength === 1;
  return isGroupConversation && hasOneParticipant && inTeam && !isNonEmptyString(name);
}
