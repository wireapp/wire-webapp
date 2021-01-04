import Dexie from 'dexie';
import {StorageSchemata} from './StorageSchemata';
import {getLogger, Logger} from 'Util/Logger';
import {ClientRecord} from './ClientRecord';
import {DefaultConversationRoleName} from '@wireapp/api-client/src/conversation';
import {Availability} from '@wireapp/protocol-messaging';

export interface AmplifyRecord {
  value: string;
}

export interface ConversationRecord {
  accessModes: string[];
  accessRole: string;
  archived_state: boolean;
  archived_timestamp: number;
  cleared_timestamp: number;
  creator: string;
  ephemeral_timer?: any;
  global_message_timer?: any;
  id: string;
  is_guest: boolean;
  is_managed: boolean;
  last_event_timestamp: number;
  last_read_timestamp: number;
  last_server_timestamp: number;
  legal_hold_status: number;
  message_timer?: any;
  muted_state: boolean;
  muted_timestamp: number;
  name: string;
  others: string[];
  receipt_mode: number;
  roles: {[user_id: string]: DefaultConversationRoleName | string};
  status: number;
  team_id: string;
  type: number;
  verification_state: number;
}

export interface EventRecord {
  category: number;
  conversation: string;
  data: {
    content: string;
    expects_read_confirmation: boolean;
    legal_hold_status: number;
    mentions: any[];
    previews: string[];
  };
  edited_time: Date;
  ephemeral_expires: number;
  error: string;
  error_code: string;
  from: string;
  from_client_id: string;
  id: string;
  primary_key: number;
  protocol_version: number;
  reactions: {[userId: string]: string};
  read_receipts: {
    time: Date;
    userId: string;
  }[];
  server_time: Date;
  time: Date;
  type: string;
  version: number;
}

export interface CryptoboxRecord {
  created: number;
  id: string;
  serialised: string;
  version: string;
}

export interface UserRecord {
  availability: Availability.Type;
  id: string;
}

export class LocalWireDatabase extends Dexie {
  /**  @see https://dexie.org/docs/Observable/Dexie.Observable */
  _dbSchema?: Object;

  // Tables
  amplify: Dexie.Table<AmplifyRecord, string>;
  clients: Dexie.Table<ClientRecord, string>;
  /** @deprecated */
  conversation_events: Dexie.Table<{}, string>;
  conversations: Dexie.Table<ConversationRecord, string>;
  events: Dexie.Table<EventRecord, number>;
  keys: Dexie.Table<CryptoboxRecord, string>;
  prekeys: Dexie.Table<CryptoboxRecord, string>;
  sessions: Dexie.Table<CryptoboxRecord, string>;
  users: Dexie.Table<UserRecord, string>;

  private readonly logger: Logger;

  constructor(dbName: string) {
    super(dbName);
    this.logger = getLogger(dbName);

    StorageSchemata.SCHEMATA.forEach(({schema, upgrade, version}) => {
      const versionInstance = this.version(version).stores(schema);
      if (upgrade) {
        versionInstance.upgrade((transaction: Dexie.Transaction) => {
          this.logger.warn(`Database upgrade to version '${version}'`);
          upgrade(transaction, this);
        });
      }
    });

    this.amplify = this.table(StorageSchemata.OBJECT_STORE.AMPLIFY);
    this.clients = this.table(StorageSchemata.OBJECT_STORE.CLIENTS);
    this.conversation_events = this.table(StorageSchemata.OBJECT_STORE.CONVERSATION_EVENTS);
    this.conversations = this.table(StorageSchemata.OBJECT_STORE.CONVERSATIONS);
    this.events = this.table(StorageSchemata.OBJECT_STORE.EVENTS);
    this.keys = this.table(StorageSchemata.OBJECT_STORE.KEYS);
    this.prekeys = this.table(StorageSchemata.OBJECT_STORE.PRE_KEYS);
    this.sessions = this.table(StorageSchemata.OBJECT_STORE.SESSIONS);
    this.users = this.table(StorageSchemata.OBJECT_STORE.USERS);
  }
}
