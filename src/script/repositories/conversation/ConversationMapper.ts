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

import {
  CONVERSATION_ACCESS_ROLE,
  Conversation as ConversationBackendData,
  ConversationCode,
  CONVERSATION_ACCESS,
  CONVERSATION_LEGACY_ACCESS_ROLE,
  CONVERSATION_TYPE,
  DefaultConversationRoleName,
  RemoteConversations,
  GROUP_CONVERSATION_TYPE,
  ADD_PERMISSION,
  CONVERSATION_CELLS_STATE,
} from '@wireapp/api-client/lib/conversation';
import {QualifiedId} from '@wireapp/api-client/lib/user';
import ko from 'knockout';
import {isObject} from 'underscore';

import {LegalHoldStatus} from '@wireapp/protocol-messaging';

import {Conversation} from 'Repositories/entity/Conversation';
import {ConversationRecord} from 'Repositories/storage/record/ConversationRecord';

import {ACCESS_STATE} from './AccessState';
import {ConversationStatus} from './ConversationStatus';
import {ConversationVerificationState} from './ConversationVerificationState';
import {NOTIFICATION_STATE} from './NotificationSetting';

import {BaseError, BASE_ERROR_TYPE} from '../../error/BaseError';
import {ConversationError} from '../../error/ConversationError';

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
  verification_state: ConversationVerificationState;
  mlsVerificationState: ConversationVerificationState;
}

