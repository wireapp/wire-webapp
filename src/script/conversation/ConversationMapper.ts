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

import {isObject} from 'underscore';
import ko from 'knockout';
import {LegalHoldStatus} from '@wireapp/protocol-messaging';
import {
  ConversationCode,
  DefaultConversationRoleName,
  CONVERSATION_ACCESS,
  CONVERSATION_ACCESS_ROLE,
  CONVERSATION_TYPE,
} from '@wireapp/api-client/src/conversation';
import {ACCESS_STATE} from './AccessState';
import {NOTIFICATION_STATE} from './NotificationSetting';
import {ConversationStatus} from './ConversationStatus';
import {Conversation, SerializedConversation} from '../entity/Conversation';
import {BASE_ERROR_TYPE, BaseError} from '../error/BaseError';
import {ConversationError} from '../error/ConversationError';
import {Conversation as ConversationBackendData} from '@wireapp/api-client/src/conversation/';

/** Conversation self data from the database. */
export interface SelfStatusUpdateDatabaseData {
  archived_state: boolean;
  archived_timestamp: number;
  cleared_timestamp: number;
  ephemeral_timer: number;
  last_event_timestamp: number;
  last_read_timestamp: number;
  last_server_timestamp: number;
  legal_hold_status: LegalHoldStatus;
  message_timer: number;
  muted_state: number;
  muted_timestamp: number;
  otr_archived: boolean;
  otr_archived_ref: string;
  otr_muted: boolean;
  otr_muted_ref: string;
  otr_muted_status: number;
  receipt_mode: number;
  status: number;
  verification_state: number;
}

export type ConversationDatabaseData = SerializedConversation &
  Partial<ConversationBackendData> & {
    accessModes: CONVERSATION_ACCESS[];
    accessRole: CONVERSATION_ACCESS_ROLE;
    roles: {[userId: string]: DefaultConversationRoleName | string};
    status: ConversationStatus;
    team_id: string;
  };

export class ConversationMapper {
  mapConversations(conversationsData: ConversationDatabaseData[], timestamp: number = 1): Conversation[] {
    if (conversationsData === undefined) {
      throw new ConversationError(BASE_ERROR_TYPE.MISSING_PARAMETER, BaseError.MESSAGE.MISSING_PARAMETER);
    }
    if (!Array.isArray(conversationsData) || !conversationsData.length) {
      throw new ConversationError(BASE_ERROR_TYPE.INVALID_PARAMETER, BaseError.MESSAGE.INVALID_PARAMETER);
    }
    return conversationsData.map((conversationData: ConversationDatabaseData, index: number) => {
      return this._createConversationEntity(conversationData, timestamp + index);
    });
  }

  updateProperties(
    conversationEntity: Conversation & {[index: string]: Function},
    conversationData: ConversationBackendData,
  ): Conversation {
    Object.entries(conversationData).forEach(([key, value]) => {
      if (key !== 'id') {
        if (value !== undefined && conversationEntity.hasOwnProperty(key)) {
          if (ko.isObservable(conversationEntity[key])) {
            conversationEntity[key](value);
          } else {
            conversationEntity[key] = value;
          }
        }
      }
    });

    return conversationEntity;
  }

