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

// Extension system record types
export interface ExtMetaRecord { extensionId: string; tables: string[]; provisionedAt: string }
export interface InstalledExtensionRecord { id: string; manifest: unknown; state: string; installedAt: string; source: string; sourceUrl?: string; enabled: boolean }
// Generic extension storage row — each extension defines its own shape
export type ExtRow = Record<string, unknown>

import {getLogger, Logger} from 'Util/logger';

import {AmplifyRecord, ConversationRecord, CryptoboxRecord, EventRecord, UserRecord} from './record';
import {ClientRecord} from './record/clientRecord';
import {GroupIdRecord} from './record/groupIdRecord';
import {StorageSchemata} from './storageSchemata';

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
  groupIds: Table<GroupIdRecord, string>;

  // Extension system tables
  ext_meta: Table<ExtMetaRecord, string>;
  ext_datasets: Table<ExtRow, string>;
  installed_extensions: Table<InstalledExtensionRecord, string>;
  // Reports
  'ext_com_wire_reports__reports': Table<ExtRow, string>;
  'ext_com_wire_reports__subReports': Table<ExtRow, number>;
  'ext_com_wire_reports__finalEntries': Table<ExtRow, number>;
  'ext_com_wire_reports__convSettings': Table<ExtRow, string>;
  'ext_com_wire_reports__settings': Table<ExtRow, string>;
  'ext_com_wire_reports__promptTemplates': Table<ExtRow, string>;
  'ext_com_wire_reports__entryNotes': Table<ExtRow, string>;
  // Jira
  'ext_com_wire_jira__tickets': Table<ExtRow, string>;
  'ext_com_wire_jira__problems': Table<ExtRow, number>;
  'ext_com_wire_jira__settings': Table<ExtRow, string>;
  'ext_com_wire_jira__convSettings': Table<ExtRow, string>;
  // Exports
  'ext_com_wire_exports__exports': Table<ExtRow, string>;
  'ext_com_wire_exports__settings': Table<ExtRow, string>;

  private readonly logger: Logger;

  constructor(dbName: string) {
    super(dbName);
    this.logger = getLogger(`Dexie (${dbName})`);

    void this.initDbSchema();

    this.amplify = this.table(StorageSchemata.OBJECT_STORE.AMPLIFY);
    this.clients = this.table(StorageSchemata.OBJECT_STORE.CLIENTS);
    this.conversation_events = this.table(StorageSchemata.OBJECT_STORE.CONVERSATION_EVENTS);
    this.conversations = this.table(StorageSchemata.OBJECT_STORE.CONVERSATIONS);
    this.events = this.table(StorageSchemata.OBJECT_STORE.EVENTS);
    this.keys = this.table(StorageSchemata.OBJECT_STORE.KEYS);
    this.prekeys = this.table(StorageSchemata.OBJECT_STORE.PRE_KEYS);
    this.sessions = this.table(StorageSchemata.OBJECT_STORE.SESSIONS);
    this.users = this.table(StorageSchemata.OBJECT_STORE.USERS);
    this.groupIds = this.table(StorageSchemata.OBJECT_STORE.GROUP_IDS);

    // Extension system tables
    this.ext_meta = this.table('ext_meta');
    this.ext_datasets = this.table('ext_datasets');
    this.installed_extensions = this.table('installed_extensions');
    this['ext_com_wire_reports__reports'] = this.table('ext_com_wire_reports__reports');
    this['ext_com_wire_reports__subReports'] = this.table('ext_com_wire_reports__subReports');
    this['ext_com_wire_reports__finalEntries'] = this.table('ext_com_wire_reports__finalEntries');
    this['ext_com_wire_reports__convSettings'] = this.table('ext_com_wire_reports__convSettings');
    this['ext_com_wire_reports__settings'] = this.table('ext_com_wire_reports__settings');
    this['ext_com_wire_reports__promptTemplates'] = this.table('ext_com_wire_reports__promptTemplates');
    this['ext_com_wire_reports__entryNotes'] = this.table('ext_com_wire_reports__entryNotes');
    this['ext_com_wire_jira__tickets'] = this.table('ext_com_wire_jira__tickets');
    this['ext_com_wire_jira__problems'] = this.table('ext_com_wire_jira__problems');
    this['ext_com_wire_jira__settings'] = this.table('ext_com_wire_jira__settings');
    this['ext_com_wire_jira__convSettings'] = this.table('ext_com_wire_jira__convSettings');
    this['ext_com_wire_exports__exports'] = this.table('ext_com_wire_exports__exports');
    this['ext_com_wire_exports__settings'] = this.table('ext_com_wire_exports__settings');
  }

  private readonly initDbSchema = async (): Promise<void> => {
    StorageSchemata.SCHEMATA.forEach(({schema, upgrade, version}) => {
      const versionInstance = this.version(version).stores(schema);
      if (upgrade) {
        versionInstance.upgrade((transaction: Transaction) => {
          this.logger.warn(`Database upgrade to version '${version}'`);
          upgrade(transaction, this);
        });
      }
    });
  };

  public readonly runDbSchemaUpdates = async (archiveVersion: number): Promise<void> => {
    for (const {upgrade, version} of StorageSchemata.SCHEMATA) {
      // If the archive version is greater than the current version, run the upgrade
      if (upgrade && version > archiveVersion) {
        await this.transaction('rw', this.tables, transaction => {
          this.logger.info(`Running DB schema update for version '${version}'`);
          upgrade(transaction, this);
        });
      }
    }
  };
}
