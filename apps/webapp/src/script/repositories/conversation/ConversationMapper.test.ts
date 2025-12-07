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
  CONVERSATION_ACCESS,
  CONVERSATION_LEGACY_ACCESS_ROLE,
  CONVERSATION_TYPE,
  Member as MemberBackendData,
  OtherMember as OtherMemberBackendData,
  DefaultConversationRoleName,
  RemoteConversations,
} from '@wireapp/api-client/lib/conversation/';
import {RECEIPT_MODE} from '@wireapp/api-client/lib/conversation/data';
import type {QualifiedId} from '@wireapp/api-client/lib/user/';
import ko from 'knockout';
import {Conversation} from 'Repositories/entity/Conversation';
import {BaseError} from 'src/script/error/BaseError';
import {createUuid} from 'Util/uuid';

import {ACCESS_STATE} from './AccessState';
import {ConversationDatabaseData, ConversationMapper, SelfStatusUpdateDatabaseData} from './ConversationMapper';
import {ConversationStatus} from './ConversationStatus';
import {ConversationVerificationState} from './ConversationVerificationState';
import {NOTIFICATION_STATE} from './NotificationSetting';

import {entities, payload} from '../../../../test/api/payloads';

describe('ConversationMapper', () => {
  describe('mapConversations', () => {
    it('throws an error for unexpected parameters', () => {
      //@ts-expect-error
      const functionCallUndefinedParam = () => ConversationMapper.mapConversations();

      expect(functionCallUndefinedParam).toThrow(BaseError.MESSAGE.MISSING_PARAMETER);

      const functionCallEmtpyArray = () => ConversationMapper.mapConversations([]);

      expect(functionCallEmtpyArray).toThrow(BaseError.MESSAGE.INVALID_PARAMETER);

      //@ts-expect-error
      const functionCallWrongType = () => ConversationMapper.mapConversations('Conversation');

      expect(functionCallWrongType).toThrow(BaseError.MESSAGE.INVALID_PARAMETER);

      const functionCallUndefinedInArray = () => ConversationMapper.mapConversations([undefined]);

      expect(functionCallUndefinedInArray).toThrow(BaseError.MESSAGE.MISSING_PARAMETER);

      //@ts-expect-error
      const functionCallStringInArray = () => ConversationMapper.mapConversations(['Conversation']);

      expect(functionCallStringInArray).toThrow(BaseError.MESSAGE.INVALID_PARAMETER);
    });

    it('maps a single conversation', () => {
      const conversation = entities.conversation;
      const initialTimestamp = Date.now();
      const [conversationEntity] = ConversationMapper.mapConversations([conversation], initialTimestamp);

      const expectedParticipantIds: QualifiedId[] = [
        conversation.members.others[0].id,
        conversation.members.others[1].id,
        conversation.members.others[2].id,
        conversation.members.others[3].id,
      ].map(id => ({domain: '', id}));

      expect(conversationEntity.participating_user_ids()).toEqual(expectedParticipantIds);
      expect(conversationEntity.id).toBe(conversation.id);
      expect(conversationEntity.getNumberOfParticipants()).toBe(conversation.members.others.length + 1);
      expect(conversationEntity.isGroup()).toBeTruthy();
      expect(conversationEntity.name()).toBe(conversation.name);
      expect(conversationEntity.mutedState()).toBe(0);
      expect(conversationEntity.teamId).toEqual(conversation.team);
      expect(conversationEntity.type()).toBe(CONVERSATION_TYPE.REGULAR);

      const expectedMutedTimestamp = new Date(conversation.members.self.otr_muted_ref).getTime();

      expect(conversationEntity['mutedTimestamp']()).toEqual(expectedMutedTimestamp);
      expect(conversationEntity.last_event_timestamp()).toBe(initialTimestamp);
      expect(conversationEntity.last_server_timestamp()).toBe(initialTimestamp);
    });

    it('maps a backend conversation roles', () => {
      const conversation = {
        ...entities.conversation,
        roles: undefined,
        members: {
          self: {...entities.conversation.members.self, conversation_role: 'wire_admin'},
          others: [
            {
              id: '1',
              conversation_role: DefaultConversationRoleName.WIRE_ADMIN,
            },
            {
              id: '2',
              conversation_role: DefaultConversationRoleName.WIRE_MEMBER,
            },
          ],
        },
      };

      const initialTimestamp = Date.now();
      const [conversationEntity] = ConversationMapper.mapConversations([conversation], initialTimestamp);

      expect(conversationEntity.roles()).toEqual({
        [conversation.members.self.id]: DefaultConversationRoleName.WIRE_ADMIN,
        [conversation.members.others[0].id]: DefaultConversationRoleName.WIRE_ADMIN,
        [conversation.members.others[1].id]: DefaultConversationRoleName.WIRE_MEMBER,
      });
    });

    it('maps multiple conversations', () => {
      const conversations = payload.conversations.get.conversations;
      const conversationEntities = ConversationMapper.mapConversations(conversations);

      expect(conversationEntities.length).toBe(conversations.length);

      const [firstConversationEntity, secondConversationEntity] = conversationEntities;

      expect(firstConversationEntity.id).toBe(conversations[0].id);
      expect(firstConversationEntity.last_event_timestamp()).toBe(1);
      expect(firstConversationEntity.last_server_timestamp()).toBe(1);
      expect(firstConversationEntity.name()).toBe(conversations[0].name);

      expect(secondConversationEntity.id).toBe(conversations[1].id);
      expect(secondConversationEntity.last_event_timestamp()).toBe(2);
      expect(secondConversationEntity.last_server_timestamp()).toBe(2);
      expect(secondConversationEntity.name()).toBe(conversations[1].name);
    });

    it('maps a team conversation', () => {
      const payload: Partial<ConversationDatabaseData> = {
        access: [CONVERSATION_ACCESS.INVITE],
        creator: 'f52eed1b-aa64-447f-ad4a-96529f72105f',
        id: 'f2520615-f860-4c72-8b90-9ace3b5f6c37',
        last_event_timestamp: new Date('1970-01-01T00:00:00.000Z').getDate(),
        members: {
          others: [{id: 'f52eed1b-aa64-447f-ad4a-96529f72105f', status: 0}],
          self: {
            hidden: false,
            hidden_ref: null,
            id: '39b7f597-dfd1-4dff-86f5-fe1b79cb70a0',
            otr_archived: false,
            otr_archived_ref: null,
            otr_muted_ref: null,
            otr_muted_status: NOTIFICATION_STATE.EVERYTHING,
            service: null,
            status_ref: '0.0',
            status_time: '1970-01-01T00:00:00.000Z',
          },
        },
        name: 'BennyTest',
        team: '5316fe03-24ee-4b19-b789-6d026bd3ce5f',
        type: 0,
      };

      const [conversationEntity] = ConversationMapper.mapConversations([payload] as ConversationDatabaseData[]);

      expect(conversationEntity.name()).toBe(payload.name);
      expect(conversationEntity.teamId).toBe(payload.team);
    });
  });

  describe('updateProperties', () => {
    it('can update the properties of a conversation', () => {
      const creatorId = createUuid();
      const conversationsData = [payload.conversations.get.conversations[0]];
      const [conversationEntity] = ConversationMapper.mapConversations(conversationsData);
      const data: Partial<Record<keyof Conversation, string>> = {
        creator: creatorId,
        id: 'd5a39ffb-6ce3-4cc8-9048-0123456789abc',
        name: 'New foo bar conversation name',
      };
      const updatedConversationEntity = ConversationMapper.updateProperties(conversationEntity, data);

      expect(updatedConversationEntity.name()).toBe(data.name);
      expect(updatedConversationEntity.id).not.toBe(data.id);
      expect(updatedConversationEntity.creator).toBe(data.creator);
    });

    it('only updates existing properties', () => {
      const updatedName = 'Christmas 2017';
      const conversationEntity = new Conversation(createUuid());
      conversationEntity.name('Christmas 2016');

      expect(conversationEntity.name()).toBeDefined();

      const updates: Partial<Record<keyof Conversation, string>> = {
        name: updatedName,
        //@ts-expect-error
        newProperty: 'abc',
      };
      ConversationMapper.updateProperties(conversationEntity, updates);

      expect(conversationEntity.name()).toBe(updatedName);
      //@ts-expect-error
      expect(conversationEntity.newProperty).toBeUndefined();
    });
  });

  describe('updateSelfStatus', () => {
    let conversationEntity: Conversation = undefined;

    beforeEach(() => {
      const conversationsData = [payload.conversations.get.conversations[0]];
      [conversationEntity] = ConversationMapper.mapConversations(conversationsData);
    });

    it('returns without updating if conversation entity does not exist', () => {
      conversationEntity = undefined;
      const selfStatus: Partial<SelfStatusUpdateDatabaseData> = {muted_state: 1};

      expect(conversationEntity).toBe(undefined);
      expect(ConversationMapper.updateSelfStatus(conversationEntity, selfStatus)).toBeFalsy();
    });

    it('can update the self status if the user leaves a conversation', () => {
      const selfStatus: Partial<SelfStatusUpdateDatabaseData> = {status: ConversationStatus.PAST_MEMBER};
      const updatedConversationEntity = ConversationMapper.updateSelfStatus(conversationEntity, selfStatus);

      expect(updatedConversationEntity.isSelfUserRemoved()).toBeTruthy();
    });

    it('can update the self status if the user joins a conversation', () => {
      const selfStatus: Partial<SelfStatusUpdateDatabaseData> = {status: ConversationStatus.CURRENT_MEMBER};
      const updatedConversationEntity = ConversationMapper.updateSelfStatus(conversationEntity, selfStatus);

      expect(updatedConversationEntity.isSelfUserRemoved()).toBeFalsy();
    });

    it('can update the self status with last event timestamp', () => {
      const timestamp = Date.now();
      const selfStatus: Partial<SelfStatusUpdateDatabaseData> = {last_event_timestamp: timestamp};
      const updatedConversationEntity = ConversationMapper.updateSelfStatus(conversationEntity, selfStatus);

      expect(updatedConversationEntity.last_event_timestamp()).toBe(timestamp);
    });

    it('can update the self status using otr_archived', () => {
      const timestamp = Date.now();
      conversationEntity.last_event_timestamp(timestamp);
      const selfStatus: Partial<SelfStatusUpdateDatabaseData> = {
        otr_archived: true,
        otr_archived_ref: new Date(timestamp).toISOString(),
      };
      const updatedConversationEntity = ConversationMapper.updateSelfStatus(conversationEntity, selfStatus);

      expect(updatedConversationEntity.archivedTimestamp()).toBe(timestamp);
      expect(updatedConversationEntity.archivedState()).toBe(true);
    });

    it('can update the self status using archived timestamp', () => {
      const timestamp = Date.now();
      const selfStatus: Partial<SelfStatusUpdateDatabaseData> = {
        archived_state: true,
        archived_timestamp: timestamp,
      };
      const updatedConversationEntity = ConversationMapper.updateSelfStatus(conversationEntity, selfStatus);

      expect(updatedConversationEntity.archivedTimestamp()).toBe(timestamp);
      expect(updatedConversationEntity.archivedState()).toBe(true);
    });

    it('can update the self when archive state is false', () => {
      const timestamp = Date.now();
      const selfStatus: Partial<SelfStatusUpdateDatabaseData> = {
        archived_state: false,
        archived_timestamp: timestamp,
      };
      const updatedConversationEntity = ConversationMapper.updateSelfStatus(conversationEntity, selfStatus);

      expect(updatedConversationEntity.archivedTimestamp()).toBe(timestamp);
      expect(updatedConversationEntity.archivedState()).toBe(false);
    });

    it('can update the self status if a conversation is cleared', () => {
      const timestamp = Date.now();
      const selfStatus: Partial<SelfStatusUpdateDatabaseData> = {
        cleared_timestamp: timestamp,
        last_event_timestamp: timestamp,
      };
      const updatedConversationEntity = ConversationMapper.updateSelfStatus(conversationEntity, selfStatus);

      expect(updatedConversationEntity.last_event_timestamp()).toBe(timestamp);
      expect(updatedConversationEntity.cleared_timestamp()).toBe(timestamp);
    });

    it('can update the self status if a conversation is read', () => {
      const timestamp = Date.now();
      const selfStatus: Partial<SelfStatusUpdateDatabaseData> = {last_read_timestamp: timestamp};
      const updatedConversationEntity = ConversationMapper.updateSelfStatus(conversationEntity, selfStatus);

      expect(updatedConversationEntity.last_read_timestamp()).toBe(timestamp);
    });

    it('can update the self status if a conversation is muted', () => {
      const timestamp = Date.now();
      conversationEntity.last_event_timestamp(timestamp);

      const selfStatus: Partial<SelfStatusUpdateDatabaseData> = {
        otr_muted_ref: new Date(timestamp).toISOString(),
        otr_muted_status: NOTIFICATION_STATE.NOTHING,
      };
      const updatedConversationEntity = ConversationMapper.updateSelfStatus(conversationEntity, selfStatus);

      expect(updatedConversationEntity.last_event_timestamp()).toBe(timestamp);
      expect(updatedConversationEntity['mutedTimestamp']()).toBe(timestamp);
      expect(updatedConversationEntity.notificationState()).toBe(NOTIFICATION_STATE.NOTHING);
    });

    it('accepts string values which must be parsed later on', () => {
      conversationEntity.last_read_timestamp(0);
      const lastReadTimestamp = 1480339377099;
      const selfStatus: Partial<SelfStatusUpdateDatabaseData> = {last_read_timestamp: lastReadTimestamp};
      const updatedConversationEntity = ConversationMapper.updateSelfStatus(conversationEntity, selfStatus);
      expect(updatedConversationEntity.last_read_timestamp()).toBe(lastReadTimestamp);
    });
  });

  describe('mergeConversations', () => {
    function getDataWithReadReceiptMode(
      localReceiptMode: RECEIPT_MODE,
      remoteReceiptMode: RECEIPT_MODE,
    ): Partial<ConversationDatabaseData>[] {
      const conversationCreatorId = createUuid();
      const conversationId = createUuid();
      const conversationName = 'Hello, World!';
      const selfUserId = createUuid();
      const teamId = createUuid();

      const localData: Partial<ConversationDatabaseData> = {
        archived_state: false,
        archived_timestamp: 0,
        cleared_timestamp: 0,
        ephemeral_timer: null,
        global_message_timer: null,
        id: conversationId,
        domain: 'wire.com',
        is_guest: false,
        last_event_timestamp: 1545058511982,
        last_read_timestamp: 1545058511982,
        last_server_timestamp: 1545058511982,
        muted_state: 0,
        muted_timestamp: 0,
        name: conversationName,
        others: [conversationCreatorId],
        receipt_mode: localReceiptMode,
        status: 0,
        team_id: teamId,
        type: 0,
        verification_state: ConversationVerificationState.UNVERIFIED,
      };

      const remoteData: Partial<ConversationDatabaseData> = {
        access: [CONVERSATION_ACCESS.INVITE, CONVERSATION_ACCESS.CODE],
        access_role: CONVERSATION_LEGACY_ACCESS_ROLE.NON_ACTIVATED,
        creator: conversationCreatorId,
        qualified_id: {domain: 'wire.com', id: conversationId},
        last_event_timestamp: new Date('1970-01-01T00:00:00.000Z').getTime(),
        members: {
          others: [
            {
              id: conversationCreatorId,
              status: 0,
            },
          ],
          self: {
            hidden: false,
            hidden_ref: null,
            id: selfUserId,
            otr_archived: false,
            otr_archived_ref: null,
            otr_muted_ref: null,
            otr_muted_status: NOTIFICATION_STATE.EVERYTHING,
            service: null,
            status_ref: '0.0',
            status_time: '1970-01-01T00:00:00.000Z',
          },
        },
        message_timer: null,
        name: conversationName,
        receipt_mode: remoteReceiptMode,
        team: teamId,
        type: 0,
      };

      return [localData, remoteData];
    }

    const remoteData: Partial<ConversationBackendData> = {
      access: [CONVERSATION_ACCESS.PRIVATE],
      creator: '532af01e-1e24-4366-aacf-33b67d4ee376',
      qualified_id: {domain: 'wire.com', id: 'de7466b0-985c-4dc3-ad57-17877db45b4c'},
      members: {
        others: [{id: '532af01e-1e24-4366-aacf-33b67d4ee376', status: 0}],
        self: {
          hidden: false,
          hidden_ref: null,
          id: '8b497692-7a38-4a5d-8287-e3d1006577d6',
          otr_archived: false,
          otr_archived_ref: '2017-02-16T10:06:41.118Z',
          otr_muted_ref: null,
          otr_muted_status: NOTIFICATION_STATE.EVERYTHING,
          service: null,
          status_ref: '0.0',
          status_time: '2015-01-07T16:26:51.363Z',
        },
      },
      name: 'Family Gathering',
      team: '5316fe03-24ee-4b19-b789-6d026bd3ce5f',
      type: 2,
    };

    it('incorporates remote data from backend into local data', () => {
      const local_data: Partial<ConversationDatabaseData> = {
        archived_state: false,
        archived_timestamp: 1487239601118,
        cleared_timestamp: 0,
        ephemeral_timer: 0,
        id: 'de7466b0-985c-4dc3-ad57-17877db45b4c',
        domain: 'wire.com',
        last_event_timestamp: 1488387380633,
        last_read_timestamp: 1488387380633,
        muted_state: NOTIFICATION_STATE.EVERYTHING,
        muted_timestamp: 0,
        verification_state: ConversationVerificationState.UNVERIFIED,
      };

      const [mergedConversation] = ConversationMapper.mergeConversations(
        [local_data] as ConversationDatabaseData[],
        {found: [remoteData]} as RemoteConversations,
      );

      expect(mergedConversation.creator).toBe(remoteData.creator);
      expect(mergedConversation.name).toBe(remoteData.name);
      expect(mergedConversation.others[0]).toBe(remoteData.members?.others[0].id);
      expect(mergedConversation.team_id).toBe(remoteData.team);
      expect(mergedConversation.type).toBe(remoteData.type);

      expect(mergedConversation.archived_state).toBe(local_data.archived_state);
      expect(mergedConversation.archived_timestamp).toBe(local_data.archived_timestamp);
      expect(mergedConversation.cleared_timestamp).toBe(local_data.cleared_timestamp);
      expect(mergedConversation.ephemeral_timer).toBe(local_data.ephemeral_timer);
      expect(mergedConversation.id).toBe(local_data.id);
      expect(mergedConversation.last_event_timestamp).toBe(local_data.last_event_timestamp);
      expect(mergedConversation.last_read_timestamp).toBe(local_data.last_read_timestamp);
      expect(mergedConversation.muted_state).toBe(local_data.muted_state);
      expect(mergedConversation.muted_timestamp).toBe(local_data.muted_timestamp);
      expect(mergedConversation.verification_state).toBe(local_data.verification_state);
    });

    it('should set timestamps on local data if not present', () => {
      const localData: Partial<ConversationDatabaseData> = {
        cleared_timestamp: 0,
        ephemeral_timer: 0,
        id: 'de7466b0-985c-4dc3-ad57-17877db45b4c',
        last_event_timestamp: 1488387380633,
        last_read_timestamp: 1488387380633,
        verification_state: ConversationVerificationState.UNVERIFIED,
      };

      const remoteData2: ConversationBackendData = JSON.parse(JSON.stringify(remoteData));
      remoteData2.qualified_id = {domain: 'wire.com', id: createUuid()};

      const [merged_conversation, merged_conversation_2] = ConversationMapper.mergeConversations(
        [localData] as ConversationDatabaseData[],
        {found: [remoteData, remoteData2]} as RemoteConversations,
      );

      expect(merged_conversation.creator).toBe(remoteData.creator);
      expect(merged_conversation.name).toBe(remoteData.name);
      expect(merged_conversation.others[0]).toBe(remoteData.members?.others[0].id);
      expect(merged_conversation.type).toBe(remoteData.type);

      expect(merged_conversation.cleared_timestamp).toBe(localData.cleared_timestamp);
      expect(merged_conversation.ephemeral_timer).toBe(localData.ephemeral_timer);
      expect(merged_conversation.id).toBe(localData.id);
      expect(merged_conversation.last_event_timestamp).toBe(localData.last_event_timestamp);
      expect(merged_conversation.last_read_timestamp).toBe(localData.last_read_timestamp);
      expect(merged_conversation.last_server_timestamp).toBe(localData.last_event_timestamp);
      expect(merged_conversation.verification_state).toBe(localData.verification_state);

      const expectedArchivedTimestamp = new Date(remoteData.members.self.otr_archived_ref).getTime();

      expect(merged_conversation.archived_timestamp).toBe(expectedArchivedTimestamp);
      expect(merged_conversation.archived_state).toBe(remoteData.members.self.otr_archived);

      const expectedNotificationTimestamp = new Date(remoteData.members.self.otr_muted_ref).getTime();

      expect(merged_conversation.muted_state).toBe(NOTIFICATION_STATE.EVERYTHING);
      expect(merged_conversation.muted_timestamp).toBe(expectedNotificationTimestamp);

      expect(merged_conversation_2.last_event_timestamp).toBe(2);
      expect(merged_conversation_2.last_server_timestamp).toBe(2);
    });

    it('updates local message timer if present on the remote', () => {
      const baseConversation: Partial<ConversationDatabaseData> = {
        id: 'd5a39ffb-6ce3-4cc8-9048-0123456789abc',
        qualified_id: {domain: 'wire.com', id: 'd5a39ffb-6ce3-4cc8-9048-0123456789abc'},
        members: {others: [], self: {} as any},
      };
      [
        {
          expected: {message_timer: 10000},
          local: {...baseConversation, message_timer: undefined},
          remote: {...baseConversation, message_timer: 10000},
        },
        {
          expected: {message_timer: 0},
          local: {...baseConversation, message_timer: 1000},
          remote: {...baseConversation, message_timer: 0},
        },
      ].forEach(({local, remote, expected}) => {
        const [merged_conversation] = ConversationMapper.mergeConversations(
          [local] as ConversationDatabaseData[],
          {found: [remote]} as RemoteConversations,
        );

        expect(merged_conversation.message_timer).toEqual(expected.message_timer);
      });
    });

    it('returns the local data if the remote data is not present', () => {
      const localData: Partial<ConversationDatabaseData> = {
        archived_state: false,
        archived_timestamp: 1487239601118,
        cleared_timestamp: 0,
        ephemeral_timer: 0,
        global_message_timer: 0,
        id: 'de7466b0-985c-4dc3-ad57-17877db45b4c',
        is_guest: false,
        last_event_timestamp: 1488387380633,
        last_read_timestamp: 1488387380633,
        last_server_timestamp: 1488387380633,
        muted_state: NOTIFICATION_STATE.EVERYTHING,
        muted_timestamp: 0,
        name: 'Family Gathering',
        others: ['532af01e-1e24-4366-aacf-33b67d4ee376'],
        receipt_mode: RECEIPT_MODE.ON,
        status: 0,
        team_id: '5316fe03-24ee-4b19-b789-6d026bd3ce5f',
        type: 2,
        verification_state: ConversationVerificationState.UNVERIFIED,
      };

      const [merged_conversation] = ConversationMapper.mergeConversations(
        [localData] as ConversationDatabaseData[],
        {found: []} as RemoteConversations,
      );

      expect(merged_conversation).toEqual(localData);
    });

    it('returns the remote data if the local data is not present', () => {
      const [merged_conversation] = ConversationMapper.mergeConversations([], {
        found: [remoteData],
      } as RemoteConversations);

      const mergedConversation = {
        accessModes: remoteData.access,
        archived_state: false,
        archived_timestamp: 1487239601118,
        creator: '532af01e-1e24-4366-aacf-33b67d4ee376',
        last_event_timestamp: 1,
        last_server_timestamp: 1,
        muted_state: 0,
        muted_timestamp: 0,
        name: 'Family Gathering',
        others: ['532af01e-1e24-4366-aacf-33b67d4ee376'],
        roles: {},
        team_id: '5316fe03-24ee-4b19-b789-6d026bd3ce5f',
        type: 2,
        domain: 'wire.com',
        id: 'de7466b0-985c-4dc3-ad57-17877db45b4c',
      };

      expect(merged_conversation).toEqual(mergedConversation);
    });

    it('updates local archive and muted timestamps if time of remote data is newer', () => {
      const localData: Partial<ConversationDatabaseData> = {
        archived_state: false,
        archived_timestamp: 1487066801118,
        cleared_timestamp: 0,
        ephemeral_timer: 0,
        id: 'de7466b0-985c-4dc3-ad57-17877db45b4c',
        last_event_timestamp: 1488387380633,
        last_read_timestamp: 1488387380633,
        muted_state: NOTIFICATION_STATE.EVERYTHING,
        muted_timestamp: 0,
        verification_state: ConversationVerificationState.UNVERIFIED,
      };

      const selfUpdate: Partial<MemberBackendData> = {
        otr_archived: true,
        otr_archived_ref: '2017-02-16T10:06:41.118Z',
        otr_muted_ref: '2017-02-16T10:06:41.118Z',
        otr_muted_status: NOTIFICATION_STATE.NOTHING,
      };

      remoteData.members.self = {...remoteData.members.self, ...selfUpdate};

      const [merged_conversation] = ConversationMapper.mergeConversations(
        [localData] as ConversationDatabaseData[],
        {found: [remoteData]} as RemoteConversations,
      );

      expect(merged_conversation.creator).toBe(remoteData.creator);
      expect(merged_conversation.name).toBe(remoteData.name);
      expect(merged_conversation.others[0]).toBe(remoteData.members.others[0].id);
      expect(merged_conversation.type).toBe(remoteData.type);

      expect(merged_conversation.cleared_timestamp).toBe(localData.cleared_timestamp);
      expect(merged_conversation.ephemeral_timer).toBe(localData.ephemeral_timer);
      expect(merged_conversation.id).toBe(localData.id);
      expect(merged_conversation.last_event_timestamp).toBe(localData.last_event_timestamp);
      expect(merged_conversation.last_read_timestamp).toBe(localData.last_read_timestamp);

      expect(merged_conversation.muted_timestamp).not.toBe(localData.muted_timestamp);
      expect(merged_conversation.verification_state).toBe(localData.verification_state);

      // remote one is newer
      const expectedArchivedTimestamp = new Date(remoteData.members.self.otr_archived_ref).getTime();

      expect(merged_conversation.archived_timestamp).toBe(expectedArchivedTimestamp);
      expect(merged_conversation.archived_state).toBe(remoteData.members.self.otr_archived);

      const expectedNotificationTimestamp = new Date(remoteData.members.self.otr_muted_ref).getTime();

      expect(merged_conversation.muted_state).toBe(NOTIFICATION_STATE.NOTHING);
      expect(merged_conversation.muted_timestamp).toBe(expectedNotificationTimestamp);
    });

    it('only maps other participants if they are still in the conversation', () => {
      const othersUpdate: OtherMemberBackendData[] = [
        {
          id: '39b7f597-dfd1-4dff-86f5-fe1b79cb70a0',
          status: 1 as any /*status 1 is an impossible state, but we want to test that it is ignored*/,
        },
        {id: '5eeba863-44be-43ff-8c47-7565a028f182', status: 0},
        {
          id: 'a187fd3e-479a-4e85-a77f-5e4ab95477cf',
          status: 1 as any /*status 1 is an impossible state, but we want to test that it is ignored*/,
        },
        {id: 'd270c7b4-6492-4953-b1bf-be817fe665b2', status: 0},
      ];

      remoteData.members.others = remoteData.members.others.concat(othersUpdate);

      const [merged_conversation] = ConversationMapper.mergeConversations([], {
        found: [remoteData],
      } as RemoteConversations);

      expect(merged_conversation.others.length).toBe(3);
    });

    it('updates server timestamp if event timestamp is greater', () => {
      const localData: Partial<ConversationDatabaseData> = {
        id: 'de7466b0-985c-4dc3-ad57-17877db45b4c',
        last_event_timestamp: 1488387380633,
        last_read_timestamp: 1488387380633,
        last_server_timestamp: 1377276270510,
        muted_state: NOTIFICATION_STATE.EVERYTHING,
        muted_timestamp: 0,
        verification_state: ConversationVerificationState.UNVERIFIED,
      };

      const [merged_conversation] = ConversationMapper.mergeConversations(
        [localData] as ConversationDatabaseData[],
        {found: [remoteData]} as RemoteConversations,
      );

      expect(merged_conversation.last_event_timestamp).toBe(localData.last_event_timestamp);
      expect(merged_conversation.last_server_timestamp).toBe(localData.last_event_timestamp);
    });

    it('prefers remote data over remote data when mapping the read receipts value', () => {
      const localReceiptMode = 0;
      const remoteReceiptMode = 1;
      const [localData, remoteData] = getDataWithReadReceiptMode(localReceiptMode, remoteReceiptMode);
      const [mergedConversation] = ConversationMapper.mergeConversations(
        [localData] as ConversationDatabaseData[],
        {found: [remoteData]} as RemoteConversations,
      );

      expect(mergedConversation.receipt_mode).toBe(remoteReceiptMode);
    });

    it('uses the remote receipt mode when there is no local receipt mode', () => {
      const remoteReceiptMode = 0;
      const [localData, remoteData] = getDataWithReadReceiptMode(null, remoteReceiptMode);

      const [mergedConversation] = ConversationMapper.mergeConversations(
        [localData] as ConversationDatabaseData[],
        {found: [remoteData]} as RemoteConversations,
      );

      expect(mergedConversation.receipt_mode).toBe(remoteReceiptMode);
    });
  });

  describe('mapAccessState', () => {
    it('maps "access_state_v2" first (if exists)', () => {
      const accessModes = [CONVERSATION_ACCESS.INVITE, CONVERSATION_ACCESS.CODE];
      // ACCESS_STATE.TEAM.GUESTS_SERVICES
      const accessRole = [
        CONVERSATION_ACCESS_ROLE.GUEST,
        CONVERSATION_ACCESS_ROLE.NON_TEAM_MEMBER,
        CONVERSATION_ACCESS_ROLE.TEAM_MEMBER,
        CONVERSATION_ACCESS_ROLE.SERVICE,
      ];

      // ACCESS_STATE.TEAM.GUEST_ROOM
      const accessRoleV2 = [
        CONVERSATION_ACCESS_ROLE.GUEST,
        CONVERSATION_ACCESS_ROLE.NON_TEAM_MEMBER,
        CONVERSATION_ACCESS_ROLE.TEAM_MEMBER,
      ];

      const conversationEntity = new Conversation('conversation-id', 'domain');
      conversationEntity.teamId = 'team_id';

      ConversationMapper.mapAccessState(conversationEntity, accessModes, accessRole, accessRoleV2);
      expect(conversationEntity.accessState()).toEqual(ACCESS_STATE.TEAM.GUEST_ROOM);
    });

    it('maps "access_state" if "access_state_v2" is not defined', () => {
      const accessModes = [CONVERSATION_ACCESS.INVITE, CONVERSATION_ACCESS.CODE];
      // ACCESS_STATE.TEAM.GUESTS_SERVICES
      const accessRole = [
        CONVERSATION_ACCESS_ROLE.GUEST,
        CONVERSATION_ACCESS_ROLE.NON_TEAM_MEMBER,
        CONVERSATION_ACCESS_ROLE.TEAM_MEMBER,
        CONVERSATION_ACCESS_ROLE.SERVICE,
      ];

      const accessRoleV2: undefined = undefined;

      const conversationEntity = new Conversation();
      conversationEntity.teamId = 'team_id';

      ConversationMapper.mapAccessState(conversationEntity, accessModes, accessRole, accessRoleV2);
      expect(conversationEntity.accessState()).toEqual(ACCESS_STATE.TEAM.GUESTS_SERVICES);
    });

    describe('maps roles properly for legacy api < v3', () => {
      const mockRightsLegacy: [
        ACCESS_STATE,
        {accessRole: CONVERSATION_LEGACY_ACCESS_ROLE; accessModes: CONVERSATION_ACCESS[]},
      ][] = [
        [
          ACCESS_STATE.TEAM.TEAM_ONLY,
          {
            accessRole: CONVERSATION_LEGACY_ACCESS_ROLE.TEAM,
            accessModes: [CONVERSATION_ACCESS.INVITE],
          },
        ],
        [
          ACCESS_STATE.TEAM.GUEST_ROOM,
          {
            accessRole: CONVERSATION_LEGACY_ACCESS_ROLE.ACTIVATED,
            accessModes: [CONVERSATION_ACCESS.INVITE, CONVERSATION_ACCESS.CODE],
          },
        ],
        [
          ACCESS_STATE.TEAM.GUESTS_SERVICES,
          {
            accessRole: CONVERSATION_LEGACY_ACCESS_ROLE.NON_ACTIVATED,
            accessModes: [CONVERSATION_ACCESS.INVITE, CONVERSATION_ACCESS.CODE],
          },
        ],
        [
          ACCESS_STATE.TEAM.LEGACY,
          {
            accessRole: CONVERSATION_LEGACY_ACCESS_ROLE.NON_ACTIVATED,
            accessModes: [CONVERSATION_ACCESS.INVITE],
          },
        ],
        [
          ACCESS_STATE.TEAM.LEGACY,
          {
            accessRole: CONVERSATION_LEGACY_ACCESS_ROLE.NON_ACTIVATED,
            accessModes: [CONVERSATION_ACCESS.CODE],
          },
        ],
        [
          ACCESS_STATE.TEAM.LEGACY,
          {
            accessRole: CONVERSATION_LEGACY_ACCESS_ROLE.TEAM,
            accessModes: [CONVERSATION_ACCESS.CODE],
          },
        ],
        [
          ACCESS_STATE.TEAM.LEGACY,
          {
            accessRole: CONVERSATION_LEGACY_ACCESS_ROLE.TEAM,
            accessModes: [CONVERSATION_ACCESS.CODE, CONVERSATION_ACCESS.INVITE],
          },
        ],
      ];

      it.each(mockRightsLegacy)('sets correct accessState for %s', (state, {accessModes, accessRole}) => {
        const conversationEntity = new Conversation();
        conversationEntity.teamId = 'team_id';

        ConversationMapper.mapAccessState(conversationEntity, accessModes, accessRole);
        expect(conversationEntity.accessState()).toEqual(state);
      });
    });

    describe('maps roles properly for api >= 3v', () => {
      const mockRightsV3 = {
        [ACCESS_STATE.TEAM.GUESTS_SERVICES]: {
          accessRole: [
            CONVERSATION_ACCESS_ROLE.GUEST,
            CONVERSATION_ACCESS_ROLE.NON_TEAM_MEMBER,
            CONVERSATION_ACCESS_ROLE.TEAM_MEMBER,
            CONVERSATION_ACCESS_ROLE.SERVICE,
          ],
          accessModes: [CONVERSATION_ACCESS.INVITE, CONVERSATION_ACCESS.CODE],
        },
        [ACCESS_STATE.TEAM.GUEST_ROOM]: {
          accessRole: [
            CONVERSATION_ACCESS_ROLE.GUEST,
            CONVERSATION_ACCESS_ROLE.NON_TEAM_MEMBER,
            CONVERSATION_ACCESS_ROLE.TEAM_MEMBER,
          ],
          accessModes: [CONVERSATION_ACCESS.INVITE, CONVERSATION_ACCESS.CODE],
        },
        [ACCESS_STATE.TEAM.SERVICES]: {
          accessModes: [CONVERSATION_ACCESS.INVITE],
          accessRole: [CONVERSATION_ACCESS_ROLE.TEAM_MEMBER, CONVERSATION_ACCESS_ROLE.SERVICE],
        },
        [ACCESS_STATE.TEAM.TEAM_ONLY]: {
          accessModes: [CONVERSATION_ACCESS.INVITE],
          accessRole: [CONVERSATION_ACCESS_ROLE.TEAM_MEMBER],
        },
      };

      const mockAccessRights = Object.entries(mockRightsV3);

      it.each(mockAccessRights)('sets correct accessState for %s', (state, {accessModes, accessRole}) => {
        const conversationEntity = new Conversation();
        conversationEntity.teamId = 'team_id';

        ConversationMapper.mapAccessState(conversationEntity, accessModes, accessRole);
        expect(conversationEntity.accessState()).toEqual(state);
      });
    });

    it('maps roles properly for self conversation', () => {
      const conversationEntity = new Conversation();
      conversationEntity.type(CONVERSATION_TYPE.SELF);

      ConversationMapper.mapAccessState(conversationEntity, [], []);
      expect(conversationEntity.accessState()).toEqual(ACCESS_STATE.OTHER.SELF);
    });

    it('maps roles properly for personal group conversation', () => {
      const conversationEntity = new Conversation();
      jest.spyOn(conversationEntity, 'isGroup').mockImplementationOnce(ko.pureComputed(() => true));

      ConversationMapper.mapAccessState(conversationEntity, [], []);
      expect(conversationEntity.accessState()).toEqual(ACCESS_STATE.PERSONAL.GROUP);
    });

    it('maps roles properly for personal one2one conversation', () => {
      const conversationEntity = new Conversation();
      jest.spyOn(conversationEntity, 'isGroup').mockImplementationOnce(ko.pureComputed(() => false));

      ConversationMapper.mapAccessState(conversationEntity, [], []);
      expect(conversationEntity.accessState()).toEqual(ACCESS_STATE.PERSONAL.ONE2ONE);
    });
  });
});
