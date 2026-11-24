/*
 * Wire
 * Copyright (C) 2026 Wire Swiss GmbH
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

import type {REASON as AVS_REASON} from '@wireapp/avs';
import type {Asset, LegalHoldStatus} from '@wireapp/protocol-messaging';

import {MemberLeaveReason} from '../../../apiClient/conversation/data/conversationMemberLeaveData';
import {CONVERSATION_EVENT} from '../../../apiClient/event/conversationEvent';
import type {QualifiedId} from '../../../apiClient/user/qualifiedId';
import {AddUsersFailure} from '../../../core/conversation';
import {MultiPartContent} from '../../../core/conversation/content';
import {ReactionType} from '../../../core/conversation/reactionType';
import {E2EIVerificationMessageType} from '../../../message/e2eiVerificationMessageType';
import {StatusType} from '../../../message/statusType';
import {VerificationMessageType} from '../../../message/verificationMessageType';
import {AssetTransferState} from '../../assets/assetTransferState';
import {CONVERSATION} from '../../event/Client';
// eslint-disable-next-line import/no-deprecated
import type {ReactionMap, ReadReceipt, UserReactionMap} from '../../storage/record/eventRecordTypes';

export interface BaseEvent {
  conversation: string;
  data?: unknown;
  from: string;
  id: string;
  from_client_id?: string;
  qualified_conversation?: QualifiedId;
  qualified_from?: QualifiedId;
  server_time?: string;
  time: string;
}

export interface ConversationEvent<Type extends CONVERSATION | CONVERSATION_EVENT, Data = undefined> extends BaseEvent {
  data: Data;
  type: Type;
}

export interface BackendEventMessage<Type, Data> extends Omit<BaseEvent, 'id'> {
  data: Data;
  id?: string;
  type: Type;
}

export type VoiceChannelActivateEvent = ConversationEvent<CONVERSATION.VOICE_CHANNEL_ACTIVATE> & {
  protocol_version: number;
};
export type VoiceChannelDeactivateEvent = ConversationEvent<
  CONVERSATION.VOICE_CHANNEL_DEACTIVATE,
  {duration: number; reason: AVS_REASON}
> & {
  protocol_version: number;
};

export type AllVerifiedEventData = {type: VerificationMessageType.VERIFIED};
export type AllVerifiedEvent = ConversationEvent<CONVERSATION.VERIFICATION, AllVerifiedEventData>;
export type OneToOneMigratedToMlsEvent = ConversationEvent<CONVERSATION.ONE2ONE_MIGRATED_TO_MLS>;
export type AssetAddEvent = ConversationEvent<
  CONVERSATION.ASSET_ADD,
  {
    expects_read_confirmation?: boolean;
    key?: string;
    preview_key?: string;
    info?: {
      name: string;
    };
    content_type: string;
    content_length: number;
    status: AssetTransferState;
    reason?: Asset.NotUploaded | AssetTransferState;
  }
>;

export type DegradedMessageEventData = {type: VerificationMessageType; userIds: QualifiedId[]};
export type DegradedMessageEvent = ConversationEvent<CONVERSATION.VERIFICATION, DegradedMessageEventData>;
export type DeleteEvent = ConversationEvent<
  CONVERSATION.MESSAGE_DELETE,
  {deleted_time: number; message_id: string; time: string}
>;
export type FederationStopEvent = ConversationEvent<CONVERSATION.FEDERATION_STOP, {domains: string[]}>;
export type GroupCreationEventData = {
  allTeamMembers: boolean;
  name: string;
  userIds: QualifiedId[];
};
export type GroupCreationEvent = ConversationEvent<CONVERSATION.GROUP_CREATION, GroupCreationEventData>;
export type LegalHoldMessageEvent = ConversationEvent<
  CONVERSATION.LEGAL_HOLD_UPDATE,
  {legal_hold_status: LegalHoldStatus}
>;
export type MemberJoinEvent = BackendEventMessage<
  CONVERSATION_EVENT.MEMBER_JOIN,
  {qualified_user_ids?: QualifiedId[]; user_ids: string[]}
>;
export type MemberLeaveEvent = BackendEventMessage<
  CONVERSATION_EVENT.MEMBER_LEAVE,
  {
    name?: string;
    qualified_user_ids?: QualifiedId[];
    reason?: MemberLeaveReason;
    user_ids: string[];
  }
>;

export type QuoteData =
  | string
  | {
      message_id: string;
      user_id: string;
      hash: Uint8Array;
    }
  | {error: {type: string}};

interface MessageAddMetadata {
  /** who have received/read the event */
  read_receipts?: ReadReceipt[];
  /** who reacted to the event */
  // eslint-disable-next-line import/no-deprecated
  reactions?: UserReactionMap | ReactionMap;
  edited_time?: string;
  status: StatusType;
  version?: number;
}

export type MessageAddEvent = ConversationEvent<
  CONVERSATION.MESSAGE_ADD,
  {
    sender: string;
    content: string;
    replacing_message_id?: string;
    previews?: string[];
    expects_read_confirmation?: boolean;
    mentions?: string[];
    quote?: QuoteData;
    /** @deprecated this was legacy field for the text content */
    message?: string;
    /** @deprecated this was legacy field for the conversationId */
    id?: string;
  }
> &
  MessageAddMetadata;

export type MultipartMessageAddEvent = ConversationEvent<
  CONVERSATION.MULTIPART_MESSAGE_ADD,
  {
    attachments: MultiPartContent['attachments'];
    text: {
      content: string;
      mentions?: string[];
      previews?: string[];
      quote?: QuoteData;
    };
    replacing_message_id?: string;
    expects_read_confirmation?: boolean;
  }
> &
  MessageAddMetadata;

