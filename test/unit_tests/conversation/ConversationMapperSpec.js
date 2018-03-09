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

// grunt test_init && grunt test_run:conversation/ConversationMapper

'use strict';

describe('Conversation Mapper', () => {
  let conversation_mapper = null;

  beforeEach(() => (conversation_mapper = new z.conversation.ConversationMapper()));

  describe('map_conversations', () => {
    it('throws an error if conversation data is missing', () => {
      expect(() => conversation_mapper.map_conversations()).toThrow(
        new Error('Cannot create conversation entity without data')
      );
    });

    it('maps a single conversation', () => {
      const {conversation} = entities;
      const initial_timestamp = Date.now();
      const [conversation_et] = conversation_mapper.map_conversations([conversation], initial_timestamp);

      const expected_participant_ids = [
        conversation.members.others[0].id,
        conversation.members.others[1].id,
        conversation.members.others[2].id,
        conversation.members.others[3].id,
      ];

      expect(conversation_et.participating_user_ids()).toEqual(expected_participant_ids);
      expect(conversation_et.id).toBe(conversation.id);
      expect(conversation_et.is_group()).toBeTruthy();
      expect(conversation_et.is_muted()).toBe(conversation.members.self.otr_muted);
      expect(conversation_et.last_event_timestamp()).toBe(initial_timestamp);
      expect(conversation_et.last_server_timestamp()).toBe(initial_timestamp);
      expect(conversation_et.muted_timestamp()).toEqual(new Date(conversation.members.self.otr_muted_ref).getTime());
      expect(conversation_et.name()).toBe(conversation.name);
      expect(conversation_et.getNumberOfParticipants()).toBe(conversation.members.others.length + 1);
      expect(conversation_et.team_id).toEqual(conversation.team);
      expect(conversation_et.type()).toBe(z.conversation.ConversationType.REGULAR);
    });

    it('maps multiple conversations', () => {
      const {conversations} = payload.conversations.get;
      const conversation_ets = conversation_mapper.map_conversations(conversations);

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
      /* eslint-disable comma-spacing, key-spacing, sort-keys, quotes */
      const payload = {"access":["invite"],"creator":"f52eed1b-aa64-447f-ad4a-96529f72105f","members":{"self":{"hidden_ref":null,"status":0,"service":null,"otr_muted_ref":null,"status_time":"1970-01-01T00:00:00.000Z","hidden":false,"status_ref":"0.0","id":"39b7f597-dfd1-4dff-86f5-fe1b79cb70a0","otr_archived":false,"otr_muted":false,"otr_archived_ref":null},"others":[{"status":0,"id":"f52eed1b-aa64-447f-ad4a-96529f72105f"}]},"name":"BennyTest","team":"5316fe03-24ee-4b19-b789-6d026bd3ce5f","id":"f2520615-f860-4c72-8b90-9ace3b5f6c37","type":0,"last_event_time":"1970-01-01T00:00:00.000Z","last_event":"0.0"};
      /* eslint-disable comma-spacing, key-spacing, sort-keys, quotes */

      const [conversation_et] = conversation_mapper.map_conversations([payload]);
      expect(conversation_et.name()).toBe(payload.name);
      expect(conversation_et.team_id).toBe(payload.team);
    });
  });

  describe('updateProperties', () => {
    it('can update the properties of a conversation', () => {
      const creator_id = z.util.create_random_uuid();
      const conversation_et = conversation_mapper._create_conversation_et(payload.conversations.get.conversations[0]);
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
  });

  describe('update_self_status', () => {
    let conversation_et = undefined;

    beforeEach(() => {
      conversation_et = conversation_mapper._create_conversation_et(payload.conversations.get.conversations[0]);
    });

    it('returns without updating if conversation entity does not exist', () => {
      conversation_et = undefined;
      const self_status = {muted: false};
      expect(conversation_et).toBe(undefined);
      expect(conversation_mapper.update_self_status(conversation_et, self_status)).toBeFalsy();
    });

    it('can update the self status if the user leaves a conversation', () => {
      const self_status = {status: z.conversation.ConversationStatus.PAST_MEMBER};
      const updated_conversation_et = conversation_mapper.update_self_status(conversation_et, self_status);
      expect(updated_conversation_et.removed_from_conversation()).toBeTruthy();
    });

    it('can update the self status if the user joins a conversation', () => {
      const self_status = {status: z.conversation.ConversationStatus.CURRENT_MEMBER};
      const updated_conversation_et = conversation_mapper.update_self_status(conversation_et, self_status);
      expect(updated_conversation_et.removed_from_conversation()).toBeFalsy();
    });

    it('can update the self status with last event timestamp', () => {
      const timestamp = Date.now();
      const self_status = {last_event_timestamp: timestamp};
      const updated_conversation_et = conversation_mapper.update_self_status(conversation_et, self_status);

      expect(updated_conversation_et.last_event_timestamp()).toBe(timestamp);
    });

    it('can update the self status using otr_archived', () => {
      const timestamp = Date.now();
      conversation_et.last_event_timestamp(timestamp);
      const self_status = {
        otr_archived: true,
        otr_archived_ref: new Date(timestamp).toISOString(),
      };
      const updated_conversation_et = conversation_mapper.update_self_status(conversation_et, self_status);

      expect(updated_conversation_et.archived_timestamp()).toBe(timestamp);
      expect(updated_conversation_et.archived_state()).toBe(true);
    });

    it('can update the self status using archived timestamp', () => {
      const timestamp = Date.now();
      const self_status = {
        archived_state: true,
        archived_timestamp: timestamp,
      };
      const updated_conversation_et = conversation_mapper.update_self_status(conversation_et, self_status);

      expect(updated_conversation_et.archived_timestamp()).toBe(timestamp);
      expect(updated_conversation_et.archived_state()).toBe(true);
    });

    it('can update the self when archive state is false', () => {
      const timestamp = Date.now();
      const self_status = {
        archived_state: false,
        archived_timestamp: timestamp,
      };
      const updated_conversation_et = conversation_mapper.update_self_status(conversation_et, self_status);

      expect(updated_conversation_et.archived_timestamp()).toBe(timestamp);
      expect(updated_conversation_et.archived_state()).toBe(false);
    });

    it('can update the self status if a conversation is cleared', () => {
      const timestamp = Date.now();
      const self_status = {
        cleared_timestamp: timestamp,
        last_event_timestamp: timestamp,
      };
      const updated_conversation_et = conversation_mapper.update_self_status(conversation_et, self_status);

      expect(updated_conversation_et.last_event_timestamp()).toBe(timestamp);
      expect(updated_conversation_et.cleared_timestamp()).toBe(timestamp);
    });

    it('can update the self status if a conversation is read', () => {
      const timestamp = Date.now();
      const self_status = {last_read_timestamp: timestamp};
      const updated_conversation_et = conversation_mapper.update_self_status(conversation_et, self_status);

      expect(updated_conversation_et.last_read_timestamp()).toBe(timestamp);
    });

    it('can update the self status if a conversation is muted', () => {
      const timestamp = Date.now();
      conversation_et.last_event_timestamp(timestamp);
      const self_status = {
        otr_muted: true,
        otr_muted_ref: new Date(timestamp).toISOString(),
      };
      const updated_conversation_et = conversation_mapper.update_self_status(conversation_et, self_status);

      expect(updated_conversation_et.last_event_timestamp()).toBe(timestamp);
      expect(updated_conversation_et.muted_state()).toBe(true);
    });

    it('accepts string values which must be parsed later on', () => {
      conversation_et.last_read_timestamp(0);
      const self_status = {last_read_timestamp: '1480339377099'};
      const last_read_timestamp_number = window.parseInt(self_status.last_read_timestamp, 10);
      const updated_conversation_et = conversation_mapper.update_self_status(conversation_et, self_status);

      expect(updated_conversation_et.last_read_timestamp()).toBe(last_read_timestamp_number);
    });
  });

  describe('merge_conversations', () => {
    // prettier-ignore
    /* eslint-disable comma-spacing, key-spacing, sort-keys, quotes */
    const remote_data = {"access": ["private"], "creator": "532af01e-1e24-4366-aacf-33b67d4ee376", "members": {"self": {"hidden_ref": null, "status": 0, "service": null, "otr_muted_ref": null, "status_time": "2015-01-07T16:26:51.363Z", "hidden": false, "status_ref": "0.0", "id": "8b497692-7a38-4a5d-8287-e3d1006577d6", "otr_archived": false, "otr_muted": false, "otr_archived_ref": "2017-02-16T10:06:41.118Z"}, "others": [{"status": 0, "id": "532af01e-1e24-4366-aacf-33b67d4ee376"}]}, "name": "Family Gathering", "team": "5316fe03-24ee-4b19-b789-6d026bd3ce5f", "id": "de7466b0-985c-4dc3-ad57-17877db45b4c", "type": 2, "last_event_time": "2017-02-14T17:11:10.619Z", "last_event": "4a.800122000a62e4a1"};
    /* eslint-enable comma-spacing, key-spacing, sort-keys, quotes */

    it('incorporates remote data from backend into local data', () => {
      // prettier-ignore
      /* eslint-disable comma-spacing, key-spacing, sort-keys, quotes */
      const local_data = {"archived_state": false, "archived_timestamp": 1487239601118, "cleared_timestamp": 0, "ephemeral_timer": false, "id": "de7466b0-985c-4dc3-ad57-17877db45b4c", "last_event_timestamp": 1488387380633, "last_read_timestamp": 1488387380633, "muted_state": false, "muted_timestamp": 0, "verification_state": 0};
      /* eslint-enable comma-spacing, key-spacing, sort-keys, quotes */

      const [merged_conversation] = conversation_mapper.merge_conversations([local_data], [remote_data]);

      expect(merged_conversation.creator).toBe(remote_data.creator);
      expect(merged_conversation.name).toBe(remote_data.name);
      expect(merged_conversation.others[0]).toBe(remote_data.members.others[0].id);
      expect(merged_conversation.status).toBe(remote_data.members.self.status);
      expect(merged_conversation.team_id).toBe(remote_data.team);
      expect(merged_conversation.type).toBe(remote_data.type);

      expect(merged_conversation.archived_state).toBe(local_data.archived_state);
      expect(merged_conversation.archived_timestamp).toBe(local_data.archived_timestamp);
      expect(merged_conversation.cleared_timestamp).toBe(local_data.cleared_timestamp);
      expect(merged_conversation.ephemeral_timer).toBe(local_data.ephemeral_timer);
      expect(merged_conversation.id).toBe(local_data.id);
      expect(merged_conversation.last_event_timestamp).toBe(local_data.last_event_timestamp);
      expect(merged_conversation.last_read_timestamp).toBe(local_data.last_read_timestamp);
      expect(merged_conversation.muted_state).toBe(local_data.muted_state);
      expect(merged_conversation.muted_timestamp).toBe(local_data.muted_timestamp);
      expect(merged_conversation.verification_state).toBe(local_data.verification_state);
    });

    it('should set timestamps on local data if not present', () => {
      // prettier-ignore
      /* eslint-disable comma-spacing, key-spacing, sort-keys, quotes */
      const local_data = {"cleared_timestamp": 0, "ephemeral_timer": false, "id": "de7466b0-985c-4dc3-ad57-17877db45b4c", "last_event_timestamp": 1488387380633, "last_read_timestamp": 1488387380633, "verification_state": 0};
      /* eslint-enable comma-spacing, key-spacing, sort-keys, quotes */

      const remote_data_2 = JSON.parse(JSON.stringify(remote_data));
      remote_data_2.id = z.util.create_random_uuid();

      const [merged_conversation, merged_conversation_2] = conversation_mapper.merge_conversations(
        [local_data],
        [remote_data, remote_data_2]
      );

      expect(merged_conversation.creator).toBe(remote_data.creator);
      expect(merged_conversation.name).toBe(remote_data.name);
      expect(merged_conversation.others[0]).toBe(remote_data.members.others[0].id);
      expect(merged_conversation.status).toBe(remote_data.members.self.status);
      expect(merged_conversation.type).toBe(remote_data.type);

      expect(merged_conversation.cleared_timestamp).toBe(local_data.cleared_timestamp);
      expect(merged_conversation.ephemeral_timer).toBe(local_data.ephemeral_timer);
      expect(merged_conversation.id).toBe(local_data.id);
      expect(merged_conversation.last_event_timestamp).toBe(local_data.last_event_timestamp);
      expect(merged_conversation.last_read_timestamp).toBe(local_data.last_read_timestamp);
      expect(merged_conversation.last_server_timestamp).toBe(local_data.last_event_timestamp);
      expect(merged_conversation.verification_state).toBe(local_data.verification_state);

      expect(merged_conversation.archived_state).toBe(remote_data.members.self.otr_archived);
      expect(merged_conversation.archived_timestamp).toBe(
        new Date(remote_data.members.self.otr_archived_ref).getTime()
      );

      expect(merged_conversation.muted_state).toBe(remote_data.members.self.otr_muted);
      expect(merged_conversation.muted_timestamp).toBe(new Date(remote_data.members.self.otr_muted_ref).getTime());

      expect(merged_conversation_2.last_event_timestamp).toBe(2);
      expect(merged_conversation_2.last_server_timestamp).toBe(2);
    });

    it('updates local archive and muted timestamps if time of remote data is newer', () => {
      // prettier-ignore
      /* eslint-disable comma-spacing, key-spacing, sort-keys, quotes */
      const local_data = {"archived_state": false, "archived_timestamp": 1487066801118, "cleared_timestamp": 0, "ephemeral_timer": false, "id": "de7466b0-985c-4dc3-ad57-17877db45b4c", "last_event_timestamp": 1488387380633, "last_read_timestamp": 1488387380633, "muted_state": false, "muted_timestamp": 0, "verification_state": 0};
      /* eslint-enable comma-spacing, key-spacing, sort-keys, quotes */

      const self_update = {
        otr_archived: true,
        otr_archived_ref: '2017-02-16T10:06:41.118Z',
        otr_muted: true,
        otr_muted_ref: '2017-02-16T10:06:41.118Z',
      };

      remote_data.members.self = Object.assign(remote_data.members.self, self_update);

      const [merged_conversation] = conversation_mapper.merge_conversations([local_data], [remote_data]);

      expect(merged_conversation.creator).toBe(remote_data.creator);
      expect(merged_conversation.name).toBe(remote_data.name);
      expect(merged_conversation.others[0]).toBe(remote_data.members.others[0].id);
      expect(merged_conversation.status).toBe(remote_data.members.self.status);
      expect(merged_conversation.type).toBe(remote_data.type);

      expect(merged_conversation.cleared_timestamp).toBe(local_data.cleared_timestamp);
      expect(merged_conversation.ephemeral_timer).toBe(local_data.ephemeral_timer);
      expect(merged_conversation.id).toBe(local_data.id);
      expect(merged_conversation.last_event_timestamp).toBe(local_data.last_event_timestamp);
      expect(merged_conversation.last_read_timestamp).toBe(local_data.last_read_timestamp);

      expect(merged_conversation.muted_timestamp).toBe(local_data.muted_timestamp);
      expect(merged_conversation.verification_state).toBe(local_data.verification_state);

      // remote one is newer
      expect(merged_conversation.archived_state).toBe(remote_data.members.self.otr_archived);
      expect(merged_conversation.archived_timestamp).toBe(
        new Date(remote_data.members.self.otr_archived_ref).getTime()
      );

      expect(merged_conversation.muted_state).toBe(remote_data.members.self.otr_muted);
      expect(merged_conversation.muted_timestamp).toBe(new Date(remote_data.members.self.otr_muted_ref).getTime());
    });

    it('only maps other participants if they are still in the conversation', () => {
      // prettier-ignore
      /* eslint-disable comma-spacing, key-spacing, sort-keys, quotes */
      const others_update = [{"status": 1, "id": "39b7f597-dfd1-4dff-86f5-fe1b79cb70a0"}, {"status": 0, "id": "5eeba863-44be-43ff-8c47-7565a028f182"}, {"status": 1, "id": "a187fd3e-479a-4e85-a77f-5e4ab95477cf"}, {"status": 0, "id": "d270c7b4-6492-4953-b1bf-be817fe665b2"}];
      /* eslint-enable comma-spacing, key-spacing, sort-keys, quotes */

      remote_data.members.others = remote_data.members.others.concat(others_update);

      const [merged_conversation] = conversation_mapper.merge_conversations([], [remote_data]);

      expect(merged_conversation.others.length).toBe(3);
    });

    it('updates server timestamp if event timestamp is greater', () => {
      // prettier-ignore
      /* eslint-disable comma-spacing, key-spacing, sort-keys, quotes */
      const local_data = {"id": "de7466b0-985c-4dc3-ad57-17877db45b4c", "last_event_timestamp": 1488387380633, "last_read_timestamp": 1488387380633, "last_server_timestamp": 1377276270510,"muted_state": false, "muted_timestamp": 0, "verification_state": 0};
      /* eslint-enable comma-spacing, key-spacing, sort-keys, quotes */

      const [merged_conversation] = conversation_mapper.merge_conversations([local_data], [remote_data]);

      expect(merged_conversation.last_event_timestamp).toBe(local_data.last_event_timestamp);
      expect(merged_conversation.last_server_timestamp).toBe(local_data.last_event_timestamp);
    });
  });
});
