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
   * @param {Object} json - Conversation data
   * @returns {Conversation} Mapped conversation entity
   */
  map_conversation(json) {
    const json_data_array = json ? (json.data ? [json.data] : [json]) : [json];
    const [conversation_et] = this.map_conversations(json_data_array);
    return conversation_et;
  }

  /**
   * Convert multiple JSON conversations into a conversation entities.
   * @param {Object} json - Conversation data
   * @returns {Array<Conversation>} Mapped conversation entities
   */
  map_conversations(json) {
    return json.map((conversation) => this._create_conversation_et(conversation));
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
   * @param {Object} self - Conversation self data
   * @returns {Conversation} Updated conversation entity
   */
  update_self_status(conversation_et, self) {
    if (conversation_et) {
      if (self.ephemeral_timer !== undefined) {
        conversation_et.ephemeral_timer(self.ephemeral_timer);
      }

      if (self.status !== undefined) {
        conversation_et.status(self.status);
      }

      if (self.last_event_timestamp) {
        conversation_et.set_timestamp(self.last_event_timestamp, z.conversation.ConversationUpdateType.LAST_EVENT_TIMESTAMP);
      }

      if (self.archived_timestamp) {
        conversation_et.set_timestamp(self.archived_timestamp, z.conversation.ConversationUpdateType.ARCHIVED_TIMESTAMP);
        conversation_et.archived_state(self.archived_state);
      }

      if (self.cleared_timestamp) {
        conversation_et.set_timestamp(self.cleared_timestamp, z.conversation.ConversationUpdateType.CLEARED_TIMESTAMP);
      }

      if (self.last_read_timestamp) {
        conversation_et.set_timestamp(self.last_read_timestamp, z.conversation.ConversationUpdateType.LAST_READ_TIMESTAMP);
      }

      if (self.muted_timestamp) {
        conversation_et.set_timestamp(self.muted_timestamp, z.conversation.ConversationUpdateType.MUTED_TIMESTAMP);
        conversation_et.muted_state(self.muted_state);
      }

      if (self.verification_state) {
        conversation_et.verification_state(self.verification_state);
      }

      // Backend states
      if (self.otr_archived !== undefined) {
        const otr_archived_timestamp = new Date(self.otr_archived_ref).getTime();
        conversation_et.set_timestamp(otr_archived_timestamp, z.conversation.ConversationUpdateType.ARCHIVED_TIMESTAMP);
        conversation_et.archived_state(self.otr_archived);
      }

      if (self.otr_muted !== undefined) {
        const otr_muted_timestamp = new Date(self.otr_muted_ref).getTime();
        conversation_et.set_timestamp(otr_muted_timestamp, z.conversation.ConversationUpdateType.MUTED_TIMESTAMP);
        conversation_et.muted_state(self.otr_muted);
      }

      return conversation_et;
    }
  }

  /**
   * Creates a conversation entity from backend JSON data.
   *
   * @private
   * @param {Object} conversation_data - Either locally stored or backend data
   * @returns {Conversation} Mapped conversation entity
   */
  _create_conversation_et(conversation_data) {
    if (conversation_data === undefined) {
      throw new Error('Cannot create conversation entity without data');
    }

    const {creator, id, members, name, others, type} = conversation_data;
    let conversation_et = new z.entity.Conversation(id);

    conversation_et.creator = creator;
    conversation_et.type(type);
    conversation_et.name(name ? name : '');

    if (members) {
      conversation_et = this.update_self_status(conversation_et, members.self);
    } else {
      conversation_et = this.update_self_status(conversation_et, conversation_data);
    }

    if (!conversation_et.last_event_timestamp()) {
      conversation_et.last_event_timestamp(Date.now());
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

    if (conversation_data.team_id) {
      conversation_et.team_id = conversation_data.team_id; // data from IndexedDB
    } else if (conversation_data.team) {
      conversation_et.team_id = conversation_data.team; // data from backend
    }

    if (conversation_data.is_guest) {
      conversation_et.is_guest = conversation_data.is_guest;
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
    return remote.map(function(remote_conversation, index) {
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

      if (!local_conversation.last_event_timestamp) {
        // This should ensure a proper order
        local_conversation.last_event_timestamp = index + 1;
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
