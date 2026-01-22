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
  APP_OPEN: {
    DESKTOP_APP: 'app_desktop_app',
    APP_VERSION: 'app_version',
    OS_VERSION: 'os_version',
    IS_TEAM_MEMBER: 'is_team_member',
  },
  CALL: {
    AV_SWITCH_TOGGLE: 'call_av_switch_toggle',
    DIRECTION: 'call_direction',
    DURATION: 'call_duration',
    END_REASON: 'call_end_reason',
    PARTICIPANTS: 'call_participants',
    REASON: 'reason', // This has to be in sync with ios
    SCREEN_SHARE: 'call_screen_share',
    SCORE: 'score',
    QUALITY_REVIEW_LABEL: 'label',
    SETUP_TIME: 'call_setup_time',
    VIDEO: 'call_video',
  },
  COMMON: {
    TEAM_IS_ENTERPRISE: 'team_is_enterprise',
    TEAM_TEAM_ID: 'team_team_id',
    TEAM_TEAM_SIZE: 'team_team_size',
    TEAM_USER_TYPE: 'team_user_type',
    USER_CONTACTS: 'user_contacts',
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
  IS_RICH_TEXT: 'is_rich_text',
  SCREEN_SHARE: {
    DIRECTION: 'screen_share_direction',
    DURATION: 'screen_share_duration',
  },
  CALLING_UI_SIZE: {
    FROM: 'from',
    TO: 'to',
  },
  BACKUP_CREATION: {
    PASSWORD: 'password',
    PASSWORD_MULTIPLE_ATTEMPTS: 'password_multiple_attempts',
    CREATION_DURATION: 'creation_duration',
    CANCELLATION_STEP: {
      DURING_BACKUP: 'during_backup',
      BEFORE_BACKUP: 'before_backup',
    },
  },
  GENERAL: {
    STEP: 'step',
    YES: 'yes',
    NO: 'no',
  },
  TEAM_CREATION_STEP: {
    CLICKED_CREATE_TEAM: 'clicked_create_team',
    CLICKED_DISMISS_CTA: 'clicked_dismiss_cta',
    MODAL_DISCLAIMERS: 'modal_disclaimers',
    MODAL_TEAM_NAME: 'modal_team_name',
    MODAL_CONFIRMATION: 'modal_confirmation',
    MODAL_LEAVE_CLICKED: 'modal_leave_clicked',
    MODAL_CONTINUE_CLICKED: 'modal_continue_clicked',
    MODAL_BACK_TO_WIRE_CLICKED: 'modal_back_to_wire_clicked',
    MODAL_OPEN_TM_CLICKED: 'modal_open_tm_clicked',
  },
};