  updateSelfStatus(
    conversationEntity: Conversation,
    selfState: Partial<SelfStatusUpdateDatabaseData>,
    disablePersistence: boolean = false,
  ): Conversation {
    if (disablePersistence) {
      conversationEntity.setStateChangePersistence(false);
    }

    // Database states
    const {
      archived_timestamp,
      cleared_timestamp,
      ephemeral_timer,
      message_timer,
      last_event_timestamp,
      last_read_timestamp,
      last_server_timestamp,
      legal_hold_status,
      muted_timestamp,
      receipt_mode,
      status,
      verification_state,
    } = selfState;

    if (archived_timestamp) {
      conversationEntity.setTimestamp(archived_timestamp, Conversation.TIMESTAMP_TYPE.ARCHIVED);
      conversationEntity.archivedState(selfState.archived_state);
    }

    if (cleared_timestamp !== undefined) {
      conversationEntity.setTimestamp(cleared_timestamp, Conversation.TIMESTAMP_TYPE.CLEARED, true);
    }

    if (ephemeral_timer !== undefined) {
      conversationEntity.localMessageTimer(ephemeral_timer);
    }

    if (message_timer !== undefined) {
      conversationEntity.globalMessageTimer(message_timer);
    }

    if (receipt_mode !== undefined) {
      conversationEntity.receiptMode(receipt_mode);
    }

    if (last_event_timestamp) {
      conversationEntity.setTimestamp(last_event_timestamp, Conversation.TIMESTAMP_TYPE.LAST_EVENT);
    }

    if (last_read_timestamp) {
      conversationEntity.setTimestamp(last_read_timestamp, Conversation.TIMESTAMP_TYPE.LAST_READ);
    }

    if (last_server_timestamp) {
      conversationEntity.setTimestamp(last_server_timestamp, Conversation.TIMESTAMP_TYPE.LAST_SERVER);
    }

    if (muted_timestamp) {
      conversationEntity.setTimestamp(muted_timestamp, Conversation.TIMESTAMP_TYPE.MUTED);
      conversationEntity.mutedState(selfState.muted_state);
    }

    if (status !== undefined) {
      conversationEntity.status(status);
    }

    if (verification_state !== undefined) {
      conversationEntity.verification_state(verification_state);
    }

    if (legal_hold_status) {
      conversationEntity.legalHoldStatus(legal_hold_status);
    }

    // Backend states
    const {otr_archived, otr_muted} = selfState;

    if (otr_archived !== undefined) {
      const archivedTimestamp = new Date(selfState.otr_archived_ref).getTime();
      conversationEntity.setTimestamp(archivedTimestamp, Conversation.TIMESTAMP_TYPE.ARCHIVED);
      conversationEntity.archivedState(otr_archived);
    }

    if (otr_muted !== undefined) {
      const mutedTimestamp = new Date(selfState.otr_muted_ref).getTime();
      conversationEntity.setTimestamp(mutedTimestamp, Conversation.TIMESTAMP_TYPE.MUTED);

      const mutedState = this.getMutedState(otr_muted, selfState.otr_muted_status);
      if (typeof mutedState === 'boolean') {
        conversationEntity.mutedState(mutedState === true ? NOTIFICATION_STATE.NOTHING : NOTIFICATION_STATE.EVERYTHING);
      } else {
        conversationEntity.mutedState(mutedState);
      }
    }

    if (disablePersistence) {
      conversationEntity.setStateChangePersistence(true);
    }

    return conversationEntity;
  }

  _createConversationEntity(conversationData: ConversationDatabaseData, initialTimestamp?: number): Conversation {
    if (conversationData === undefined) {
      throw new ConversationError(BASE_ERROR_TYPE.MISSING_PARAMETER, BaseError.MESSAGE.MISSING_PARAMETER);
    }
    if (!isObject(conversationData) || !Object.keys(conversationData).length) {
      throw new ConversationError(BASE_ERROR_TYPE.INVALID_PARAMETER, BaseError.MESSAGE.INVALID_PARAMETER);
    }

    const {creator, id, members, name, others, type} = conversationData;
    let conversationEntity = new Conversation(id);
    conversationEntity.roles(conversationData.roles || {});

    conversationEntity.creator = creator;
    conversationEntity.type(type);
    conversationEntity.name(name || '');

    const selfState = members ? members.self : conversationData;
    conversationEntity = this.updateSelfStatus(conversationEntity, selfState as any);

    if (!conversationEntity.last_event_timestamp() && initialTimestamp) {
      conversationEntity.last_event_timestamp(initialTimestamp);
      conversationEntity.last_server_timestamp(initialTimestamp);
    }

    // Active participants from database or backend payload
    const participatingUserIds = others || members.others.map(other => other.id);
    conversationEntity.participating_user_ids(participatingUserIds);

    // Team ID from database or backend payload
    const teamId = conversationData.team_id || conversationData.team;
    if (teamId) {
      conversationEntity.team_id = teamId;
    }

    if (conversationData.is_guest) {
      conversationEntity.isGuest(conversationData.is_guest);
    }

    // Access related data
    const accessModes = conversationData.accessModes || conversationData.access;
    const accessRole = conversationData.accessRole || conversationData.access_role;
    if (accessModes && accessRole) {
      this.mapAccessState(conversationEntity, accessModes, accessRole);
    }

    conversationEntity.receiptMode(conversationData.receipt_mode);

    return conversationEntity;
  }

