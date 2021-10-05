import mitt from 'mitt';
import type {QualifiedId} from '@wireapp/api-client/src/user/';

type Events = {
  'conversation.asset.cancel': string;
  'conversation.create_group': unknown;
  'conversation.debug': unknown;
  'conversation.delete': QualifiedId;
  'conversation.detail_view.show': unknown;
  'conversation.ephemeral_message_timeout': unknown;
  'conversation.event_from_backend': unknown;
  'conversation.image.send': unknown;
  'conversation.insert_calling_message': unknown;
  'conversation.insert_legal_hold_message': unknown;
  'conversation.join': unknown;
  'conversation.map_connection': unknown;
  'conversation.message.added': unknown;
  'conversation.message.edit': unknown;
  'conversation.message.removed': unknown;
  'conversation.message.reply': unknown;
  'conversation.message.updated': unknown;
  'conversation.people.hide': unknown;
  'conversation.persist_state': unknown;
  'conversation.show': unknown;
  'conversation.verification_state_changed': unknown;
  'conversation.missed_events': unknown;
};

export const emitter = mitt<Events>();
