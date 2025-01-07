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
  APP_OPEN: 'app.open',
  CALLING: {
    ENDED_CALL: 'calling.ended_call',
    ESTABLISHED_CALL: 'calling.established_call',
    INITIATED_CALL: 'calling.initiated_call',
    JOINED_CALL: 'calling.joined_call',
    RECEIVED_CALL: 'calling.received_call',
    SCREEN_SHARE: 'calling.screen_share',
    QUALITY_REVIEW: 'calling.call_quality_review',
    PRESS_SPACE_TO_UNMUTE: 'calling.press_space_to_unmute',
  },
  CONTRIBUTED: 'contributed',
  E2EE: {
    FAILED_MESSAGE_DECRYPTION: 'e2ee.failed_message_decryption',
  },
  UI: {
    CALLING_UI_SIZE: 'ui.calling_ui_size',
    SIDEBAR_COLLAPSE: 'ui.sidebar_collapse',
    SIDEBAR_UNCOLLAPSE: 'ui.sidebar_uncollapse',
    CLICKED: {
      SETTINGS_MIGRATION: 'ui.clicked_settings_migration',
      PERSONAL_MIGRATION_CTA: 'ui.clicked_personal_migration_cta',
    },
  },
  USER: {
    PERSONAL_TEAM_CREATION: {
      FLOW_STARTED: 'user.personal_team_creation_flow_started',
      FLOW_STOPPED: 'user.personal_team_creation_flow_stopped',
      FLOW_CANCELLED: 'user.personal_team_creation_flow_cancelled',
      FLOW_COMPLETED: 'user.personal_team_creation_flow_completed',
    },
  },
  MESSAGES: {
    VIDEO: {
      PLAY_SUCCESS: 'messages.video.play_success',
      PLAY_FAILED: 'messages.video.play_failed',
      UNSUPPORTED_MIME_TYPE: 'messages.video.unsupported_mime_type',
      UNPLAYABLE_ERROR: 'messages.video.unplayable_error',
    },
  },
  HISTORY: {
    BACKUP_CREATED: 'history.backup_created',
    BACKUP_CANCELLED: 'history.backup_cancelled',
  },
  INPUT: {
    FORMAT_TEXT: {
      ENABLED: 'input.rich_text_editor.enabled',
      DISABLED: 'input.rich_text_editor.disabled',
    },
    EMOJI_MODAL: {
      EMOJI_PICKED: 'input.emoji_modal.emoji_picked',
    },
  },
};
