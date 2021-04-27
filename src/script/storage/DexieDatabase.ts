/*
 * Wire
 * Copyright (C) 2020 Wire Swiss GmbH
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

import {Dexie, Table, Transaction} from 'dexie';
import {StorageSchemata} from './StorageSchemata';
import {getLogger, Logger} from 'Util/Logger';
import {ClientRecord} from './record/ClientRecord';
import {AmplifyRecord, ConversationRecord, CryptoboxRecord, EventRecord, UserRecord} from './record';

/**
 * TypeScript representation of local IndexedDB schema managed with Dexie.
 * @see https://dexie.org/docs/Typescript#create-a-subclass
 */
export class DexieDatabase extends Dexie {
  amplify: Table<AmplifyRecord, string>;
  clients: Table<ClientRecord, string>;
  /** @deprecated */
  conversation_events: Table<{}, string>;
  conversations: Table<ConversationRecord, string>;
  events: Table<EventRecord, number>;
  keys: Table<CryptoboxRecord, string>;
  prekeys: Table<CryptoboxRecord, string>;
  sessions: Table<CryptoboxRecord, string>;
  users: Table<UserRecord, string>;

  private readonly logger: Logger;

  constructor(dbName: string) {
    super(dbName);
    this.logger = getLogger(`Dexie (${dbName})`);

    StorageSchemata.SCHEMATA.forEach(({schema, upgrade, version}) => {
      const versionInstance = this.version(version).stores(schema);
      if (upgrade) {
        versionInstance.upgrade((transaction: Transaction) => {
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
