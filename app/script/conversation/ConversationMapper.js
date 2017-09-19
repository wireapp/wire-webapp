/*
 * Wire
 * Copyright (C) 2017 Wire Swiss GmbH
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

'use strict';

window.z = window.z || {};
window.z.conversation = z.conversation || {};

// Conversation Mapper to convert all server side JSON conversation objects into core entities
z.conversation.ConversationMapper = class ConversationMapper {
  // Construct a new Conversation Mapper.
  constructor() {
    this.logger = new z.util.Logger('z.conversation.ConversationMapper', z.config.LOGGER.OPTIONS);
  }

  /**
   * Convert a JSON conversation into a conversation entity.
   *
   * @param {Object} json - Conversation data
   * @param {number} time_offset - Approximate time different to backend in milliseconds
   * @returns {Conversation} Mapped conversation entity
   */
  map_conversation(json, time_offset) {
    const json_data_array = json ? (json.data ? [json.data] : [json]) : [json];
    const [conversation_et] = this.map_conversations(json_data_array, time_offset);
    return conversation_et;
  }

  /**
   * Convert multiple JSON conversations into a conversation entities.
   *
   * @param {Object} json - Conversation data
   * @param {number} time_offset - Approximate time different to backend in milliseconds
   * @returns {Array<Conversation>} Mapped conversation entities
   */
  map_conversations(json, time_offset) {
    return json.map((conversation, index) => this._create_conversation_et(conversation, time_offset));
  }

  /**
   * Updates all properties of a conversation specified
   *
   * @example data: {"name":"ThisIsMyNewConversationName"}
   * @todo make utility?
   *
   * @param {Conversation} conversation_et - Conversation to be updated
   * @param {Object} conversation_data - Conversation data
   * @returns {Conversation} Updated conversation entity
   */
  update_properties(conversation_et, conversation_data) {
    for (const key in conversation_data) {
      if (key !== 'id' && conversation_et.hasOwnProperty(key)) {
        const value = conversation_data[key];

        if (value !== undefined) {
          if (ko.isObservable(conversation_et[key])) {
            conversation_et[key](value);
          } else {
            conversation_et[key] = value;
          }
        }
      }
    }

    return conversation_et;
  }

  /**
   * Update the membership properties of a conversation.
   *
   * @param {Conversation} conversation_et - Conversation to be updated
   * @param {Object} self_state - Conversation self data
   * @returns {Conversation} Updated conversation entity
   */
  update_self_status(conversation_et, self_state) {
    if (conversation_et) {
      // Database states
      const {
        archived_timestamp,
        cleared_timestamp,
        ephemeral_timer,
        last_event_timestamp,
        last_read_timestamp,
        last_server_timestamp,
        muted_timestamp,
        status,
        verification_state,
      } = self_state;

      if (archived_timestamp) {
        conversation_et.set_timestamp(archived_timestamp, z.conversation.TIMESTAMP_TYPE.ARCHIVED);
        conversation_et.archived_state(self_state.archived_state);
      }

      if (cleared_timestamp) {
        conversation_et.set_timestamp(cleared_timestamp, z.conversation.TIMESTAMP_TYPE.CLEARED);
      }

      if (ephemeral_timer !== undefined) {
        conversation_et.ephemeral_timer(ephemeral_timer);
      }

      if (last_event_timestamp) {
        conversation_et.set_timestamp(last_event_timestamp, z.conversation.TIMESTAMP_TYPE.LAST_EVENT);
      }

      if (last_read_timestamp) {
        conversation_et.set_timestamp(last_read_timestamp, z.conversation.TIMESTAMP_TYPE.LAST_READ);
      }

      if (last_server_timestamp) {
        conversation_et.set_timestamp(last_server_timestamp, z.conversation.TIMESTAMP_TYPE.LAST_SERVER);
      }

      if (muted_timestamp) {
        conversation_et.set_timestamp(muted_timestamp, z.conversation.TIMESTAMP_TYPE.MUTED);
        conversation_et.muted_state(self_state.muted_state);
      }

      if (status !== undefined) {
        conversation_et.status(status);
      }

      if (verification_state !== undefined) {
        conversation_et.verification_state(verification_state);
      }

      // Backend states
      const {otr_archived, otr_muted} = self_state;

      if (otr_archived !== undefined) {
        const otr_archived_timestamp = new Date(self_state.otr_archived_ref).getTime();
        conversation_et.set_timestamp(otr_archived_timestamp, z.conversation.TIMESTAMP_TYPE.ARCHIVED);
        conversation_et.archived_state(otr_archived);
      }

      if (otr_muted !== undefined) {
        const otr_muted_timestamp = new Date(self_state.otr_muted_ref).getTime();
        conversation_et.set_timestamp(otr_muted_timestamp, z.conversation.TIMESTAMP_TYPE.MUTED);
        conversation_et.muted_state(otr_muted);
      }

      return conversation_et;
    }
  }

  /**
   * Creates a conversation entity from backend JSON data.
   *
   * @private
   * @param {Object} conversation_data - Either locally stored or backend data
   * @param {number} [time_offset=0] - Approximate time different to backend in milliseconds
   * @returns {Conversation} Mapped conversation entity
   */
  _create_conversation_et(conversation_data, time_offset = 0) {
    if (conversation_data === undefined) {
      throw new Error('Cannot create conversation entity without data');
    }

    const {creator, id, members, name, others, type} = conversation_data;
    let conversation_et = new z.entity.Conversation(id);

    conversation_et.creator = creator;
    conversation_et.type(type);
    conversation_et.name(name ? name : '');

    const self_state = members ? members.self : conversation_data;
    conversation_et = this.update_self_status(conversation_et, self_state);

    if (!conversation_et.last_event_timestamp()) {
      const current_timestamp = Date.now() - time_offset;
      conversation_et.last_event_timestamp(current_timestamp);
      conversation_et.last_server_timestamp(current_timestamp);
    }

    // All users that are still active
    if (others) {
      conversation_et.participating_user_ids(others);
    } else {
      const participating_user_ids = members.others
        .filter((other) => other.status === z.conversation.ConversationStatus.CURRENT_MEMBER)
        .map((other) => other.id);

      conversation_et.participating_user_ids(participating_user_ids);
    }

    // Data from IndexedDB or backend
    const team_id = conversation_data.team_id ? conversation_data.team_id : conversation_data.team;
    if (team_id) {
      conversation_et.team_id = team_id;
    }

    if (conversation_data.is_guest) {
      conversation_et.is_guest(conversation_data.is_guest);
    }

    return conversation_et;
  }

  /**
   * Merge local database records with remote backend payload.
   * @param {Array} local - Database records
   * @param {Array} remote - Backend payload
   * @returns {Array} Merged conversation data
   */
  merge_conversations(local, remote) {
    return remote.map((remote_conversation, index) => {
      const {id, creator, members, name, team, type} = remote_conversation;
      let local_conversation = local
        .filter((conversation) => conversation)
        .find((conversation) => conversation.id === id);

      if (!local_conversation) {
        local_conversation = {
          id: id,
        };
      }

      local_conversation.creator = creator;
      local_conversation.name = name;
      local_conversation.status = members.self.status;
      local_conversation.team_id = team;
      local_conversation.type = type;

      local_conversation.others = members.others
        .filter((other) => other.status === z.conversation.ConversationStatus.CURRENT_MEMBER)
        .map((other) => other.id);

      // This should ensure a proper order
      if (!local_conversation.last_event_timestamp) {
        local_conversation.last_event_timestamp = index + 1;
      }

      // Set initially or correct server timestamp
      if (!local_conversation.last_server_timestamp || (local_conversation.last_server_timestamp < local_conversation.last_event_timestamp)) {
        local_conversation.last_server_timestamp = local_conversation.last_event_timestamp;
      }

      // Some archived timestamp were not properly stored in the database.
      // To fix this we check if the remote one is newer and update our local timestamp.
      const {archived_state: local_archived_state, archived_timestamp: local_archived_timestamp} = local_conversation;
      const remote_archived_timestamp = new Date(members.self.otr_archived_ref).getTime();
      const is_remote_archived_timestamp_newer = (local_archived_timestamp !== undefined) && (remote_archived_timestamp > local_archived_timestamp);

      if (is_remote_archived_timestamp_newer || (local_archived_state === undefined)) {
        local_conversation.archived_state = members.self.otr_archived;
        local_conversation.archived_timestamp = remote_archived_timestamp;
      }

      const {muted_state: local_muted_state, muted_timestamp: local_muted_timestamp} = local_conversation;
      const remote_muted_timestamp = new Date(members.self.otr_muted_ref).getTime();
      const is_remote_muted_timestamp_newer = (local_muted_timestamp !== undefined) && (remote_muted_timestamp > local_muted_timestamp);

      if (is_remote_muted_timestamp_newer || local_muted_state === undefined) {
        local_conversation.muted_state = members.self.otr_muted;
        local_conversation.muted_timestamp = remote_muted_timestamp;
      }

      return local_conversation;
    });
  }
};
