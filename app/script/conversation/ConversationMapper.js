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
   * Converts JSON conversations into conversation entities.
   *
   * @param {Array} [conversations=[undefined]] - Conversation data
   * @param {number} [timestamp=1] - Initial timestamp for conversation
   * @returns {Array<Conversation>} Mapped conversation entities
   */
  mapConversations(conversations = [undefined], timestamp = 1) {
    return conversations.map((conversation, index) => this._createConversationEntity(conversation, timestamp + index));
  }

  /**
   * Updates all properties of a conversation specified
   *
   * @example data: {"name":"ThisIsMyNewConversationName"}
   * @todo make utility?
   *
   * @param {Conversation} conversationEntity - Conversation to be updated
   * @param {Object} conversationData - Conversation data
   * @returns {Conversation} Updated conversation entity
   */
  updateProperties(conversationEntity, conversationData) {
    for (const key in conversationData) {
      if (key !== 'id' && conversationEntity.hasOwnProperty(key)) {
        const value = conversationData[key];

        if (value !== undefined) {
          if (ko.isObservable(conversationEntity[key])) {
            conversationEntity[key](value);
          } else {
            conversationEntity[key] = value;
          }
        }
      }
    }

    return conversationEntity;
  }

  /**
   * Update the membership properties of a conversation.
   *
   * @param {Conversation} conversationEntity - Conversation to be updated
   * @param {Object} selfState - Conversation self data
   * @returns {Conversation} Updated conversation entity
   */
  updateSelfStatus(conversationEntity, selfState) {
    if (conversationEntity) {
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
      } = selfState;

      if (archived_timestamp) {
        conversationEntity.set_timestamp(archived_timestamp, z.conversation.TIMESTAMP_TYPE.ARCHIVED);
        conversationEntity.archived_state(selfState.archived_state);
      }

      if (cleared_timestamp) {
        conversationEntity.set_timestamp(cleared_timestamp, z.conversation.TIMESTAMP_TYPE.CLEARED);
      }

      if (ephemeral_timer !== undefined) {
        conversationEntity.ephemeral_timer(ephemeral_timer);
      }

      if (last_event_timestamp) {
        conversationEntity.set_timestamp(last_event_timestamp, z.conversation.TIMESTAMP_TYPE.LAST_EVENT);
      }

      if (last_read_timestamp) {
        conversationEntity.set_timestamp(last_read_timestamp, z.conversation.TIMESTAMP_TYPE.LAST_READ);
      }

      if (last_server_timestamp) {
        conversationEntity.set_timestamp(last_server_timestamp, z.conversation.TIMESTAMP_TYPE.LAST_SERVER);
      }

      if (muted_timestamp) {
        conversationEntity.set_timestamp(muted_timestamp, z.conversation.TIMESTAMP_TYPE.MUTED);
        conversationEntity.muted_state(selfState.muted_state);
      }

      if (status !== undefined) {
        conversationEntity.status(status);
      }

      if (verification_state !== undefined) {
        conversationEntity.verification_state(verification_state);
      }

      // Backend states
      const {otr_archived, otr_muted} = selfState;

      if (otr_archived !== undefined) {
        const otr_archived_timestamp = new Date(selfState.otr_archived_ref).getTime();
        conversationEntity.set_timestamp(otr_archived_timestamp, z.conversation.TIMESTAMP_TYPE.ARCHIVED);
        conversationEntity.archived_state(otr_archived);
      }

      if (otr_muted !== undefined) {
        const otr_muted_timestamp = new Date(selfState.otr_muted_ref).getTime();
        conversationEntity.set_timestamp(otr_muted_timestamp, z.conversation.TIMESTAMP_TYPE.MUTED);
        conversationEntity.muted_state(otr_muted);
      }

      return conversationEntity;
    }
  }

  /**
   * Creates a conversation entity from backend JSON data.
   *
   * @private
   * @param {Object} conversationData - Either locally stored or backend data
   * @param {number} [initialTimestamp] - Initial timestamp for conversation in milliseconds
   * @returns {Conversation} Mapped conversation entity
   */
  _createConversationEntity(conversationData, initialTimestamp) {
    if (conversationData === undefined || !Object.keys(conversationData).length) {
      throw new Error('Cannot create conversation entity without data');
    }

    const {creator, id, members, name, others, type} = conversationData;
    let conversationEntity = new z.entity.Conversation(id);

    conversationEntity.creator = creator;
    conversationEntity.type(type);
    conversationEntity.name(name ? name : '');

    const selfState = members ? members.self : conversationData;
    conversationEntity = this.updateSelfStatus(conversationEntity, selfState);

    if (!conversationEntity.last_event_timestamp() && initialTimestamp) {
      conversationEntity.last_event_timestamp(initialTimestamp);
      conversationEntity.last_server_timestamp(initialTimestamp);
    }

    // Active participants from database or backend payload
    const participatingUserIds = others ? others : members.others.map(other => other.id);
    conversationEntity.participating_user_ids(participatingUserIds);

    // Team ID from database or backend payload
    const team_id = conversationData.team_id ? conversationData.team_id : conversationData.team;
    if (team_id) {
      conversationEntity.team_id = team_id;
    }

    if (conversationData.is_guest) {
      conversationEntity.is_guest(conversationData.is_guest);
    }

    return conversationEntity;
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
      let local_conversation = local.filter(conversation => conversation).find(conversation => conversation.id === id);

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
        .filter(other => other.status === z.conversation.ConversationStatus.CURRENT_MEMBER)
        .map(other => other.id);

      // This should ensure a proper order
      if (!local_conversation.last_event_timestamp) {
        local_conversation.last_event_timestamp = index + 1;
      }

      // Set initially or correct server timestamp
      const wrong_server_timestamp = local_conversation.last_server_timestamp < local_conversation.last_event_timestamp;
      if (!local_conversation.last_server_timestamp || wrong_server_timestamp) {
        local_conversation.last_server_timestamp = local_conversation.last_event_timestamp;
      }

      // Some archived timestamp were not properly stored in the database.
      // To fix this we check if the remote one is newer and update our local timestamp.
      const {archived_state: local_archived_state, archived_timestamp: local_archived_timestamp} = local_conversation;
      const remote_archived_timestamp = new Date(members.self.otr_archived_ref).getTime();
      const is_remote_archived_timestamp_newer =
        local_archived_timestamp !== undefined && remote_archived_timestamp > local_archived_timestamp;

      if (is_remote_archived_timestamp_newer || local_archived_state === undefined) {
        local_conversation.archived_state = members.self.otr_archived;
        local_conversation.archived_timestamp = remote_archived_timestamp;
      }

      const {muted_state: local_muted_state, muted_timestamp: local_muted_timestamp} = local_conversation;
      const remote_muted_timestamp = new Date(members.self.otr_muted_ref).getTime();
      const is_remote_muted_timestamp_newer =
        local_muted_timestamp !== undefined && remote_muted_timestamp > local_muted_timestamp;

      if (is_remote_muted_timestamp_newer || local_muted_state === undefined) {
        local_conversation.muted_state = members.self.otr_muted;
        local_conversation.muted_timestamp = remote_muted_timestamp;
      }

      return local_conversation;
    });
  }
};
