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
  Conversation as ConversationBackendData,
  ConversationCode,
  DefaultConversationRoleName,
  CONVERSATION_ACCESS,
  CONVERSATION_ACCESS_ROLE,
  ACCESS_ROLE_V2,
  CONVERSATION_TYPE,
} from '@wireapp/api-client/src/conversation';

import {ACCESS_STATE} from './AccessState';
import {ConversationStatus} from './ConversationStatus';
import {Conversation} from '../entity/Conversation';
import {BASE_ERROR_TYPE, BaseError} from '../error/BaseError';
import {ConversationError} from '../error/ConversationError';
import {ConversationRecord} from '../storage/record/ConversationRecord';
import {matchQualifiedIds, QualifiedEntity} from 'Util/QualifiedId';

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

export type ConversationDatabaseData = ConversationRecord &
  Partial<ConversationBackendData> & {
    accessModes?: CONVERSATION_ACCESS[];
    accessRole?: CONVERSATION_ACCESS_ROLE;
    accessRoleV2?: ACCESS_ROLE_V2[];
    roles: {[userId: string]: DefaultConversationRoleName | string};
    status: ConversationStatus;
    team_id: string;
  };

export class ConversationMapper {
  static mapConversations(conversationsData: ConversationDatabaseData[], timestamp: number = 1): Conversation[] {
    if (conversationsData === undefined) {
      throw new ConversationError(BASE_ERROR_TYPE.MISSING_PARAMETER, BaseError.MESSAGE.MISSING_PARAMETER);
    }
    if (!Array.isArray(conversationsData) || !conversationsData.length) {
      throw new ConversationError(BASE_ERROR_TYPE.INVALID_PARAMETER, BaseError.MESSAGE.INVALID_PARAMETER);
    }
    return conversationsData.map((conversationData: ConversationDatabaseData, index: number) => {
      return ConversationMapper.createConversationEntity(conversationData, timestamp + index);
    });
  }

  static updateProperties(
    conversationEntity: Conversation,
    conversationData: Partial<Record<keyof Conversation, any>>,
  ): Conversation {
    Object.entries(conversationData).forEach(([key, value]: [keyof Conversation, string]) => {
      if (key !== 'id') {
        if (value !== undefined && conversationEntity.hasOwnProperty(key)) {
          if (ko.isObservable(conversationEntity[key])) {
            (conversationEntity[key] as ko.Observable)(value);
          } else {
            (conversationEntity[key] as any) = value;
          }
        }
      }
    });

    return conversationEntity;
  }

  static updateSelfStatus(
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
    const {otr_archived, otr_muted_status: mutedState} = selfState;

    if (otr_archived !== undefined) {
      const archivedTimestamp = new Date(selfState.otr_archived_ref).getTime();
      conversationEntity.setTimestamp(archivedTimestamp, Conversation.TIMESTAMP_TYPE.ARCHIVED);
      conversationEntity.archivedState(otr_archived);
    }

    if (mutedState !== undefined) {
      const mutedTimestamp = new Date(selfState.otr_muted_ref).getTime();
      conversationEntity.setTimestamp(mutedTimestamp, Conversation.TIMESTAMP_TYPE.MUTED);
      conversationEntity.mutedState(mutedState);
    }

    if (disablePersistence) {
      conversationEntity.setStateChangePersistence(true);
    }

    return conversationEntity;
  }

  private static createConversationEntity(
    conversationData: ConversationDatabaseData,
    initialTimestamp?: number,
  ): Conversation {
    if (conversationData === undefined) {
      throw new ConversationError(BASE_ERROR_TYPE.MISSING_PARAMETER, BaseError.MESSAGE.MISSING_PARAMETER);
    }
    if (!isObject(conversationData) || !Object.keys(conversationData).length) {
      throw new ConversationError(BASE_ERROR_TYPE.INVALID_PARAMETER, BaseError.MESSAGE.INVALID_PARAMETER);
    }

    const {creator, id, members, name, others, qualified_others, type} = conversationData;
    let conversationEntity = new Conversation(id, conversationData.domain || conversationData.qualified_id?.domain);
    conversationEntity.roles(conversationData.roles || {});

    conversationEntity.creator = creator;
    conversationEntity.type(type);
    conversationEntity.name(name || '');

    const selfState = members?.self || conversationData;
    conversationEntity = ConversationMapper.updateSelfStatus(conversationEntity, selfState as any);

    if (!conversationEntity.last_event_timestamp() && initialTimestamp) {
      conversationEntity.last_event_timestamp(initialTimestamp);
      conversationEntity.last_server_timestamp(initialTimestamp);
    }

    // Active participants from database or backend payload
    const participatingUserIds =
      qualified_others ||
      (members?.others
        ? members.others.map(other => ({domain: other.qualified_id?.domain || '', id: other.id}))
        : others.map(userId => ({domain: '', id: userId})));

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
    const accessRoleV2 = conversationData.accessRoleV2 || conversationData.access_role_v2;
    if (accessModes && (accessRole || accessRoleV2)) {
      conversationEntity.accessModes = accessModes;
      conversationEntity.accessRole = accessRoleV2 || accessRole;
      ConversationMapper.mapAccessState(conversationEntity, accessModes, accessRole, accessRoleV2);
    }

    conversationEntity.receiptMode(conversationData.receipt_mode);

    return conversationEntity;
  }

