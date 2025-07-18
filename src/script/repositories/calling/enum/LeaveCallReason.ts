/*
 * Wire
 * Copyright (C) 2022 Wire Swiss GmbH
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

export enum LEAVE_CALL_REASON {
  USER_TURNED_UNVERIFIED = 'user_turned_unverified',
  REMOTE_KICK = 'remote_kick',
  ELECTRON_TRAY_MENU_MESSAGE = 'electron_tray_menu_message',
  MEDIA_STREAM_ERROR = 'media_stream_error',
  MANUAL_LEAVE_TO_JOIN_ANOTHER_CALL = 'manual_leave_to_join_another_call',
  MANUAL_LEAVE_BY_UI_CLICK = 'manual_leave_by_ui_click',
  USER_MANUALY_LEFT_CONVERSATION = 'user_manualy_left_conversation',
  USER_IS_REMOVED_BY_AN_ADMIN_OR_LEFT_ON_ANOTHER_CLIENT = 'user_is_removed_by_an_admin_or_left_on_another_client',
  ABORTED_BECAUSE_FAILED_TO_UPDATE_MISSING_CLIENTS = 'abort_failed_to_update_missing_clients',
  ABORTED_BECAUSE_FAILED_TO_SEND_CALLING_MESSAGE = 'abort_failed_to_update_missing_clients',
  ABORTED_BECAUSE_USER_CANCELLED_MESSAGE_SENDING_BECAUSE_OF_A_DEGRADATION_WARNING = 'abort_failed_because_user_cancelled_message_sending_because_of_a_degradation_warning',
  CONVERSATION_DEGRADED = 'conversation_degraded',
}
