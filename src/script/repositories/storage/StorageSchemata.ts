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

import type {Dexie, Transaction} from 'dexie';

import {base64ToArray} from 'Util/util';

import {ConversationRecord} from './record';

import {categoryFromEvent} from '../../message/MessageCategorization';

interface DexieSchema {
  schema: Record<string, string>;
  upgrade?: (transaction: Transaction, database?: Dexie) => void;
  version: number;
}

export class StorageSchemata {
  static get OBJECT_STORE() {
    return {
      AMPLIFY: 'amplify',
      CLIENTS: 'clients',
      CONVERSATIONS: 'conversations',
      CONVERSATION_EVENTS: 'conversation_events',
      EVENTS: 'events',
      GROUP_IDS: 'group_ids',
      KEYS: 'keys',
      LAST_KEY_MATERIAL_UPDATE_DATES: 'last_key_material_update_dates',
      PENDING_PROPOSALS: 'pending_proposals',
      PRE_KEYS: 'prekeys',
      SESSIONS: 'sessions',
      USERS: 'users',
    } as const;
  }

  static get SCHEMATA(): DexieSchema[] {
    return [
      {
        schema: {
          [StorageSchemata.OBJECT_STORE.AMPLIFY]: '',
          [StorageSchemata.OBJECT_STORE.CLIENTS]: '',
          [StorageSchemata.OBJECT_STORE.CONVERSATION_EVENTS]: ', raw.conversation, raw.time, meta.timestamp',
          [StorageSchemata.OBJECT_STORE.KEYS]: '',
          [StorageSchemata.OBJECT_STORE.PRE_KEYS]: '',
          [StorageSchemata.OBJECT_STORE.SESSIONS]: '',
        },
        version: 1,
      },
      {
        schema: {
          [StorageSchemata.OBJECT_STORE.AMPLIFY]: '',
          [StorageSchemata.OBJECT_STORE.CLIENTS]: '',
          [StorageSchemata.OBJECT_STORE.CONVERSATION_EVENTS]: ', raw.conversation, raw.time, raw.type, meta.timestamp',
          [StorageSchemata.OBJECT_STORE.KEYS]: '',
          [StorageSchemata.OBJECT_STORE.PRE_KEYS]: '',
          [StorageSchemata.OBJECT_STORE.SESSIONS]: '',
        },
        version: 2,
      },
      {
        schema: {
          [StorageSchemata.OBJECT_STORE.AMPLIFY]: '',
          [StorageSchemata.OBJECT_STORE.CLIENTS]: '',
          [StorageSchemata.OBJECT_STORE.CONVERSATION_EVENTS]: ', raw.conversation, raw.time, raw.type, meta.timestamp',
          [StorageSchemata.OBJECT_STORE.CONVERSATIONS]: ', id, last_event_timestamp',
          [StorageSchemata.OBJECT_STORE.KEYS]: '',
          [StorageSchemata.OBJECT_STORE.PRE_KEYS]: '',
          [StorageSchemata.OBJECT_STORE.SESSIONS]: '',
        },
        version: 3,
      },
      {
        schema: {
          [StorageSchemata.OBJECT_STORE.AMPLIFY]: '',
          [StorageSchemata.OBJECT_STORE.CLIENTS]: ', meta.primary_key',
          [StorageSchemata.OBJECT_STORE.CONVERSATION_EVENTS]: ', raw.conversation, raw.time, raw.type, meta.timestamp',
          [StorageSchemata.OBJECT_STORE.CONVERSATIONS]: ', id, last_event_timestamp',
          [StorageSchemata.OBJECT_STORE.KEYS]: '',
          [StorageSchemata.OBJECT_STORE.PRE_KEYS]: '',
          [StorageSchemata.OBJECT_STORE.SESSIONS]: '',
        },
        upgrade: (transaction: Transaction) => {
          transaction
            .table(StorageSchemata.OBJECT_STORE.CLIENTS)
            .toCollection()
            .modify(client => {
              client.meta = {is_verified: true, primary_key: 'local_identity'};
            });
        },
        version: 4,
      },
      {
        schema: {
          [StorageSchemata.OBJECT_STORE.AMPLIFY]: '',
          [StorageSchemata.OBJECT_STORE.CLIENTS]: ', meta.primary_key',
          [StorageSchemata.OBJECT_STORE.CONVERSATION_EVENTS]: ', conversation, time, type',
          [StorageSchemata.OBJECT_STORE.CONVERSATIONS]: ', id, last_event_timestamp',
          [StorageSchemata.OBJECT_STORE.KEYS]: '',
          [StorageSchemata.OBJECT_STORE.PRE_KEYS]: '',
          [StorageSchemata.OBJECT_STORE.SESSIONS]: '',
        },
        version: 5,
      },
      {
        schema: {
          [StorageSchemata.OBJECT_STORE.AMPLIFY]: '',
          [StorageSchemata.OBJECT_STORE.CLIENTS]: ', meta.primary_key',
          [StorageSchemata.OBJECT_STORE.CONVERSATION_EVENTS]: ', conversation, time, type',
          [StorageSchemata.OBJECT_STORE.CONVERSATIONS]: ', id, last_event_timestamp',
          [StorageSchemata.OBJECT_STORE.KEYS]: '',
          [StorageSchemata.OBJECT_STORE.PRE_KEYS]: '',
          [StorageSchemata.OBJECT_STORE.SESSIONS]: '',
        },
        upgrade: (transaction: Transaction, database: Dexie) => {
          transaction
            .table(StorageSchemata.OBJECT_STORE.CONVERSATIONS)
            .toCollection()
            .eachKey(key => {
              database.table(StorageSchemata.OBJECT_STORE.CONVERSATIONS).update(key, {id: key});
            });
          transaction
            .table(StorageSchemata.OBJECT_STORE.SESSIONS)
            .toCollection()
            .eachKey(key => {
              database.table(StorageSchemata.OBJECT_STORE.SESSIONS).update(key, {id: key});
            });
          transaction
            .table(StorageSchemata.OBJECT_STORE.PRE_KEYS)
            .toCollection()
            .eachKey(key => {
              database.table(StorageSchemata.OBJECT_STORE.PRE_KEYS).update(key, {id: key});
            });
        },
        version: 6,
      },
      {
        schema: {
          [StorageSchemata.OBJECT_STORE.AMPLIFY]: '',
          [StorageSchemata.OBJECT_STORE.CLIENTS]: ', meta.primary_key',
          [StorageSchemata.OBJECT_STORE.CONVERSATION_EVENTS]: ', conversation, time, type',
          [StorageSchemata.OBJECT_STORE.CONVERSATIONS]: ', id, last_event_timestamp',
          [StorageSchemata.OBJECT_STORE.KEYS]: '',
          [StorageSchemata.OBJECT_STORE.PRE_KEYS]: '',
          [StorageSchemata.OBJECT_STORE.SESSIONS]: '',
        },
        upgrade: (transaction: Transaction) => {
          transaction
            .table(StorageSchemata.OBJECT_STORE.CONVERSATION_EVENTS)
            .toCollection()
            .modify(event => {
              const mappedEvent = event.mapped || event.raw;
              delete event.mapped;
              delete event.raw;
              delete event.meta;
              event = {...event, ...mappedEvent};
            });
        },
        version: 7,
      },
      {
        schema: {
          [StorageSchemata.OBJECT_STORE.AMPLIFY]: '',
          [StorageSchemata.OBJECT_STORE.CLIENTS]: ', meta.primary_key',
          [StorageSchemata.OBJECT_STORE.CONVERSATION_EVENTS]: ', conversation, time, type',
          [StorageSchemata.OBJECT_STORE.CONVERSATIONS]: ', id, last_event_timestamp',
          [StorageSchemata.OBJECT_STORE.KEYS]: '',
          [StorageSchemata.OBJECT_STORE.PRE_KEYS]: '',
          [StorageSchemata.OBJECT_STORE.SESSIONS]: '',
        },
        upgrade: (transaction: Transaction) => {
          transaction
            .table(StorageSchemata.OBJECT_STORE.CONVERSATION_EVENTS)
            .toCollection()
            .modify(event => {
              const isTypeDeleteEveryWhere = event.type === 'conversation.delete-everywhere';
              if (isTypeDeleteEveryWhere) {
                event.time = new Date(event.time).toISOString();
              }
            });
        },
        version: 8,
      },
      {
        schema: {
          [StorageSchemata.OBJECT_STORE.AMPLIFY]: '',
          [StorageSchemata.OBJECT_STORE.CLIENTS]: ', meta.primary_key',
          [StorageSchemata.OBJECT_STORE.CONVERSATION_EVENTS]: ', conversation, time, type, [conversation+time]',
          [StorageSchemata.OBJECT_STORE.CONVERSATIONS]: ', id, last_event_timestamp',
          [StorageSchemata.OBJECT_STORE.KEYS]: '',
          [StorageSchemata.OBJECT_STORE.PRE_KEYS]: '',
          [StorageSchemata.OBJECT_STORE.SESSIONS]: '',
        },
        version: 9,
      },
      {
        schema: {
          [StorageSchemata.OBJECT_STORE.AMPLIFY]: '',
          [StorageSchemata.OBJECT_STORE.CLIENTS]: ', meta.primary_key',
          [StorageSchemata.OBJECT_STORE.CONVERSATION_EVENTS]:
            ', category, conversation, time, type, [conversation+time], [conversation+category]',
          [StorageSchemata.OBJECT_STORE.CONVERSATIONS]: ', id, last_event_timestamp',
          [StorageSchemata.OBJECT_STORE.KEYS]: '',
          [StorageSchemata.OBJECT_STORE.PRE_KEYS]: '',
          [StorageSchemata.OBJECT_STORE.SESSIONS]: '',
        },
        upgrade: (transaction: Transaction) => {
          transaction
            .table(StorageSchemata.OBJECT_STORE.CONVERSATION_EVENTS)
            .toCollection()
            .modify(event => {
              event.category = categoryFromEvent(event);
            });
        },
        version: 10,
      },
      {
        schema: {
          [StorageSchemata.OBJECT_STORE.AMPLIFY]: '',
          [StorageSchemata.OBJECT_STORE.CLIENTS]: ', meta.primary_key',
          [StorageSchemata.OBJECT_STORE.CONVERSATION_EVENTS]:
            ', category, conversation, time, type, [conversation+time], [conversation+category]',
          [StorageSchemata.OBJECT_STORE.CONVERSATIONS]: ', id, last_event_timestamp',
          [StorageSchemata.OBJECT_STORE.KEYS]: '',
          [StorageSchemata.OBJECT_STORE.PRE_KEYS]: '',
          [StorageSchemata.OBJECT_STORE.SESSIONS]: '',
        },
        upgrade: (transaction: Transaction) => {
          const localClientPrimaryKey = 'local_identity';

          transaction
            .table(StorageSchemata.OBJECT_STORE.CLIENTS)
            .toCollection()
            .each((client, cursor) => {
              const isExpectedMetaPrimaryKey = client.meta.primary_key === localClientPrimaryKey;
              const isExpectedPrimaryKey = client.primary_key === localClientPrimaryKey;

              const isExpectedClient = isExpectedMetaPrimaryKey && isExpectedPrimaryKey;
              if (isExpectedClient) {
                transaction.table(StorageSchemata.OBJECT_STORE.CLIENTS).delete(cursor.primaryKey);
                transaction.table(StorageSchemata.OBJECT_STORE.CLIENTS).put(client, localClientPrimaryKey);
              }
            });
        },
        version: 11,
      },
      {
        schema: {
          [StorageSchemata.OBJECT_STORE.AMPLIFY]: '',
          [StorageSchemata.OBJECT_STORE.CLIENTS]: ', meta.primary_key',
          [StorageSchemata.OBJECT_STORE.CONVERSATION_EVENTS]:
            ', category, conversation, time, type, [conversation+time], [conversation+category]',
          [StorageSchemata.OBJECT_STORE.CONVERSATIONS]: ', id, last_event_timestamp',
          [StorageSchemata.OBJECT_STORE.EVENTS]:
            '++primary_key, id, category, conversation, time, type, [conversation+time], [conversation+category]',
          [StorageSchemata.OBJECT_STORE.KEYS]: '',
          [StorageSchemata.OBJECT_STORE.PRE_KEYS]: '',
          [StorageSchemata.OBJECT_STORE.SESSIONS]: '',
        },
        upgrade: (transaction: Transaction) => {
          transaction
            .table(StorageSchemata.OBJECT_STORE.KEYS)
            .toCollection()
            .modify(record => {
              record.serialised = base64ToArray(record.serialised).buffer;
            });
          transaction
            .table(StorageSchemata.OBJECT_STORE.PRE_KEYS)
            .toCollection()
            .modify(record => {
              record.serialised = base64ToArray(record.serialised).buffer;
            });
          transaction
            .table(StorageSchemata.OBJECT_STORE.SESSIONS)
            .toCollection()
            .modify(record => {
              record.serialised = base64ToArray(record.serialised).buffer;
            });
        },
        version: 12,
      },
      {
        schema: {
          [StorageSchemata.OBJECT_STORE.AMPLIFY]: '',
          [StorageSchemata.OBJECT_STORE.CLIENTS]: ', meta.primary_key',
          [StorageSchemata.OBJECT_STORE.CONVERSATION_EVENTS]:
            ', category, conversation, time, type, [conversation+time], [conversation+category]',
          [StorageSchemata.OBJECT_STORE.CONVERSATIONS]: ', id, last_event_timestamp',
          [StorageSchemata.OBJECT_STORE.EVENTS]:
            '++primary_key, id, category, conversation, time, type, [conversation+time], [conversation+category]',
          [StorageSchemata.OBJECT_STORE.KEYS]: '',
          [StorageSchemata.OBJECT_STORE.PRE_KEYS]: '',
          [StorageSchemata.OBJECT_STORE.SESSIONS]: '',
        },
        upgrade: (transaction: Transaction, database: Dexie) => {
          transaction
            .table(StorageSchemata.OBJECT_STORE.CONVERSATION_EVENTS)
            .toCollection()
            .toArray()
            .then(items => database.table(StorageSchemata.OBJECT_STORE.EVENTS).bulkPut(items));
        },
        version: 13,
      },
      {
        schema: {
          [StorageSchemata.OBJECT_STORE.AMPLIFY]: '',
          [StorageSchemata.OBJECT_STORE.CLIENTS]: ', meta.primary_key',
          [StorageSchemata.OBJECT_STORE.CONVERSATION_EVENTS]:
            ', category, conversation, time, type, [conversation+time], [conversation+category]',
          [StorageSchemata.OBJECT_STORE.CONVERSATIONS]: ', id, last_event_timestamp',
          [StorageSchemata.OBJECT_STORE.EVENTS]:
            '++primary_key, id, category, conversation, time, type, [conversation+time], [conversation+category]',
          [StorageSchemata.OBJECT_STORE.KEYS]: '',
          [StorageSchemata.OBJECT_STORE.PRE_KEYS]: '',
          [StorageSchemata.OBJECT_STORE.SESSIONS]: '',
        },
        upgrade: (transaction: Transaction) => {
          transaction
            .table(StorageSchemata.OBJECT_STORE.EVENTS)
            .toCollection()
            .modify(event => {
              const isTypeAssetMeta = event.type === 'conversation.asset-meta';
              if (isTypeAssetMeta) {
                event.type = 'conversation.asset-add';
              }
            });
        },
        version: 14,
      },
      {
        schema: {
          [StorageSchemata.OBJECT_STORE.AMPLIFY]: '',
          [StorageSchemata.OBJECT_STORE.CLIENTS]: ', meta.primary_key',
          [StorageSchemata.OBJECT_STORE.CONVERSATION_EVENTS]:
            ', category, conversation, time, type, [conversation+time], [conversation+category]',
          [StorageSchemata.OBJECT_STORE.CONVERSATIONS]: ', id, last_event_timestamp',
          [StorageSchemata.OBJECT_STORE.EVENTS]:
            '++primary_key, id, category, conversation, time, type, [conversation+time], [conversation+category]',
          [StorageSchemata.OBJECT_STORE.KEYS]: '',
          [StorageSchemata.OBJECT_STORE.PRE_KEYS]: '',
          [StorageSchemata.OBJECT_STORE.SESSIONS]: '',
          [StorageSchemata.OBJECT_STORE.USERS]: ', id',
        },
        version: 15,
      },
      {
        schema: {
          [StorageSchemata.OBJECT_STORE.AMPLIFY]: '',
          [StorageSchemata.OBJECT_STORE.CLIENTS]: ', meta.primary_key',
          [StorageSchemata.OBJECT_STORE.CONVERSATION_EVENTS]:
            ', category, conversation, time, type, [conversation+time], [conversation+category]',
          [StorageSchemata.OBJECT_STORE.CONVERSATIONS]: ', id, last_event_timestamp',
          [StorageSchemata.OBJECT_STORE.EVENTS]:
            '++primary_key, id, category, conversation, time, type, [conversation+time], [conversation+category]',
          [StorageSchemata.OBJECT_STORE.KEYS]: '',
          [StorageSchemata.OBJECT_STORE.PRE_KEYS]: '',
          [StorageSchemata.OBJECT_STORE.SESSIONS]: '',
          [StorageSchemata.OBJECT_STORE.USERS]: ', id',
          [StorageSchemata.OBJECT_STORE.GROUP_IDS]: '',
        },
        version: 16,
      },
      {
        schema: {
          [StorageSchemata.OBJECT_STORE.AMPLIFY]: '',
          [StorageSchemata.OBJECT_STORE.CLIENTS]: ', meta.primary_key',
          [StorageSchemata.OBJECT_STORE.CONVERSATION_EVENTS]:
            ', category, conversation, time, type, [conversation+time], [conversation+category]',
          [StorageSchemata.OBJECT_STORE.CONVERSATIONS]: ', id, last_event_timestamp',
          [StorageSchemata.OBJECT_STORE.EVENTS]:
            '++primary_key, id, category, conversation, time, type, [conversation+time], [conversation+category]',
          [StorageSchemata.OBJECT_STORE.KEYS]: '',
          [StorageSchemata.OBJECT_STORE.PRE_KEYS]: '',
          [StorageSchemata.OBJECT_STORE.SESSIONS]: '',
          [StorageSchemata.OBJECT_STORE.USERS]: ', id',
          [StorageSchemata.OBJECT_STORE.GROUP_IDS]: '',
          [StorageSchemata.OBJECT_STORE.PENDING_PROPOSALS]: '',
        },
        version: 17,
      },
      {
        schema: {
          [StorageSchemata.OBJECT_STORE.AMPLIFY]: '',
          [StorageSchemata.OBJECT_STORE.CLIENTS]: ', meta.primary_key',
          [StorageSchemata.OBJECT_STORE.CONVERSATION_EVENTS]:
            ', category, conversation, time, type, [conversation+time], [conversation+category]',
          [StorageSchemata.OBJECT_STORE.CONVERSATIONS]: ', id, last_event_timestamp',
          [StorageSchemata.OBJECT_STORE.EVENTS]:
            '++primary_key, id, category, conversation, time, type, [conversation+time], [conversation+category]',
          [StorageSchemata.OBJECT_STORE.KEYS]: '',
          [StorageSchemata.OBJECT_STORE.PRE_KEYS]: '',
          [StorageSchemata.OBJECT_STORE.SESSIONS]: '',
          [StorageSchemata.OBJECT_STORE.USERS]: ', id',
          [StorageSchemata.OBJECT_STORE.GROUP_IDS]: '',
          [StorageSchemata.OBJECT_STORE.PENDING_PROPOSALS]: '',
          [StorageSchemata.OBJECT_STORE.LAST_KEY_MATERIAL_UPDATE_DATES]: '',
        },
        version: 18,
      },
      {
        schema: {},
        version: 19,
      },
      {
        schema: {},
        upgrade: (transaction: Transaction) =>
          transaction
            .table(StorageSchemata.OBJECT_STORE.CONVERSATIONS)
            .toCollection()
            .modify((conversation: ConversationRecord) => {
              conversation.initial_protocol = conversation.protocol;
            }),
        version: 20,
      },
      {
        // This version enables DB encryption at rest
        schema: {},
        version: 21,
      },
    ];
  }
}
