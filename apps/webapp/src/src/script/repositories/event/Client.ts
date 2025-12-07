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

export enum CALL {
  E_CALL = 'call.e-call',
  IN_CALL_EMOJI = 'call.in-call-emoji',
  IN_CALL_HAND_RAISE = 'call.in-call-hand-raise',
}

export enum CONVERSATION {
  ASSET_ADD = 'conversation.asset-add',
  BUTTON_ACTION_CONFIRMATION = 'conversation.button-action-confirmation',
  BUTTON_ACTION = 'conversation.button-action',
  CALL_TIME_OUT = 'conversation.call-time-out',
  FAILED_TO_ADD_USERS = 'conversation.failed-to-add-users',
  COMPOSITE_MESSAGE_ADD = 'conversation.composite-message-add',
  CONFIRMATION = 'conversation.confirmation',
  DELETE_EVERYWHERE = 'conversation.delete-everywhere',
  FILE_TYPE_RESTRICTED = 'conversation.file-type-restricted',
  GROUP_CREATION = 'conversation.group-creation',
  INCOMING_MESSAGE_TOO_BIG = 'conversation.incoming-message-too-big',
  KNOCK = 'conversation.knock',
  LEGAL_HOLD_UPDATE = 'conversation.legal-hold-update',
  LOCATION = 'conversation.location',
  MESSAGE_ADD = 'conversation.message-add',
  MULTIPART_MESSAGE_ADD = 'conversation.multipart-message-add',
  MESSAGE_DELETE = 'conversation.message-delete',
  MESSAGE_HIDDEN = 'conversation.message-hidden',
  MISSED_MESSAGES = 'conversation.missed-messages',
  JOINED_AFTER_MLS_MIGRATION = 'conversation.joined-after-mls-migration',
  MLS_MIGRATION_ONGOING_CALL = 'conversation.mls-migration-ongoing-call',
  MLS_CONVERSATION_RECOVERED = 'conversation.mls-conversation-recovered',
  ONE2ONE_CREATION = 'conversation.one2one-creation',
  REACTION = 'conversation.reaction',
  TEAM_MEMBER_LEAVE = 'conversation.team-member-leave',
  UNABLE_TO_DECRYPT = 'conversation.unable-to-decrypt',
  VERIFICATION = 'conversation.verification',
  FEDERATION_STOP = 'conversation.federation-stop',
  VOICE_CHANNEL_ACTIVATE = 'conversation.voice-channel-activate',
  VOICE_CHANNEL_DEACTIVATE = 'conversation.voice-channel-deactivate',
  E2EI_VERIFICATION = 'conversation.e2ei-verification',
  ONE2ONE_MIGRATED_TO_MLS = 'conversation.one2one-migrated-to-mls',
}

export enum USER {
  AVAILABILITY = 'user.availability',
  DATA_TRANSFER = 'user.data-transfer',
}

export const ClientEvent = {
  CALL,
  CONVERSATION,
  USER,
};
