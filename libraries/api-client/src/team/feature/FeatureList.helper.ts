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

import {CONVERSATION_PROTOCOL} from './FeatureList.types';

export const mapToConversationProtocol = (protocol: unknown): CONVERSATION_PROTOCOL | undefined => {
  if (typeof protocol !== 'string') {
    return undefined;
  }
  switch (protocol) {
    case CONVERSATION_PROTOCOL.MLS:
      return CONVERSATION_PROTOCOL.MLS;
    case CONVERSATION_PROTOCOL.PROTEUS:
      return CONVERSATION_PROTOCOL.PROTEUS;
    case CONVERSATION_PROTOCOL.MIXED:
      return CONVERSATION_PROTOCOL.MIXED;
    default:
      return undefined;
  }
};
