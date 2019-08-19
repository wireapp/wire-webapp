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

/**
 * Definition of events used for user analytics (defined by Business Intelligence Team)
 */
export const EventName = {
  CONTRIBUTED: 'contributed',
  CONVERSATION: {
    ADD_PARTICIPANTS: 'conversation.add_participants',
    GROUP_CREATION_SUCCEEDED: 'conversation.group_creation_succeeded',
    OPENED_GROUP_CREATION: 'conversation.opened_group_creation',
    OPENED_SELECT_PARTICIPANTS: 'conversation.opened_select_participants',
  },
  E2EE: {
    FAILED_MESSAGE_DECRYPTION: 'e2ee.failed_message_decryption',
  },
  GUEST_ROOMS: {
    ALLOW_GUESTS: 'guest_rooms.allow_guests',
    GUEST_ROOM_CREATION: 'guest_rooms.guest_room_creation',
    LINK_COPIED: 'guest_rooms.link_copied',
    LINK_CREATED: 'guest_rooms.link_created',
    LINK_REVOKED: 'guest_rooms.link_revoked',
  },
  HISTORY: {
    BACKUP_FAILED: 'history.backup_failed',
    BACKUP_SUCCEEDED: 'history.backup_succeeded',
    RESTORE_FAILED: 'history.restore_failed',
    RESTORE_SUCCEEDED: 'history.restore_succeeded',
  },
  INTEGRATION: {
    ADDED_SERVICE: 'integration.added_service',
    REMOVED_SERVICE: 'integration.removed_service',
  },
  SETTINGS: {
    CHANGED_STATUS: 'settings.changed_status',
    OPENED_MANAGE_TEAM: 'settings.opened_manage_team',
    OPTED_IN_TRACKING: 'settings.opted_in_tracking',
    OPTED_OUT_TRACKING: 'settings.opted_out_tracking',
  },
  TELEMETRY: {
    APP_INITIALIZATION: 'telemetry.app_initialization',
  },
};
