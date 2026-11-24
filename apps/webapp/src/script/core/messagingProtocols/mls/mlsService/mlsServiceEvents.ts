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

export enum MLSServiceEvents {
  NEW_EPOCH = 'newEpoch',
  MLS_CLIENT_MISMATCH = 'mlsClientMismatch',
  MLS_EVENT_DISTRIBUTED = 'mlsEventDistributed',
  KEY_MATERIAL_UPDATE_FAILURE = 'keyMaterialUpdateFailure',
  MLS_CONVERSATION_RECOVERY_REQUIRED = 'mlsConversationRecoveryRequired',
}

export type MLSServiceEventPayloads = {
  [MLSServiceEvents.KEY_MATERIAL_UPDATE_FAILURE]: {error: unknown; groupId: string};
  [MLSServiceEvents.NEW_EPOCH]: {epoch: bigint; groupId: string};
  [MLSServiceEvents.MLS_CLIENT_MISMATCH]: void;
  [MLSServiceEvents.MLS_EVENT_DISTRIBUTED]: {
    events: any;
    time: string;
  };
  [MLSServiceEvents.MLS_CONVERSATION_RECOVERY_REQUIRED]: void;
};