  static mergeConversation(
    localConversations: ConversationDatabaseData[],
    remoteConversations: ConversationBackendData[],
  ): ConversationDatabaseData[] {
    localConversations = localConversations.filter(conversationData => conversationData);

    return remoteConversations.map(
      (remoteConversationData: ConversationBackendData & {receipt_mode: number}, index: number) => {
        const remoteConversationId: QualifiedEntity = remoteConversationData.qualified_id || {
          domain: '',
          id: remoteConversationData.id,
        };
        const localConversationData =
          localConversations.find(conversationId => matchQualifiedIds(conversationId, remoteConversationId)) ||
          (remoteConversationId as ConversationDatabaseData);

        const {
          access,
          access_role,
          access_role_v2,
          creator,
          members,
          message_timer,
          qualified_id,
          receipt_mode,
          name,
          team,
          type,
        } = remoteConversationData;
        const {others: othersStates, self: selfState} = members;

        const updates: Partial<ConversationDatabaseData> = {
          accessModes: access,
          accessRole: access_role,
          accessRoleV2: access_role_v2,
          creator,
          domain: qualified_id?.domain,
          message_timer,
          name,
          receipt_mode,
          roles: {},
          status: (selfState as any).status,
          team_id: team,
          type,
        };

        const qualified_others = othersStates
          ?.filter(other => !!other.qualified_id)
          .map(({qualified_id}) => qualified_id);

        if (qualified_others.length) {
          updates.qualified_others = qualified_others;
        }

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
          const remoteMutedState = selfState.otr_muted_status;
          mergedConversation.muted_state = remoteMutedState;
          mergedConversation.muted_timestamp = remoteMutedTimestamp;
        }

        return mergedConversation;
      },
    );
  }

  static mapAccessCode(conversation: Conversation, accessCode: ConversationCode): void {
    const isTeamConversation = conversation && conversation.team_id;

    if (accessCode.uri && isTeamConversation) {
      const baseUrl = `${window.wire.env.URL.ACCOUNT_BASE}/conversation-join/?key=${accessCode.key}&code=${accessCode.code}`;
      const accessCodeUrl = conversation.domain ? `${baseUrl}&domain=${conversation.domain}` : baseUrl;
      conversation.accessCode(accessCodeUrl);
    }
  }

  static mapAccessState(
    conversationEntity: Conversation,
    accessModes: CONVERSATION_ACCESS[],
    accessRole?: CONVERSATION_ACCESS_ROLE,
    accessRoleV2: ACCESS_ROLE_V2[] = [],
  ): typeof ACCESS_STATE {
    if (conversationEntity.team_id) {
      if (conversationEntity.is1to1()) {
        return conversationEntity.accessState(ACCESS_STATE.TEAM.ONE2ONE);
      }

      if (accessRoleV2.includes(ACCESS_ROLE_V2.TEAM_MEMBER)) {
        if (accessRoleV2.includes(ACCESS_ROLE_V2.GUEST) || accessRoleV2.includes(ACCESS_ROLE_V2.NON_TEAM_MEMBER)) {
          if (accessRoleV2.includes(ACCESS_ROLE_V2.SERVICE)) {
            return conversationEntity.accessState(ACCESS_STATE.TEAM.GUESTS_SERVICES);
          }
          return conversationEntity.accessState(ACCESS_STATE.TEAM.GUEST_ROOM);
        } else if (accessRoleV2.includes(ACCESS_ROLE_V2.SERVICE)) {
          return conversationEntity.accessState(ACCESS_STATE.TEAM.SERVICES);
        }
        return conversationEntity.accessState(ACCESS_STATE.TEAM.TEAM_ONLY);
      }

      const isTeamRole = accessRole === CONVERSATION_ACCESS_ROLE.TEAM;

      const includesInviteMode = accessModes.includes(CONVERSATION_ACCESS.INVITE);
      const isInviteModeOnly = includesInviteMode && accessModes.length === 1;

      const isTeamOnlyMode = isTeamRole && isInviteModeOnly;
      if (isTeamOnlyMode) {
        return conversationEntity.accessState(ACCESS_STATE.TEAM.TEAM_ONLY);
      }

      const isVerifiedRole = accessRole === CONVERSATION_ACCESS_ROLE.ACTIVATED;
      if (isVerifiedRole) {
        return conversationEntity.accessState(ACCESS_STATE.TEAM.GUEST_ROOM);
      }
      const isNonVerifiedRole = accessRole === CONVERSATION_ACCESS_ROLE.NON_ACTIVATED;

      const includesCodeMode = accessModes.includes(CONVERSATION_ACCESS.CODE);
      const isExpectedModes = includesCodeMode && includesInviteMode && accessModes.length === 2;

      const isGuestRoomMode = isNonVerifiedRole && isExpectedModes;
      return isGuestRoomMode
        ? conversationEntity.accessState(ACCESS_STATE.TEAM.GUESTS_SERVICES)
        : conversationEntity.accessState(ACCESS_STATE.TEAM.LEGACY);
    }

    if (conversationEntity.isSelf()) {
      return conversationEntity.accessState(ACCESS_STATE.OTHER.SELF);
    }

    const personalAccessState = conversationEntity.isGroup()
      ? ACCESS_STATE.PERSONAL.GROUP
      : ACCESS_STATE.PERSONAL.ONE2ONE;
    return conversationEntity.accessState(personalAccessState);
  }
}
