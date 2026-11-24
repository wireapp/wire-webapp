/*
 * Wire
 * Copyright (C) 2018 Wire Swiss GmbH
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

import {Conversation} from './conversationBase';

import {MLSPublicKeyRecord} from '../client';
import {CONVERSATION_PROTOCOL} from '../team/feature/featureList.types';

export * from './conversationBase';

export interface MLSConversation extends Conversation {
  group_id: string;
  epoch: number;
  cipher_suite: number;
  protocol: CONVERSATION_PROTOCOL.MLS;
}

export interface MLS1to1Conversation {
  conversation: MLSConversation;
  public_keys?: {
    removal: MLSPublicKeyRecord;
  };
}

export function isMLS1to1Conversation(response: unknown): response is MLS1to1Conversation {
  if (typeof response === 'object' && response !== null && 'conversation' in response && 'public_keys' in response) {
    return true;
  }

  return false;
}
