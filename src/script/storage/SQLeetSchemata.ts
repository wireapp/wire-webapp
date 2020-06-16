/*
 * Wire
 * Copyright (C) 2019 Wire Swiss GmbH
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

import {SQLiteProvidedSchema, SQLiteType} from '@wireapp/store-engine-sqleet';

import {StorageSchemata} from './StorageSchemata';

interface SQLeetSchema {
  schema: SQLiteProvidedSchema<string>;
  version: number;
}

export class SQLeetSchemata {
  static getLatest(): SQLiteProvidedSchema<string> {
    return SQLeetSchemata.SCHEMATA[SQLeetSchemata.SCHEMATA.length - 1].schema;
  }

  static get SCHEMATA(): SQLeetSchema[] {
    return [
      {
        schema: {
          [StorageSchemata.OBJECT_STORE.AMPLIFY]: SQLiteType.JSON_OR_TEXT,
          [StorageSchemata.OBJECT_STORE.CLIENTS]: {
            address: SQLiteType.TEXT,
            class: SQLiteType.TEXT,
            id: SQLiteType.TEXT,
            label: SQLiteType.TEXT,
            location: SQLiteType.JSON,
            meta: SQLiteType.JSON,
            model: SQLiteType.TEXT,
            time: SQLiteType.TEXT,
            type: SQLiteType.TEXT,
          },
          [StorageSchemata.OBJECT_STORE.CONVERSATIONS]: {
            accessModes: SQLiteType.JSON,
            accessRole: SQLiteType.TEXT,
            archived_state: SQLiteType.BOOLEAN,
            archived_timestamp: SQLiteType.INTEGER,
            creator: SQLiteType.TEXT,
            id: SQLiteType.TEXT,
            last_event_timestamp: SQLiteType.INTEGER,
            last_server_timestamp: SQLiteType.INTEGER,
            message_timer: SQLiteType.INTEGER,
            muted_state: SQLiteType.BOOLEAN,
            muted_timestamp: SQLiteType.INTEGER,
            name: SQLiteType.TEXT,
            others: SQLiteType.JSON,
            receipt_mode: SQLiteType.INTEGER,
            status: SQLiteType.INTEGER,
            team_id: SQLiteType.TEXT,
            type: SQLiteType.INTEGER,
          },
          [StorageSchemata.OBJECT_STORE.EVENTS]: {
            category: SQLiteType.INTEGER,
            conversation: SQLiteType.TEXT,
            data: SQLiteType.JSON,
            ephemeral_expires: SQLiteType.TEXT,
            ephemeral_started: SQLiteType.TEXT,
            from: SQLiteType.TEXT,
            from_client_id: SQLiteType.TEXT,
            id: SQLiteType.TEXT,
            primary_key: SQLiteType.INTEGER,
            reactions: SQLiteType.JSON,
            read_receipts: SQLiteType.JSON,
            status: SQLiteType.INTEGER,
            time: SQLiteType.TEXT,
            type: SQLiteType.TEXT,
            version: SQLiteType.INTEGER,
          },
          [StorageSchemata.OBJECT_STORE.KEYS]: {
            created: SQLiteType.INTEGER,
            id: SQLiteType.TEXT,
            serialised: SQLiteType.TEXT,
            version: SQLiteType.TEXT,
          },
          [StorageSchemata.OBJECT_STORE.PRE_KEYS]: {
            created: SQLiteType.INTEGER,
            id: SQLiteType.TEXT,
            serialised: SQLiteType.TEXT,
            version: SQLiteType.TEXT,
          },
          [StorageSchemata.OBJECT_STORE.SESSIONS]: {
            created: SQLiteType.INTEGER,
            id: SQLiteType.TEXT,
            serialised: SQLiteType.TEXT,
            version: SQLiteType.TEXT,
          },
          [StorageSchemata.OBJECT_STORE.USERS]: {
            id: SQLiteType.TEXT,
          },
        },
        version: 1,
      },
    ];
  }
}
