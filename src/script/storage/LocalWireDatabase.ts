import Dexie from 'dexie';
import {StorageSchemata} from './StorageSchemata';
import {getLogger, Logger} from 'Util/Logger';
import {ClientRecord} from './ClientRecord';
import {DefaultConversationRoleName} from '@wireapp/api-client/src/conversation';

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

export class LocalWireDatabase extends Dexie {
  /**  @see https://dexie.org/docs/Observable/Dexie.Observable */
  _dbSchema?: Object;

  // Tables
  amplify: Dexie.Table<AmplifyRecord, string>;
  clients: Dexie.Table<ClientRecord, string>;
  /** @deprecated */
  conversation_events: Dexie.Table<{}, string>;
  conversations: Dexie.Table<ConversationRecord, string>;

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
  }
}