export type SessionResetEvent = BaseEvent & {id: string; type: CONVERSATION.SESSION_RESET};

export type MissedEvent = BaseEvent & {id: string; type: CONVERSATION.MISSED_MESSAGES};
export type JoinedAfterMLSMigrationFinalisationEvent = BaseEvent & {
  type: CONVERSATION.JOINED_AFTER_MLS_MIGRATION;
};
export type MLSMigrationFinalisationOngoingCallEvent = BaseEvent & {
  type: CONVERSATION.MLS_MIGRATION_ONGOING_CALL;
};
export type MLSConversationRecoveredEvent = BaseEvent & {id: string; type: CONVERSATION.MLS_CONVERSATION_RECOVERED};
export type OneToOneCreationEvent = ConversationEvent<CONVERSATION.ONE2ONE_CREATION, {userIds: QualifiedId[]}>;
export type TeamMemberLeaveEvent = Omit<MemberLeaveEvent, 'type'> & {
  type: CONVERSATION.TEAM_MEMBER_LEAVE;
};
export type ReactionEvent = ConversationEvent<CONVERSATION.REACTION, {message_id: string; reaction: ReactionType}>;
export type MessageHiddenEvent = ConversationEvent<
  CONVERSATION.MESSAGE_HIDDEN,
  {conversation_id: string; message_id: string}
>;
export type ConfirmationEvent = ConversationEvent<
  CONVERSATION.CONFIRMATION,
  {
    message_id: string;
    more_message_ids: string[];
    status: StatusType;
  }
>;
export type ButtonActionConfirmationEvent = ConversationEvent<
  CONVERSATION.BUTTON_ACTION_CONFIRMATION,
  {buttonId: string; messageId: string}
>;
export type ButtonActionEvent = ConversationEvent<CONVERSATION.BUTTON_ACTION, {buttonId: string; messageId: string}>;
export type DeleteEverywhereEvent = ConversationEvent<
  CONVERSATION.DELETE_EVERYWHERE,
  {
    deleted_time: string;
  }
>;
export type CompositeMessageAddEvent = ConversationEvent<
  CONVERSATION.COMPOSITE_MESSAGE_ADD,
  {
    items: {button: {id: string; text: string}; text: MessageAddEvent['data']}[];
    replacing_message_id?: string;
    expects_read_confirmation?: boolean;
  }
> &
  MessageAddMetadata;

export type IncomingMessageTooBigEvent = ConversationEvent<CONVERSATION.INCOMING_MESSAGE_TOO_BIG>;
export type KnockEvent = ConversationEvent<
  CONVERSATION.KNOCK,
  {
    expects_read_confirmation?: boolean;
  }
>;
export type LocationEvent = ConversationEvent<
  CONVERSATION.LOCATION,
  {
    expects_read_confirmation?: boolean;
  }
>;
export type UnableToDecryptEvent = ConversationEvent<CONVERSATION.UNABLE_TO_DECRYPT>;
export type VerificationEvent = ConversationEvent<CONVERSATION.VERIFICATION>;
export type FileTypeRestrictedEvent = ConversationEvent<
  CONVERSATION.FILE_TYPE_RESTRICTED,
  {fileExt: string; isIncoming: boolean; name: string}
>;
export type MemberRoleUpdateEvent = ConversationEvent<
  CONVERSATION.MEMBER_ROLE_UPDATE,
  {conversation_role: string; user_id: QualifiedId}
>;
export type CallingTimeoutEvent = ConversationEvent<
  CONVERSATION.CALL_TIME_OUT,
  {reason: AVS_REASON.NOONE_JOINED | AVS_REASON.EVERYONE_LEFT}
>;
export type FailedToAddUsersMessageEvent = ConversationEvent<CONVERSATION.FAILED_TO_ADD_USERS, AddUsersFailure[]>;

export interface ErrorEvent extends ConversationEvent<
  CONVERSATION.UNABLE_TO_DECRYPT | CONVERSATION.INCOMING_MESSAGE_TOO_BIG
> {
  error: string;
  error_code: number | string;
  id: string;
}

// E2EI Verification Events
export type E2EIVerificationEventData = {type: E2EIVerificationMessageType; userIds?: QualifiedId[]};
export type E2EIVerificationEvent = ConversationEvent<CONVERSATION.E2EI_VERIFICATION, E2EIVerificationEventData>;

export type ClientConversationEvent =
  | AllVerifiedEvent
  | E2EIVerificationEvent
  | AssetAddEvent
  | ErrorEvent
  | CompositeMessageAddEvent
  | ConfirmationEvent
  | FederationStopEvent
  | DeleteEvent
  | DeleteEverywhereEvent
  | DegradedMessageEvent
  | ButtonActionConfirmationEvent
  | ButtonActionEvent
  | KnockEvent
  | IncomingMessageTooBigEvent
  | GroupCreationEvent
  | TeamMemberLeaveEvent
  | ReactionEvent
  | LegalHoldMessageEvent
  | MessageAddEvent
  | MessageHiddenEvent
  | MemberLeaveEvent
  | MemberJoinEvent
  | OneToOneCreationEvent
  | OneToOneMigratedToMlsEvent
  | VoiceChannelDeactivateEvent
  | FileTypeRestrictedEvent
  | MemberRoleUpdateEvent
  | CallingTimeoutEvent
  | FailedToAddUsersMessageEvent
  | UnableToDecryptEvent
  | MissedEvent
  | SessionResetEvent
  | JoinedAfterMLSMigrationFinalisationEvent
  | MLSMigrationFinalisationOngoingCallEvent
  | MLSConversationRecoveredEvent
  | LocationEvent
  | VoiceChannelActivateEvent
  | VerificationEvent
  | MultipartMessageAddEvent;
