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

export const Segmentation = {
  CALL: {
    AV_SWITCH_TOGGLE: 'call_av_switch_toggle',
    DIRECTION: 'call_direction',
    DURATION: 'call_duration',
    END_REASON: 'call_end_reason',
    PARTICIPANTS: 'call_participants',
    SCREEN_SHARE: 'call_screen_share',
    SETUP_TIME: 'call_setup_time',
    VIDEO: 'call_video',
  },
  COMMON: {
    APP: 'app_name',
    APP_VERSION: 'app_version',
    DESKTOP_APP: 'app_desktop_app',
  },
  CONVERSATION: {
    ALLOW_GUESTS: 'conversation_allow_guests',
    GUESTS: 'conversation_guests',
    GUESTS_PRO: 'conversation_guests_pro',
    GUESTS_WIRELESS: 'conversation_guests_wireless',
    SERVICES: 'conversation_services',
    SIZE: 'conversation_size',
    TYPE: 'conversation_type',
  },
  MESSAGE: {
    ACTION: 'message_action',
    EPHEMERAL_EXPIRATION: 'message_ephemeral_expiration',
    IS_EPHEMERAL_MESSAGE: 'message_is_ephemeral_message',
    IS_REPLY: 'message_is_reply',
    MENTION: 'message_mention',
  },
  SCREEN_SHARE: {
    DIRECTION: 'screen_share_direction',
    DURATION: 'screen_share_duration',
  },
};
