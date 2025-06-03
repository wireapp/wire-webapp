/*
 * Wire
 * Copyright (C) 2022 Wire Swiss GmbH
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

import {QualifiedId} from '@wireapp/api-client/lib/user';

export type ClientId = string;

export type SecretCrypto = {
  encrypt: (value: Uint8Array) => Promise<Uint8Array>;
  decrypt: (payload: Uint8Array) => Promise<Uint8Array>;
};

export interface CoreCallbacks {
  /**
   * Should return a groupId corresponding to the conversation ID given
   * Used for the core to know what core-crypto conversation we are dealing with when receiving events
   * @param conversationId
   * @returns the groupId corresponding to the conversation ID
   */
  groupIdFromConversationId: (conversationId: QualifiedId) => Promise<string | undefined>;
}

export type CommonMLS = {
  groupId: string;
};

export type HandlePendingProposalsParams = {
  delayInMs: number;
  eventTime: string;
} & CommonMLS;