type Roles = {[userId: string]: DefaultConversationRoleName | string};
export type ConversationDatabaseData = ConversationRecord &
  Partial<ConversationBackendData> & {
    accessModes?: CONVERSATION_ACCESS[];
    //CONVERSATION_LEGACY_ACCESS_ROLE for api <= v2, CONVERSATION_ACCESS_ROLE[] since api v3
    accessRole?: CONVERSATION_LEGACY_ACCESS_ROLE | CONVERSATION_ACCESS_ROLE[];
    accessRoleV2?: CONVERSATION_ACCESS_ROLE[];
    roles: Roles;
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
      mlsVerificationState,
    } = selfState;

    if (archived_timestamp) {
      conversationEntity.setTimestamp(archived_timestamp, Conversation.TIMESTAMP_TYPE.ARCHIVED);
      conversationEntity.archivedState(selfState.archived_state ?? false);
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

    if (mlsVerificationState !== undefined) {
      conversationEntity.mlsVerificationState(mlsVerificationState);
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

  private static computeRoles(conversationData: ConversationBackendData | ConversationDatabaseData): Roles {
    if ('roles' in conversationData && conversationData.roles) {
      return conversationData.roles;
    }
    const {members} = conversationData;

    const allMembers = [...(members?.others ?? []), members?.self];
    return allMembers.reduce<Record<string, string>>((roles, member) => {
      if (!member || !member.conversation_role) {
        return roles;
      }
      return {
        ...roles,
        [member.id]: member.conversation_role,
      };
    }, {});
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

    // Ensure that conversationData has a qualified_id or id
    if (!conversationData.qualified_id && !conversationData.id) {
      throw new ConversationError(BASE_ERROR_TYPE.MISSING_PARAMETER, BaseError.MESSAGE.MISSING_QUALIFIED_ID);
    }

    // since api V10 /get or /post conversation does not return id in conversation data
    const conversationIdFromQualifiedId = conversationData?.qualified_id?.id;
    if (conversationIdFromQualifiedId) {
      conversationData.id = conversationIdFromQualifiedId;
    }

    const {
      creator,
      id,
      members,
      name,
      others,
      qualified_others,
      type,
      group_id,
      epoch,
      protocol,
      cipher_suite,
      initial_protocol,
      group_conv_type,
      add_permission,
      cells_state,
    } = conversationData;

    let conversationEntity = new Conversation(
      id,
      conversationData.domain || conversationData.qualified_id?.domain,
      protocol,
    );
    conversationEntity.roles(this.computeRoles(conversationData));

    conversationEntity.creator = creator;
    conversationEntity.groupId = group_id;
    conversationEntity.initialProtocol = initial_protocol || protocol;
    conversationEntity.epoch = epoch ?? -1;
    conversationEntity.cipherSuite = cipher_suite;
    conversationEntity.type(type);
    conversationEntity.name(name || '');
    conversationEntity.groupConversationType(group_conv_type || GROUP_CONVERSATION_TYPE.GROUP_CONVERSATION);
    conversationEntity.conversationModerator(add_permission || ADD_PERMISSION.ADMINS);
    conversationEntity.cellsState(cells_state || CONVERSATION_CELLS_STATE.DISABLED);
    const selfState = members?.self || conversationData;
    conversationEntity = ConversationMapper.updateSelfStatus(conversationEntity, selfState as any);

    if (!conversationEntity.last_event_timestamp() && initialTimestamp) {
      conversationEntity.last_event_timestamp(initialTimestamp);
      conversationEntity.last_server_timestamp(initialTimestamp);
    }

    if (conversationEntity.mutedState() === null) {
      conversationEntity.mutedState(NOTIFICATION_STATE.EVERYTHING);
    }

    // Active participants from database or backend payload
    let participatingUserIds: QualifiedId[] = [];

    if (qualified_others) {
      participatingUserIds = qualified_others;
    }

    if (!qualified_others && members?.others?.length) {
      participatingUserIds = members.others.map(other => ({
        domain: other.qualified_id?.domain ?? '',
        id: other.id,
      }));
    }

    if (!qualified_others && !members?.others?.length && others) {
      participatingUserIds = others.map(userId => ({
        domain: '',
        id: userId,
      }));
    }

    conversationEntity.participating_user_ids(participatingUserIds);

    // Team ID from database or backend payload
    const teamId = conversationData.team_id || conversationData.team;
    if (teamId) {
      conversationEntity.teamId = teamId;
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

  /**
   * Will merge the locally stored conversations with the new conversations fetched from the backend.
   * @param localConversations locally stored conversations
   * @param remoteConversations new conversations fetched from backend
   * @returns the new conversations from backend merged with the locally stored conversations
   */
  static mergeConversations(
    localConversations: ConversationDatabaseData[],
    remoteConversations: RemoteConversations,
  ): ConversationDatabaseData[] {
    const foundRemoteConversations = remoteConversations.found;

    if (!foundRemoteConversations) {
      return localConversations;
    }

    const conversationsMap = new Map<string, ConversationDatabaseData>();

    for (const localConversation of localConversations) {
      const conversationId = localConversation.qualified_id?.id || localConversation.id;
      conversationsMap.set(conversationId, localConversation);
    }

    for (let i = 0; i < foundRemoteConversations.length; i++) {
      const remoteConversation = foundRemoteConversations[i];
      const conversationId = remoteConversation.qualified_id?.id || remoteConversation.id;
      const localConversation = conversationsMap.get(conversationId);

      if (localConversation) {
        conversationsMap.set(conversationId, this.mergeSingleConversation(localConversation, remoteConversation, i));
        continue;
      }

      const localConversationData = (remoteConversation.qualified_id || {
        id: conversationId,
        domain: '',
      }) as ConversationDatabaseData;

      conversationsMap.set(conversationId, this.mergeSingleConversation(localConversationData, remoteConversation, i));
    }

    return Array.from(conversationsMap.values());
  }

  /**
   * Merge a remote conversation payload with a locally stored conversation
   *
   * @param localConversationData Local conversation data from the store
   * @param remoteConversationData Remote conversation data from backend
   * @param lastEventTimestampFallback Fallback timestamp to use if no last event timestamp is available
   * @returns Merged conversation data in the format of the local store
   */
  static mergeSingleConversation(
    localConversationData: ConversationDatabaseData,
    remoteConversationData: ConversationBackendData,
    lastEventTimestampFallback?: number,
  ): ConversationDatabaseData {
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
      group_id,
      epoch,
      cipher_suite,
      protocol,
      group_conv_type,
      add_permission,
      cells_state,
    } = remoteConversationData;
    const {others: othersStates, self: selfState} = members;

    const updates: Partial<ConversationDatabaseData> = {
      accessModes: access,
      accessRole: access_role,
      accessRoleV2: access_role_v2,
      cipher_suite,
      creator,
      domain: qualified_id?.domain,
      group_id,
      message_timer,
      name,
      protocol,
      receipt_mode,
      roles: {},
      status: (selfState as any).status,
      team_id: team,
      type,
      group_conv_type,
      add_permission,
      cells_state,
    };

    const qualified_others = othersStates?.filter(other => !!other.qualified_id).map(({qualified_id}) => qualified_id);

    if (qualified_others.length) {
      updates.qualified_others = qualified_others;
    }

    if (typeof epoch === 'number') {
      updates.epoch = epoch;
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

    const mergedConversation: ConversationDatabaseData = {...localConversationData, ...updates};

    const isGroup = type === CONVERSATION_TYPE.REGULAR;
    const noOthers = !mergedConversation.others || !mergedConversation.others.length;
    if (isGroup || noOthers) {
      mergedConversation.others = othersStates
        .filter(otherState => (otherState.status as number) === (ConversationStatus.CURRENT_MEMBER as number))
        .map(otherState => otherState.id);
    }

    // This should ensure a proper order
    if (!mergedConversation.last_event_timestamp && lastEventTimestampFallback !== undefined) {
      mergedConversation.last_event_timestamp = lastEventTimestampFallback + 1;
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
  }

  static mapAccessCode(conversation: Conversation, accessCode: ConversationCode): void {
    const isTeamConversation = conversation && conversation.teamId;

    if (accessCode.uri && isTeamConversation) {
      const baseUrl = `${window.wire.env.URL.ACCOUNT_BASE}/conversation-join/?key=${accessCode.key}&code=${accessCode.code}`;
      const accessCodeUrl = conversation.domain ? `${baseUrl}&domain=${conversation.domain}` : baseUrl;
      conversation.accessCode(accessCodeUrl);
      conversation.accessCodeHasPassword(accessCode.has_password);
    }
  }

  static mapAccessState(
    conversationEntity: Conversation,
    accessModes: CONVERSATION_ACCESS[],
    accessRole: CONVERSATION_LEGACY_ACCESS_ROLE | CONVERSATION_ACCESS_ROLE[],
    accessRoleV2?: CONVERSATION_ACCESS_ROLE[],
  ): typeof ACCESS_STATE {
    if (conversationEntity.teamId) {
      if (conversationEntity.is1to1()) {
        return conversationEntity.accessState(ACCESS_STATE.TEAM.ONE2ONE);
      }

      let accessState: ACCESS_STATE | undefined;

      //api <= v2/v3
      //this is important to check this one first (backwards compatibility)
      if (Array.isArray(accessRoleV2)) {
        accessState = this.mapAccessStateV2(accessRoleV2);

        //api v3
      } else if (Array.isArray(accessRole)) {
        accessState = this.mapAccessStateV2(accessRole);
      }

      if (accessState) {
        return conversationEntity.accessState(accessState);
      }

      //api <= v2 legacy
      if (!Array.isArray(accessRole)) {
        return conversationEntity.accessState(this.mapLegacyAccessState(accessModes, accessRole));
      }
    }

    if (conversationEntity.isSelf()) {
      return conversationEntity.accessState(ACCESS_STATE.OTHER.SELF);
    }

    const personalAccessState = conversationEntity.isGroupOrChannel()
      ? ACCESS_STATE.PERSONAL.GROUP
      : ACCESS_STATE.PERSONAL.ONE2ONE;

    return conversationEntity.accessState(personalAccessState);
  }

  private static mapAccessStateV2(accessRole: CONVERSATION_ACCESS_ROLE[]) {
    if (!accessRole.includes(CONVERSATION_ACCESS_ROLE.TEAM_MEMBER)) {
      return undefined;
    }

    if (
      accessRole.includes(CONVERSATION_ACCESS_ROLE.GUEST) ||
      accessRole.includes(CONVERSATION_ACCESS_ROLE.NON_TEAM_MEMBER)
    ) {
      if (accessRole.includes(CONVERSATION_ACCESS_ROLE.SERVICE)) {
        return ACCESS_STATE.TEAM.GUESTS_SERVICES;
      }
      return ACCESS_STATE.TEAM.GUEST_ROOM;
    } else if (accessRole.includes(CONVERSATION_ACCESS_ROLE.SERVICE)) {
      return ACCESS_STATE.TEAM.SERVICES;
    }
    return ACCESS_STATE.TEAM.TEAM_ONLY;
  }

  private static mapLegacyAccessState(
    accessModes: CONVERSATION_ACCESS[],
    accessRole: CONVERSATION_LEGACY_ACCESS_ROLE,
  ): ACCESS_STATE {
    const isTeamRole = accessRole === CONVERSATION_LEGACY_ACCESS_ROLE.TEAM;

    const includesInviteMode = accessModes.includes(CONVERSATION_ACCESS.INVITE);
    const isInviteModeOnly = includesInviteMode && accessModes.length === 1;

    const isTeamOnlyMode = isTeamRole && isInviteModeOnly;
    if (isTeamOnlyMode) {
      return ACCESS_STATE.TEAM.TEAM_ONLY;
    }

    const isActivatedRole = accessRole === CONVERSATION_LEGACY_ACCESS_ROLE.ACTIVATED;
    if (isActivatedRole) {
      return ACCESS_STATE.TEAM.GUEST_ROOM;
    }
    const isNonActivatedRole = accessRole === CONVERSATION_LEGACY_ACCESS_ROLE.NON_ACTIVATED;

    const includesCodeMode = accessModes.includes(CONVERSATION_ACCESS.CODE);
    const isExpectedModes = includesCodeMode && includesInviteMode && accessModes.length === 2;

    const isGuestRoomMode = isNonActivatedRole && isExpectedModes;

    return isGuestRoomMode ? ACCESS_STATE.TEAM.GUESTS_SERVICES : ACCESS_STATE.TEAM.LEGACY;
  }
}