  getMutedState(mutedState: boolean, notificationState: number): boolean | number {
    const validNotificationStates = Object.values(NOTIFICATION_STATE);
    if (validNotificationStates.includes(notificationState)) {
      // Ensure bit at offset 0 to be 1 for backwards compatibility of deprecated boolean based state is true
      return mutedState ? notificationState | 0b1 : NOTIFICATION_STATE.EVERYTHING;
    }

    return typeof mutedState === 'boolean' ? mutedState : NOTIFICATION_STATE.EVERYTHING;
  }

  mergeConversation(
    localConversations: ConversationDatabaseData[],
    remoteConversations: ConversationBackendData[],
  ): ConversationDatabaseData[] {
    localConversations = localConversations.filter(conversationData => conversationData);

    return remoteConversations.map(
      (remoteConversationData: ConversationBackendData & {receipt_mode: number}, index: number) => {
        const conversationId = remoteConversationData.id;
        const newLocalConversation = {id: conversationId} as ConversationDatabaseData;
        const localConversationData: ConversationDatabaseData =
          localConversations.find(({id}) => id === conversationId) || newLocalConversation;

        const {
          access,
          access_role,
          creator,
          members,
          message_timer,
          receipt_mode,
          name,
          team,
          type,
        } = remoteConversationData;
        const {others: othersStates, self: selfState} = members;

        const updates: Record<string, any> = {
          accessModes: access,
          accessRole: access_role,
          creator,
          message_timer,
          name,
          receipt_mode,
          roles: {},
          status: (selfState as any).status,
          team_id: team,
          type,
        };

        // Add roles for self
        if (selfState.conversation_role && !(selfState.id in updates.roles)) {
          updates.roles[selfState.id] = selfState.conversation_role;
        }

        // Add roles for others
        othersStates.map(other => {
          if (other.conversation_role && !(other.conversation_role in updates.roles)) {
            updates.roles[other.id] = other.conversation_role;
          }
        });

        if (typeof localConversationData.receipt_mode === 'number') {
          updates.receipt_mode = localConversationData.receipt_mode;
        }

        const mergedConversation: ConversationDatabaseData = {...localConversationData, ...updates};

        const isGroup = type === CONVERSATION_TYPE.REGULAR;
        const noOthers = !mergedConversation.others || !mergedConversation.others.length;
        if (isGroup || noOthers) {
          mergedConversation.others = othersStates
            .filter(otherState => (otherState.status as number) === (ConversationStatus.CURRENT_MEMBER as number))
            .map(otherState => otherState.id);
        }

        // This should ensure a proper order
        if (!mergedConversation.last_event_timestamp) {
          mergedConversation.last_event_timestamp = index + 1;
        }

        // Set initially or correct server timestamp
        const wrongServerTimestamp = mergedConversation.last_server_timestamp < mergedConversation.last_event_timestamp;
        if (!mergedConversation.last_server_timestamp || wrongServerTimestamp) {
          mergedConversation.last_server_timestamp = mergedConversation.last_event_timestamp;
        }

        const isRemoteTimestampNewer = (localTimestamp: number | undefined, remoteTimestamp: number): boolean => {
          return localTimestamp !== undefined && remoteTimestamp > localTimestamp;
        };

        // Some archived timestamp were not properly stored in the database.
        // To fix this we check if the remote one is newer and update our local timestamp.
        const {archived_state: archivedState, archived_timestamp: archivedTimestamp} = localConversationData;
        const remoteArchivedTimestamp = new Date(selfState.otr_archived_ref).getTime();
        const isRemoteArchivedTimestampNewer = isRemoteTimestampNewer(archivedTimestamp, remoteArchivedTimestamp);

        if (isRemoteArchivedTimestampNewer || archivedState === undefined) {
          mergedConversation.archived_state = selfState.otr_archived;
          mergedConversation.archived_timestamp = remoteArchivedTimestamp;
        }

        const {muted_state: mutedState, muted_timestamp: mutedTimestamp} = localConversationData;
        const remoteMutedTimestamp = new Date(selfState.otr_muted_ref).getTime();
        const isRemoteMutedTimestampNewer = isRemoteTimestampNewer(mutedTimestamp, remoteMutedTimestamp);

        if (isRemoteMutedTimestampNewer || mutedState === undefined) {
          const remoteMutedState = this.getMutedState(selfState.otr_muted, selfState.otr_muted_status);
          mergedConversation.muted_state = remoteMutedState;
          mergedConversation.muted_timestamp = remoteMutedTimestamp;
        }

        return mergedConversation;
      },
    );
  }

