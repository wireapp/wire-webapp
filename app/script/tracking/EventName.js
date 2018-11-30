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

window.z = window.z || {};
window.z.tracking = z.tracking || {};

/**
 * Definition of events used for user analytics.
 * @returns {z.tracking.EventName} Event names (defined by Business Intelligence Team)
 */
z.tracking.EventName = {
  CALLING: {
    ENDED_CALL: 'calling.ended_call',
    ENDED_VIDEO_CALL: 'calling.ended_video_call',
    ESTABLISHED_CALL: 'calling.established_call',
    ESTABLISHED_VIDEO_CALL: 'calling.established_video_call',
    FAILED_REQUEST: 'calling.failed_request',
    FAILED_REQUESTING_MEDIA: 'calling.failed_requesting_media',
    FAILED_RTC: 'calling.failed_rtc',
    INITIATED_CALL: 'calling.initiated_call',
    INITIATED_VIDEO_CALL: 'calling.initiated_video_call',
    JOINED_CALL: 'calling.joined_call',
    JOINED_VIDEO_CALL: 'calling.joined_video_call',
    RECEIVED_CALL: 'calling.received_call',
    RECEIVED_VIDEO_CALL: 'calling.received_video_call',
    SHARED_SCREEN: 'calling.shared_screen',
  },
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
