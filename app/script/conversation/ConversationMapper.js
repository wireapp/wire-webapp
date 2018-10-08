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

// @ts-check

'use strict';

/**
 * @typedef {object} ConversationBackendData
 * @property {string[]=} access
 * @property {string=} access_role
 * @property {string=} creator
 * @property {string=} id
 * @property {string=} last_event
 * @property {string=} last_event_time
 * @property {ConversationMembers=} members
 * @property {number=} message_timer
 * @property {string=} name
 * @property {string=} team
 * @property {number} type
 */

/**
 * @typedef {object} ConversationMembers
 * @property {OtherMember[]} others
 * @property {Member} self
 */

/**
 * @typedef {object} Member
 * @property {string=} hidden_ref
 * @property {boolean=} hidden
 * @property {string=} id
 * @property {string=} otr_archived_ref
 * @property {boolean=} otr_archived
 * @property {string=} otr_muted_ref
 * @property {boolean=} otr_muted
 * @property {ServiceRef=} service
 */

/**
 * @typedef {object} OtherMember
 * @property {string} id
 * @property {number} status
 */

/**
 * @typedef {object} SelfStatusUpdate
 * @property {number=} archived_timestamp
 * @property {number=} cleared_timestamp
 * @property {number=} ephemeral_timer
 * @property {number=} message_timer
 * @property {number=} last_event_timestamp
 * @property {number=} last_read_timestamp
 * @property {number=} last_server_timestamp
 * @property {boolean=} otr_archived
 * @property {string=} otr_archived_ref
 * @property {boolean=} otr_muted
 * @property {string=} otr_muted_ref
 * @property {boolean=} muted_state
 * @property {number=} status
 * @property {number=} verification_state
 */

/**
 * @typedef {object} ServiceRef
 * @property {string} id
 * @property {string} provider
 */

window.z = window.z || {};
window.z.conversation = z.conversation || {};

