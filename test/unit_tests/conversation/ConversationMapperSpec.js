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

import {CONVERSATION_TYPE} from '@wireapp/api-client/src/conversation';
import {createRandomUuid} from 'Util/util';

import {Conversation} from 'src/script/entity/Conversation';
import {ConversationMapper} from 'src/script/conversation/ConversationMapper';
import {NOTIFICATION_STATE} from 'src/script/conversation/NotificationSetting';
import {ConversationStatus} from 'src/script/conversation/ConversationStatus';
import {BaseError} from 'src/script/error/BaseError';
import {ConversationError} from 'src/script/error/ConversationError';

describe('ConversationMapper', () => {
  let conversation_mapper = null;

  beforeEach(() => (conversation_mapper = new ConversationMapper()));

  describe('mapConversations', () => {
    it('throws an error for unexpected parameters', () => {
      const functionCallUndefinedParam = () => conversation_mapper.mapConversations();

      expect(functionCallUndefinedParam).toThrowError(ConversationError, BaseError.MESSAGE.MISSING_PARAMETER);

      const functionCallEmtpyArray = () => conversation_mapper.mapConversations([]);

      expect(functionCallEmtpyArray).toThrowError(ConversationError, BaseError.MESSAGE.INVALID_PARAMETER);

      const functionCallWrongType = () => conversation_mapper.mapConversations('Conversation');

      expect(functionCallWrongType).toThrowError(ConversationError, BaseError.MESSAGE.INVALID_PARAMETER);

      const functionCallUndefinedInArray = () => conversation_mapper.mapConversations([undefined]);

      expect(functionCallUndefinedInArray).toThrowError(ConversationError, BaseError.MESSAGE.MISSING_PARAMETER);

      const functionCallStringInArray = () => conversation_mapper.mapConversations(['Conversation']);

      expect(functionCallStringInArray).toThrowError(ConversationError, BaseError.MESSAGE.INVALID_PARAMETER);
    });

    it('maps a single conversation', () => {
      const conversation = entities.conversation;
      const initial_timestamp = Date.now();
      const [conversation_et] = conversation_mapper.mapConversations([conversation], initial_timestamp);

      const expected_participant_ids = [
        conversation.members.others[0].id,
        conversation.members.others[1].id,
        conversation.members.others[2].id,
        conversation.members.others[3].id,
      ];

      expect(conversation_et.participating_user_ids())
        .withContext('participating_user_ids')
        .toEqual(expected_participant_ids);
      expect(conversation_et.id).withContext('id').toBe(conversation.id);
      expect(conversation_et.getNumberOfParticipants())
        .withContext('getNumberOfParticipants')
        .toBe(conversation.members.others.length + 1);
      expect(conversation_et.isGroup()).withContext('isGroup').toBeTruthy();
      expect(conversation_et.name()).withContext('name').toBe(conversation.name);
      expect(conversation_et.mutedState()).withContext('mutedState').toBe(0);
      expect(conversation_et.team_id).withContext('team_id').toEqual(conversation.team);
      expect(conversation_et.type()).withContext('type').toBe(CONVERSATION_TYPE.REGULAR);

      const expectedMutedTimestamp = new Date(conversation.members.self.otr_muted_ref).getTime();

      expect(conversation_et.mutedTimestamp()).withContext('mutedTimestamp').toEqual(expectedMutedTimestamp);
      expect(conversation_et.last_event_timestamp()).withContext('last_event_timestamp').toBe(initial_timestamp);
      expect(conversation_et.last_server_timestamp()).withContext('last_server_timestamp').toBe(initial_timestamp);
    });

    it('maps multiple conversations', () => {
      const conversations = payload.conversations.get.conversations;
      const conversation_ets = conversation_mapper.mapConversations(conversations);

      expect(conversation_ets.length).toBe(conversations.length);

      const [first_conversation_et, second_conversation_et] = conversation_ets;

      expect(first_conversation_et.id).toBe(conversations[0].id);
      expect(first_conversation_et.last_event_timestamp()).toBe(1);
      expect(first_conversation_et.last_server_timestamp()).toBe(1);
      expect(first_conversation_et.name()).toBe(conversations[0].name);

      expect(second_conversation_et.id).toBe(conversations[1].id);
      expect(second_conversation_et.last_event_timestamp()).toBe(2);
      expect(second_conversation_et.last_server_timestamp()).toBe(2);
      expect(second_conversation_et.name()).toBe(conversations[1].name);
    });

    it('maps a team conversation', () => {
      // prettier-ignore
      /* eslint-disable comma-spacing, key-spacing, sort-keys-fix/sort-keys-fix, quotes */
      const payload = {"access":["invite"],"creator":"f52eed1b-aa64-447f-ad4a-96529f72105f","members":{"self":{"hidden_ref":null,"status":0,"service":null,"otr_muted_ref":null,"status_time":"1970-01-01T00:00:00.000Z","hidden":false,"status_ref":"0.0","id":"39b7f597-dfd1-4dff-86f5-fe1b79cb70a0","otr_archived":false,"otr_muted":false,"otr_archived_ref":null},"others":[{"status":0,"id":"f52eed1b-aa64-447f-ad4a-96529f72105f"}]},"name":"BennyTest","team":"5316fe03-24ee-4b19-b789-6d026bd3ce5f","id":"f2520615-f860-4c72-8b90-9ace3b5f6c37","type":0,"last_event_time":"1970-01-01T00:00:00.000Z","last_event":"0.0"};
      /* eslint-disable comma-spacing, key-spacing, sort-keys-fix/sort-keys-fix, quotes */

      const [conversation_et] = conversation_mapper.mapConversations([payload]);

      expect(conversation_et.name()).toBe(payload.name);
      expect(conversation_et.team_id).toBe(payload.team);
    });
  });

  describe('updateProperties', () => {
    it('can update the properties of a conversation', () => {
      const creator_id = createRandomUuid();
      const conversationsData = [payload.conversations.get.conversations[0]];
      const [conversation_et] = conversation_mapper.mapConversations(conversationsData);
      const data = {
        creator: creator_id,
        id: 'd5a39ffb-6ce3-4cc8-9048-0123456789abc',
        name: 'New foo bar conversation name',
      };
      const updated_conversation_et = conversation_mapper.updateProperties(conversation_et, data);

      expect(updated_conversation_et.name()).toBe(data.name);
      expect(updated_conversation_et.id).not.toBe(data.id);
      expect(updated_conversation_et.creator).toBe(data.creator);
    });

    it('only updates existing properties', () => {
      const updatedName = 'Christmas 2017';
      const conversationEntity = new Conversation(createRandomUuid());
      conversationEntity.name('Christmas 2016');

      expect(conversationEntity.name()).toBeDefined();

      const updates = {
        name: updatedName,
        newProperty: 'abc',
      };
      conversation_mapper.updateProperties(conversationEntity, updates);

      expect(conversationEntity.name()).toBe(updatedName);
      expect(conversationEntity.newProperty).toBeUndefined();
    });
  });

  describe('updateSelfStatus', () => {
    let conversation_et = undefined;

    beforeEach(() => {
      const conversationsData = [payload.conversations.get.conversations[0]];
      [conversation_et] = conversation_mapper.mapConversations(conversationsData);
    });

    it('returns without updating if conversation entity does not exist', () => {
      conversation_et = undefined;
      const self_status = {muted: false};

      expect(conversation_et).toBe(undefined);
      expect(conversation_mapper.updateSelfStatus(conversation_et, self_status)).toBeFalsy();
    });

    it('can update the self status if the user leaves a conversation', () => {
      const self_status = {status: ConversationStatus.PAST_MEMBER};
      const updated_conversation_et = conversation_mapper.updateSelfStatus(conversation_et, self_status);

      expect(updated_conversation_et.removed_from_conversation()).toBeTruthy();
    });

    it('can update the self status if the user joins a conversation', () => {
      const self_status = {status: ConversationStatus.CURRENT_MEMBER};
      const updated_conversation_et = conversation_mapper.updateSelfStatus(conversation_et, self_status);

      expect(updated_conversation_et.removed_from_conversation()).toBeFalsy();
    });

    it('can update the self status with last event timestamp', () => {
      const timestamp = Date.now();
      const self_status = {last_event_timestamp: timestamp};
      const updated_conversation_et = conversation_mapper.updateSelfStatus(conversation_et, self_status);

      expect(updated_conversation_et.last_event_timestamp()).toBe(timestamp);
    });

    it('can update the self status using otr_archived', () => {
      const timestamp = Date.now();
      conversation_et.last_event_timestamp(timestamp);
      const self_status = {
        otr_archived: true,
        otr_archived_ref: new Date(timestamp).toISOString(),
      };
      const updated_conversation_et = conversation_mapper.updateSelfStatus(conversation_et, self_status);

      expect(updated_conversation_et.archivedTimestamp()).toBe(timestamp);
      expect(updated_conversation_et.archivedState()).toBe(true);
    });

    it('can update the self status using archived timestamp', () => {
      const timestamp = Date.now();
      const self_status = {
        archived_state: true,
        archived_timestamp: timestamp,
      };
      const updated_conversation_et = conversation_mapper.updateSelfStatus(conversation_et, self_status);

      expect(updated_conversation_et.archivedTimestamp()).toBe(timestamp);
      expect(updated_conversation_et.archivedState()).toBe(true);
    });

    it('can update the self when archive state is false', () => {
      const timestamp = Date.now();
      const self_status = {
        archived_state: false,
        archived_timestamp: timestamp,
      };
      const updated_conversation_et = conversation_mapper.updateSelfStatus(conversation_et, self_status);

      expect(updated_conversation_et.archivedTimestamp()).toBe(timestamp);
      expect(updated_conversation_et.archivedState()).toBe(false);
    });

    it('can update the self status if a conversation is cleared', () => {
      const timestamp = Date.now();
      const self_status = {
        cleared_timestamp: timestamp,
        last_event_timestamp: timestamp,
      };
      const updated_conversation_et = conversation_mapper.updateSelfStatus(conversation_et, self_status);

      expect(updated_conversation_et.last_event_timestamp()).toBe(timestamp);
      expect(updated_conversation_et.cleared_timestamp()).toBe(timestamp);
    });

    it('can update the self status if a conversation is read', () => {
      const timestamp = Date.now();
      const self_status = {last_read_timestamp: timestamp};
      const updated_conversation_et = conversation_mapper.updateSelfStatus(conversation_et, self_status);

      expect(updated_conversation_et.last_read_timestamp()).toBe(timestamp);
    });

    it('can update the self status if a conversation is muted', () => {
      const timestamp = Date.now();
      conversation_et.last_event_timestamp(timestamp);

      const self_status = {
        otr_muted: true,
        otr_muted_ref: new Date(timestamp).toISOString(),
      };
      const updated_conversation_et = conversation_mapper.updateSelfStatus(conversation_et, self_status);

      expect(updated_conversation_et.last_event_timestamp()).toBe(timestamp);
      expect(updated_conversation_et.mutedTimestamp()).toBe(timestamp);
      expect(updated_conversation_et.notificationState()).toBe(NOTIFICATION_STATE.NOTHING);
    });

    it('accepts string values which must be parsed later on', () => {
      conversation_et.last_read_timestamp(0);
      const self_status = {last_read_timestamp: '1480339377099'};
      const last_read_timestamp_number = window.parseInt(self_status.last_read_timestamp, 10);
      const updated_conversation_et = conversation_mapper.updateSelfStatus(conversation_et, self_status);
      expect(updated_conversation_et.last_read_timestamp()).toBe(last_read_timestamp_number);
    });
  });

  describe('mergeConversation', () => {
    function getDataWithReadReceiptMode(localReceiptMode, remoteReceiptMode) {
      const conversationCreatorId = createRandomUuid();
      const conversationId = createRandomUuid();
      const conversationName = 'Hello, World!';
      const selfUserId = createRandomUuid();
      const teamId = createRandomUuid();

      const localData = {
        archived_state: false,
        archived_timestamp: 0,
        cleared_timestamp: 0,
        ephemeral_timer: null,
        global_message_timer: null,
        id: conversationId,
        is_guest: false,
        is_managed: false,
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
        verification_state: 0,
      };

      const remoteData = {
        access: ['invite', 'code'],
        access_role: 'non_activated',
        creator: conversationCreatorId,
        id: conversationId,
        last_event: '0.0',
        last_event_time: '1970-01-01T00:00:00.000Z',
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
            otr_muted: false,
            otr_muted_ref: null,
            otr_muted_status: null,
            service: null,
            status: 0,
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

    // prettier-ignore
    /* eslint-disable comma-spacing, key-spacing, sort-keys-fix/sort-keys-fix, quotes */
    const  remote_data = {"access": ["private"], "creator": "532af01e-1e24-4366-aacf-33b67d4ee376", "members": {"self": {"hidden_ref": null, "status": 0, "service": null, "otr_muted_ref": null, "status_time": "2015-01-07T16:26:51.363Z", "hidden": false, "status_ref": "0.0", "id": "8b497692-7a38-4a5d-8287-e3d1006577d6", "otr_archived": false, "otr_muted": false, "otr_archived_ref": "2017-02-16T10:06:41.118Z"}, "others": [{"status": 0, "id": "532af01e-1e24-4366-aacf-33b67d4ee376"}]}, "name": "Family Gathering", "team": "5316fe03-24ee-4b19-b789-6d026bd3ce5f", "id": "de7466b0-985c-4dc3-ad57-17877db45b4c", "type": 2, "last_event_time": "2017-02-14T17:11:10.619Z", "last_event": "4a.800122000a62e4a1"};
    /* eslint-enable comma-spacing, key-spacing, sort-keys-fix/sort-keys-fix, quotes */

    it('incorporates remote data from backend into local data', () => {
      // prettier-ignore
      /* eslint-disable comma-spacing, key-spacing, sort-keys-fix/sort-keys-fix, quotes */
      const local_data = {"archived_state": false, "archived_timestamp": 1487239601118, "cleared_timestamp": 0, "ephemeral_timer": false, "id": "de7466b0-985c-4dc3-ad57-17877db45b4c", "last_event_timestamp": 1488387380633, "last_read_timestamp": 1488387380633, "muted_state": NOTIFICATION_STATE.EVERYTHING, "muted_timestamp": 0, "verification_state": 0};
      /* eslint-enable comma-spacing, key-spacing, sort-keys-fix/sort-keys-fix, quotes */

      const [merged_conversation] = conversation_mapper.mergeConversation([local_data], [remote_data]);

      expect(merged_conversation.creator).withContext('creator').toBe(remote_data.creator);
      expect(merged_conversation.name).withContext('name').toBe(remote_data.name);
      expect(merged_conversation.others[0]).withContext('others').toBe(remote_data.members.others[0].id);
      expect(merged_conversation.status).withContext('status').toBe(remote_data.members.self.status);
      expect(merged_conversation.team_id).withContext('team_id').toBe(remote_data.team);
      expect(merged_conversation.type).withContext('type').toBe(remote_data.type);

      expect(merged_conversation.archived_state).withContext('archived_state').toBe(local_data.archived_state);
      expect(merged_conversation.archived_timestamp)
        .withContext('archived_timestamp')
        .toBe(local_data.archived_timestamp);
      expect(merged_conversation.cleared_timestamp).withContext('cleared_timestamp').toBe(local_data.cleared_timestamp);
      expect(merged_conversation.ephemeral_timer).withContext('ephemeral_timer').toBe(local_data.ephemeral_timer);
      expect(merged_conversation.id).withContext('id').toBe(local_data.id);
      expect(merged_conversation.last_event_timestamp)
        .withContext('last_event_timestamp')
        .toBe(local_data.last_event_timestamp);
      expect(merged_conversation.last_read_timestamp)
        .withContext('last_read_timestamp')
        .toBe(local_data.last_read_timestamp);
      expect(merged_conversation.muted_state).withContext('muted_state').toBe(local_data.muted_state);
      expect(merged_conversation.muted_timestamp).withContext('muted_timestamp').toBe(local_data.muted_timestamp);
      expect(merged_conversation.verification_state)
        .withContext('verification_state')
        .toBe(local_data.verification_state);
    });

    it('should set timestamps on local data if not present', () => {
      // prettier-ignore
      /* eslint-disable comma-spacing, key-spacing, sort-keys-fix/sort-keys-fix, quotes */
      const local_data = {"cleared_timestamp": 0, "ephemeral_timer": false, "id": "de7466b0-985c-4dc3-ad57-17877db45b4c", "last_event_timestamp": 1488387380633, "last_read_timestamp": 1488387380633, "verification_state": 0};
      /* eslint-enable comma-spacing, key-spacing, sort-keys-fix/sort-keys-fix, quotes */

      const remote_data_2 = JSON.parse(JSON.stringify(remote_data));
      remote_data_2.id = createRandomUuid();

      const [merged_conversation, merged_conversation_2] = conversation_mapper.mergeConversation(
        [local_data],
        [remote_data, remote_data_2],
      );

      expect(merged_conversation.creator).withContext('creator').toBe(remote_data.creator);
      expect(merged_conversation.name).withContext('name').toBe(remote_data.name);
      expect(merged_conversation.others[0]).withContext('others').toBe(remote_data.members.others[0].id);
      expect(merged_conversation.status).withContext('status').toBe(remote_data.members.self.status);
      expect(merged_conversation.type).withContext('type').toBe(remote_data.type);

      expect(merged_conversation.cleared_timestamp).withContext('cleared_timestamp').toBe(local_data.cleared_timestamp);
      expect(merged_conversation.ephemeral_timer).withContext('ephemeral_timer').toBe(local_data.ephemeral_timer);
      expect(merged_conversation.id).withContext('id').toBe(local_data.id);
      expect(merged_conversation.last_event_timestamp)
        .withContext('last_event_timestamp')
        .toBe(local_data.last_event_timestamp);
      expect(merged_conversation.last_read_timestamp)
        .withContext('last_read_timestamp')
        .toBe(local_data.last_read_timestamp);
      expect(merged_conversation.last_server_timestamp)
        .withContext('last_server_timestamp')
        .toBe(local_data.last_event_timestamp);
      expect(merged_conversation.verification_state)
        .withContext('verification_state')
        .toBe(local_data.verification_state);

      const expectedArchivedTimestamp = new Date(remote_data.members.self.otr_archived_ref).getTime();

      expect(merged_conversation.archived_timestamp).withContext('archived_timestamp').toBe(expectedArchivedTimestamp);
      expect(merged_conversation.archived_state)
        .withContext('archived_state')
        .toBe(remote_data.members.self.otr_archived);

      const expectedNotificationTimestamp = new Date(remote_data.members.self.otr_muted_ref).getTime();

      expect(merged_conversation.muted_state).withContext('muted_state').toBe(false);
      expect(merged_conversation.muted_timestamp).withContext('muted_timestamp').toBe(expectedNotificationTimestamp);

      expect(merged_conversation_2.last_event_timestamp).withContext('last_event_timestamp').toBe(2);
      expect(merged_conversation_2.last_server_timestamp).withContext('last_server_timestamp').toBe(2);
    });

    it('updates local message timer if present on the remote', () => {
      const baseConversation = {
        id: 'd5a39ffb-6ce3-4cc8-9048-0123456789abc',
        members: {others: [], self: {}},
      };
      const tests = [
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
      ];

      tests.forEach(({local, remote, expected}) => {
        const [merged_conversation] = conversation_mapper.mergeConversation([local], [remote]);

        expect(merged_conversation.message_timer).toEqual(expected.message_timer);
      });
    });

    it('updates local archive and muted timestamps if time of remote data is newer', () => {
      // prettier-ignore
      /* eslint-disable comma-spacing, key-spacing, sort-keys-fix/sort-keys-fix, quotes */
      const local_data = {"archived_state": false, "archived_timestamp": 1487066801118, "cleared_timestamp": 0, "ephemeral_timer": false, "id": "de7466b0-985c-4dc3-ad57-17877db45b4c", "last_event_timestamp": 1488387380633, "last_read_timestamp": 1488387380633, "muted_state": NOTIFICATION_STATE.EVERYTHING, "muted_timestamp": 0, "verification_state": 0};
      /* eslint-enable comma-spacing, key-spacing, sort-keys-fix/sort-keys-fix, quotes */

      const self_update = {
        otr_archived: true,
        otr_archived_ref: '2017-02-16T10:06:41.118Z',
        otr_muted: true,
        otr_muted_ref: '2017-02-16T10:06:41.118Z',
      };

      remote_data.members.self = {...remote_data.members.self, ...self_update};

      const [merged_conversation] = conversation_mapper.mergeConversation([local_data], [remote_data], true);

      expect(merged_conversation.creator).withContext('creator').toBe(remote_data.creator);
      expect(merged_conversation.name).withContext('name').toBe(remote_data.name);
      expect(merged_conversation.others[0]).withContext('others').toBe(remote_data.members.others[0].id);
      expect(merged_conversation.status).withContext('status').toBe(remote_data.members.self.status);
      expect(merged_conversation.type).withContext('type').toBe(remote_data.type);

      expect(merged_conversation.cleared_timestamp).withContext('cleared_timestamp').toBe(local_data.cleared_timestamp);
      expect(merged_conversation.ephemeral_timer).withContext('ephemeral_timer').toBe(local_data.ephemeral_timer);
      expect(merged_conversation.id).withContext('id').toBe(local_data.id);
      expect(merged_conversation.last_event_timestamp)
        .withContext('last_event_timestamp')
        .toBe(local_data.last_event_timestamp);
      expect(merged_conversation.last_read_timestamp)
        .withContext('last_read_timestamp')
        .toBe(local_data.last_read_timestamp);

      expect(merged_conversation.muted_timestamp).withContext('muted_timestamp').not.toBe(local_data.muted_timestamp);
      expect(merged_conversation.verification_state)
        .withContext('verification_state')
        .toBe(local_data.verification_state);

      // remote one is newer
      const expectedArchivedTimestamp = new Date(remote_data.members.self.otr_archived_ref).getTime();

      expect(merged_conversation.archived_timestamp).withContext('archived_timestamp').toBe(expectedArchivedTimestamp);
      expect(merged_conversation.archived_state)
        .withContext('archived_state')
        .toBe(remote_data.members.self.otr_archived);

      const expectedNotificationTimestamp = new Date(remote_data.members.self.otr_muted_ref).getTime();

      expect(merged_conversation.muted_state).withContext('muted_state').toBe(true);
      expect(merged_conversation.muted_timestamp).withContext('muted_timestamp').toBe(expectedNotificationTimestamp);
    });

    it('only maps other participants if they are still in the conversation', () => {
      // prettier-ignore
      /* eslint-disable comma-spacing, key-spacing, sort-keys-fix/sort-keys-fix, quotes */
      const others_update = [{"status": 1, "id": "39b7f597-dfd1-4dff-86f5-fe1b79cb70a0"}, {"status": 0, "id": "5eeba863-44be-43ff-8c47-7565a028f182"}, {"status": 1, "id": "a187fd3e-479a-4e85-a77f-5e4ab95477cf"}, {"status": 0, "id": "d270c7b4-6492-4953-b1bf-be817fe665b2"}];
      /* eslint-enable comma-spacing, key-spacing, sort-keys-fix/sort-keys-fix, quotes */

      remote_data.members.others = remote_data.members.others.concat(others_update);

      const [merged_conversation] = conversation_mapper.mergeConversation([], [remote_data]);

      expect(merged_conversation.others.length).toBe(3);
    });

    it('updates server timestamp if event timestamp is greater', () => {
      // prettier-ignore
      /* eslint-disable comma-spacing, key-spacing, sort-keys-fix/sort-keys-fix, quotes */
      const local_data = {"id": "de7466b0-985c-4dc3-ad57-17877db45b4c", "last_event_timestamp": 1488387380633, "last_read_timestamp": 1488387380633, "last_server_timestamp": 1377276270510,"muted_state": false, "muted_timestamp": 0, "verification_state": 0};
      /* eslint-enable comma-spacing, key-spacing, sort-keys-fix/sort-keys-fix, quotes */

      const [merged_conversation] = conversation_mapper.mergeConversation([local_data], [remote_data]);

      expect(merged_conversation.last_event_timestamp).toBe(local_data.last_event_timestamp);
      expect(merged_conversation.last_server_timestamp).toBe(local_data.last_event_timestamp);
    });

    it('prefers local data over remote data when mapping the read receipts value', () => {
      const localReceiptMode = 0;
      const [localData, remoteData] = getDataWithReadReceiptMode(localReceiptMode, 1);
      const [mergedConversation] = conversation_mapper.mergeConversation([localData], [remoteData]);

      expect(mergedConversation.receipt_mode).toBe(localReceiptMode);
    });

    it('uses the remote receipt mode when there is no local receipt mode', () => {
      const remoteReceiptMode = 0;
      const [localData, remoteData] = getDataWithReadReceiptMode(null, remoteReceiptMode);

      const [mergedConversation] = conversation_mapper.mergeConversation([localData], [remoteData]);

      expect(mergedConversation.receipt_mode).withContext('receipt_mode').toBe(remoteReceiptMode);
    });
  });

  describe('getMutedState', () => {
    let expectedState;

    it('returns states if only a muted state is given', () => {
      expectedState = conversation_mapper.getMutedState(true);

      expect(expectedState).toBe(true);
      expectedState = conversation_mapper.getMutedState(false);

      expect(expectedState).toBe(false);
    });

    it('returns states if congruent states are given', () => {
      expectedState = conversation_mapper.getMutedState(true, NOTIFICATION_STATE.NOTHING);

      expect(expectedState).toBe(NOTIFICATION_STATE.NOTHING);
      expectedState = conversation_mapper.getMutedState(true, NOTIFICATION_STATE.MENTIONS_AND_REPLIES);

      expect(expectedState).toBe(NOTIFICATION_STATE.MENTIONS_AND_REPLIES);
      expectedState = conversation_mapper.getMutedState(false, NOTIFICATION_STATE.EVERYTHING);

      expect(expectedState).toBe(NOTIFICATION_STATE.EVERYTHING);
    });

    it('returns states if conflicting states are given', () => {
      expectedState = conversation_mapper.getMutedState(false, NOTIFICATION_STATE.NOTHING);

      expect(expectedState).toBe(NOTIFICATION_STATE.EVERYTHING);
      expectedState = conversation_mapper.getMutedState(false, NOTIFICATION_STATE.MENTIONS_AND_REPLIES);

      expect(expectedState).toBe(NOTIFICATION_STATE.EVERYTHING);
      expectedState = conversation_mapper.getMutedState(true, NOTIFICATION_STATE.EVERYTHING);

      expect(expectedState).toBe(NOTIFICATION_STATE.MENTIONS_AND_REPLIES);
    });

    it('returns states if invalid states are given', () => {
      expectedState = conversation_mapper.getMutedState();

      expect(expectedState).toBe(NOTIFICATION_STATE.EVERYTHING);
      expectedState = conversation_mapper.getMutedState('true');

      expect(expectedState).toBe(NOTIFICATION_STATE.EVERYTHING);
      expectedState = conversation_mapper.getMutedState(0b10);

      expect(expectedState).toBe(NOTIFICATION_STATE.EVERYTHING);
    });
  });
});
