import {ConversationStatus} from '../../conversation/ConversationStatus';
import {ConversationVerificationState} from '../../conversation/ConversationVerificationState';
import {
  DefaultConversationRoleName,
  CONVERSATION_ACCESS,
  CONVERSATION_ACCESS_ROLE,
  CONVERSATION_TYPE,
} from '@wireapp/api-client/src/conversation';
import {Confirmation, LegalHoldStatus} from '@wireapp/protocol-messaging';

export interface ConversationRecord {
  accessModes: CONVERSATION_ACCESS[];
  accessRole: CONVERSATION_ACCESS_ROLE;
  archived_state: boolean;
  archived_timestamp: number;
  cleared_timestamp: number;
  creator: string;
  ephemeral_timer: number;
  global_message_timer: number;
  id: string;
  is_guest: boolean;
  is_managed: boolean;
  last_event_timestamp: number;
  last_read_timestamp: number;
  last_server_timestamp: number;
  legal_hold_status: LegalHoldStatus;
  muted_state: boolean | number;
  muted_timestamp: number;
  name: string;
  others: string[];
  receipt_mode?: Confirmation.Type;
  roles: {[userId: string]: DefaultConversationRoleName | string};
  status: ConversationStatus;
  team_id: string;
  type: CONVERSATION_TYPE;
  verification_state: ConversationVerificationState;
}