// Conversation Mapper to convert all server side JSON conversation objects into core entities.
z.conversation.ConversationMapper = class ConversationMapper {
  // Construct a new Conversation Mapper.
  constructor() {
    this.logger = new z.util.Logger('z.conversation.ConversationMapper', z.config.LOGGER.OPTIONS);
  }

  /**
   * Converts JSON conversations into conversation entities.
   *
   * @param {Array} conversationsData - Conversation data
   * @param {boolean} isProAccount - Type of account for state mapping
   * @param {number} [timestamp=1] - Initial timestamp for conversation
   * @returns {Array<Conversation>} Mapped conversation entities
   */
  mapConversations(conversationsData, isProAccount, timestamp = 1) {
    if (conversationsData === undefined) {
      throw new z.conversation.ConversationError(z.conversation.ConversationError.TYPE.MISSING_PARAMETER);
    }
    if (!_.isArray(conversationsData) || !conversationsData.length) {
      throw new z.conversation.ConversationError(z.conversation.ConversationError.TYPE.INVALID_PARAMETER);
    }
    return conversationsData.map((conversationData, index) => {
      return this._createConversationEntity(conversationData, timestamp + index, isProAccount);
    });
  }

  /**
   * Updates all properties of a conversation specified.
   *
   * @example data: {"name":"ThisIsMyNewConversationName"}
   * @todo make utility?
   *
   * @param {Conversation} conversationEntity - Conversation to be updated
   * @param {ConversationBackendData} conversationData - Conversation data from backend
   * @returns {Conversation} Updated conversation entity
   */
  updateProperties(conversationEntity, conversationData) {
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

  /**
   * Update the membership properties of a conversation.
   *
   * @param {Conversation} conversationEntity - Conversation to be updated
   * @param {SelfStatusUpdate} selfState - Conversation self data from the database
   * @param {boolean} [isProAccount] - Type of account for state migration
   * @param {boolean} [disablePersistence=false] - Disable persistence of state changes during update
   * @returns {Conversation} Updated conversation entity
   */
  updateSelfStatus(conversationEntity, selfState, isProAccount, disablePersistence = false) {
    if (conversationEntity) {
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
        notification_timestamp,
        status,
        verification_state,
      } = selfState;

      if (archived_timestamp) {
        conversationEntity.setTimestamp(archived_timestamp, z.entity.Conversation.TIMESTAMP_TYPE.ARCHIVED);
        conversationEntity.archivedState(selfState.archived_state);
      }

      if (cleared_timestamp !== undefined) {
        conversationEntity.setTimestamp(cleared_timestamp, z.entity.Conversation.TIMESTAMP_TYPE.CLEARED, true);
      }

      if (ephemeral_timer !== undefined) {
        conversationEntity.localMessageTimer(ephemeral_timer);
      }

      if (message_timer !== undefined) {
        conversationEntity.globalMessageTimer(message_timer);
      }

      if (last_event_timestamp) {
        conversationEntity.setTimestamp(last_event_timestamp, z.entity.Conversation.TIMESTAMP_TYPE.LAST_EVENT);
      }

      if (last_read_timestamp) {
        conversationEntity.setTimestamp(last_read_timestamp, z.entity.Conversation.TIMESTAMP_TYPE.LAST_READ);
      }

      if (last_server_timestamp) {
        conversationEntity.setTimestamp(last_server_timestamp, z.entity.Conversation.TIMESTAMP_TYPE.LAST_SERVER);
      }

      if (notification_timestamp) {
        conversationEntity.setTimestamp(notification_timestamp, z.entity.Conversation.TIMESTAMP_TYPE.NOTIFICATION);
        const notiticationState = this.getNotificationState(selfState.notification_state);
        conversationEntity.notificationState(notiticationState);
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
        const archivedTimestamp = new Date(selfState.otr_archived_ref).getTime();
        conversationEntity.setTimestamp(archivedTimestamp, z.entity.Conversation.TIMESTAMP_TYPE.ARCHIVED);
        conversationEntity.archivedState(otr_archived);
      }

      if (otr_muted !== undefined) {
        const notificationTimestamp = new Date(selfState.otr_muted_ref).getTime();
        conversationEntity.setTimestamp(notificationTimestamp, z.entity.Conversation.TIMESTAMP_TYPE.NOTIFICATION);

        const notificationState = this.getNotificationState(selfState.otr_muted_status, otr_muted, isProAccount);
        conversationEntity.notificationState(notificationState);
      }

      if (disablePersistence) {
        conversationEntity.setStateChangePersistence(true);
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
   * @param {boolean} [isProAccount] - Type of account for state mapping
   * @returns {Conversation} Mapped conversation entity
   */
  _createConversationEntity(conversationData, initialTimestamp, isProAccount) {
    if (conversationData === undefined) {
      throw new z.conversation.ConversationError(z.conversation.ConversationError.TYPE.MISSING_PARAMETER);
    }
    if (!_.isObject(conversationData) || !Object.keys(conversationData).length) {
      throw new z.conversation.ConversationError(z.conversation.ConversationError.TYPE.INVALID_PARAMETER);
    }

    const {creator, id, members, name, others, type} = conversationData;
    let conversationEntity = new z.entity.Conversation(id);

    conversationEntity.creator = creator;
    conversationEntity.type(type);
    conversationEntity.name(name ? name : '');

    const selfState = members ? members.self : conversationData;
    conversationEntity = this.updateSelfStatus(conversationEntity, selfState, isProAccount);

    if (!conversationEntity.last_event_timestamp() && initialTimestamp) {
      conversationEntity.last_event_timestamp(initialTimestamp);
      conversationEntity.last_server_timestamp(initialTimestamp);
    }

    // Active participants from database or backend payload
    const participatingUserIds = others ? others : members.others.map(other => other.id);
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

    return conversationEntity;
  }

  /**
   * Get the valid notification state.
   *
   * @param {z.conversation.NotificationSetting.STATE} [notificationState] - Bit mask based notification setting
   * @param {boolean} [deprecatedMutedState] - Outdated muted state
   * @param {boolean} [isProAccount=false] - Type of account for default state migration
   * @returns {z.conversation.NotificationSetting.STATE} validated notification setting
   */
  getNotificationState(notificationState, deprecatedMutedState, isProAccount = false) {
    const validNotifcationState = Object.values(z.conversation.NotificationSetting.STATE);
    if (!validNotifcationState.includes(notificationState)) {
      const migratedMutedState = isProAccount
        ? z.conversation.NotificationSetting.STATE.ONLY_MENTIONS
        : z.conversation.NotificationSetting.STATE.NOTHING;
      return deprecatedMutedState ? migratedMutedState : z.conversation.NotificationSetting.STATE.EVERYTHING;
    }

    if (deprecatedMutedState !== undefined) {
      // Ensure bit at offset 0 to be 1 for backwards compatibility of deprecated boolean based state is true
      return deprecatedMutedState ? notificationState | 0b1 : z.conversation.NotificationSetting.STATE.EVERYTHING;
    }

    return notificationState;
  }

  /**
   * Merge local database records with remote backend payload.
   *
   * @param {Array<Object>} localConversations - Database records
   * @param {Array<Object>} remoteConversations - Backend payload
   * @param {boolean} isProAccount - Type of account for state mapping
   * @returns {Array<Object>} Merged conversation data
   */
  mergeConversation(localConversations, remoteConversations, isProAccount) {
    localConversations = localConversations.filter(conversationData => conversationData);

    return remoteConversations.map((remoteConversationData, index) => {
      const conversationId = remoteConversationData.id;
      const localConversationData = localConversations.find(({id}) => id === conversationId) || {id: conversationId};

      const {access, access_role, creator, members, message_timer, name, team, type} = remoteConversationData;
      const {others: othersStates, self: selfState} = members;

      const updates = {
        accessModes: access,
        accessRole: access_role,
        creator,
        message_timer,
        name,
        status: selfState.status,
        team_id: team,
        type,
      };
      const mergedConversation = Object.assign({}, localConversationData, updates);

      const isGroup = type === z.conversation.ConversationType.GROUP;
      const noOthers = !mergedConversation.others || !mergedConversation.others.length;
      if (isGroup || noOthers) {
        mergedConversation.others = othersStates
          .filter(otherState => otherState.status === z.conversation.ConversationStatus.CURRENT_MEMBER)
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

      const isRemoteTimestampNewer = (localTimestamp, remoteTimestamp) => {
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

      const {
        notification_state: notificationState,
        notification_timestamp: notificationTimestamp,
      } = localConversationData;
      const remoteMutedTimestamp = new Date(selfState.otr_muted_ref).getTime();
      const isRemoteMutedTimestampNewer = isRemoteTimestampNewer(notificationTimestamp, remoteMutedTimestamp);

      if (isRemoteMutedTimestampNewer || notificationState === undefined) {
        const {otr_muted, otr_muted_status} = selfState;
        const notificationStatus = this.getNotificationState(otr_muted_status, otr_muted, isProAccount);
        mergedConversation.notification_state = notificationStatus;
        mergedConversation.notification_timestamp = remoteMutedTimestamp;
      }

      return mergedConversation;
    });
  }

  migrateConversationsData(conversationsDate, isProAccount) {
    return conversationsDate.map(conversationData => {
      const {muted_state, muted_timestamp} = conversationData;
      conversationData.notification_timestamp = muted_timestamp;
      conversationData.notification_state = this.getNotificationState(undefined, muted_state, isProAccount);

      delete conversationData.muted_state;
      delete conversationData.muted_timestamp;

      return conversationData;
    });
  }

  mapAccessCode(conversationEntity, accessCode) {
    const {code, key, uri} = accessCode;
    const isTeamConversation = conversationEntity && conversationEntity.team_id;

    if (uri && isTeamConversation) {
      if (z.util.Environment.frontend.isInternal()) {
        const accessLink = `${z.config.URL.WEBAPP.INTERNAL}/join/?key=${key}&code=${code}`;
        return conversationEntity.accessCode(accessLink);
      }

      conversationEntity.accessCode(uri);
    }
  }

  mapAccessState(conversationEntity, accessModes, accessRole) {
    if (conversationEntity.team_id) {
      if (conversationEntity.is_one2one()) {
        return conversationEntity.accessState(z.conversation.ACCESS_STATE.TEAM.ONE2ONE);
      }

      const isTeamRole = accessRole === z.conversation.ACCESS_ROLE.TEAM;

      const includesInviteMode = accessModes.includes(z.conversation.ACCESS_MODE.INVITE);
      const isInviteModeOnly = includesInviteMode && accessModes.length === 1;

      const isTeamOnlyMode = isTeamRole && isInviteModeOnly;
      if (isTeamOnlyMode) {
        return conversationEntity.accessState(z.conversation.ACCESS_STATE.TEAM.TEAM_ONLY);
      }

      const isNonVerifiedRole = accessRole === z.conversation.ACCESS_ROLE.NON_ACTIVATED;

      const includesCodeMode = accessModes.includes(z.conversation.ACCESS_MODE.CODE);
      const isExpectedModes = includesCodeMode && includesInviteMode && accessModes.length === 2;

      const isGuestRoomMode = isNonVerifiedRole && isExpectedModes;
      return isGuestRoomMode
        ? conversationEntity.accessState(z.conversation.ACCESS_STATE.TEAM.GUEST_ROOM)
        : conversationEntity.accessState(z.conversation.ACCESS_STATE.TEAM.LEGACY);
    }

    if (conversationEntity.is_self()) {
      return conversationEntity.accessState(z.conversation.ACCESS_STATE.SELF);
    }

    const personalAccessState = conversationEntity.isGroup()
      ? z.conversation.ACCESS_STATE.PERSONAL.GROUP
      : z.conversation.ACCESS_STATE.PERSONAL.ONE2ONE;
    return conversationEntity.accessState(personalAccessState);
  }
};