  mapAccessCode(conversationEntity: Conversation, accessCode: ConversationCode): void {
    const isTeamConversation = conversationEntity && conversationEntity.team_id;

    if (accessCode.uri && isTeamConversation) {
      const accessCodeUrl = `${window.wire.env.APP_BASE}/join/?key=${accessCode.key}&code=${accessCode.code}`;
      conversationEntity.accessCode(accessCodeUrl);
    }
  }

  mapAccessState(
    conversationEntity: Conversation,
    accessModes: CONVERSATION_ACCESS[],
    accessRole: CONVERSATION_ACCESS_ROLE,
  ): typeof ACCESS_STATE {
    if (conversationEntity.team_id) {
      if (conversationEntity.is1to1()) {
        return conversationEntity.accessState(ACCESS_STATE.TEAM.ONE2ONE);
      }

      const isTeamRole = accessRole === CONVERSATION_ACCESS_ROLE.TEAM;

      const includesInviteMode = accessModes.includes(CONVERSATION_ACCESS.INVITE);
      const isInviteModeOnly = includesInviteMode && accessModes.length === 1;

      const isTeamOnlyMode = isTeamRole && isInviteModeOnly;
      if (isTeamOnlyMode) {
        return conversationEntity.accessState(ACCESS_STATE.TEAM.TEAM_ONLY);
      }

      const isNonVerifiedRole = accessRole === CONVERSATION_ACCESS_ROLE.NON_ACTIVATED;

      const includesCodeMode = accessModes.includes(CONVERSATION_ACCESS.CODE);
      const isExpectedModes = includesCodeMode && includesInviteMode && accessModes.length === 2;

      const isGuestRoomMode = isNonVerifiedRole && isExpectedModes;
      return isGuestRoomMode
        ? conversationEntity.accessState(ACCESS_STATE.TEAM.GUEST_ROOM)
        : conversationEntity.accessState(ACCESS_STATE.TEAM.LEGACY);
    }

    if (conversationEntity.isSelf()) {
      return conversationEntity.accessState(ACCESS_STATE.SELF);
    }

    const personalAccessState = conversationEntity.isGroup()
      ? ACCESS_STATE.PERSONAL.GROUP
      : ACCESS_STATE.PERSONAL.ONE2ONE;
    return conversationEntity.accessState(personalAccessState);
  }
}
