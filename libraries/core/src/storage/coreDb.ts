/*
 * Wire
 * Copyright (C) 2022 Wire Swiss GmbH
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

import {SUBCONVERSATION_ID} from '@wireapp/api-client/lib/conversation';
import {QualifiedId} from '@wireapp/api-client/lib/user';
import {DBSchema, deleteDB as idbDeleteDB, IDBPDatabase, openDB as idbOpenDb} from 'idb';

import {PendingEnrollmentData} from '../messagingProtocols/mls/e2eIdentityService/storage/e2eiStorage.schema';

const recurringTasksMigrationVersion = 2;
const conversationBlacklistMigrationVersion = 3;
const subconversationsMigrationVersion = 4;
const enrollmentMigrationVersion = 5;
const mlsRecoveryMigrationVersion = 6;
const removeUnusedCrlsMigrationVersion = 7;
const VERSION = 8;

interface CoreDBSchema extends DBSchema {
  prekeys: {
    key: string;
    value: {nbPrekeys: number; highestId: number};
  };
  pendingProposals: {
    key: string;
    value: {groupId: string; firingDate: number};
  };
  recurringTasks: {
    key: string;
    value: {key: string; firingDate: number};
  };
  conversationBlacklist: {
    key: string;
    value: {id: string; domain: string};
  };
  subconversations: {
    key: string;
    value: {parentConversationId: QualifiedId; subconversationId: SUBCONVERSATION_ID; groupId: string};
  };
  pendingEnrollmentData: {
    key: string;
    value: PendingEnrollmentData;
  };
  mlsConversationRecovery: {
    key: string;
    value: {required: true; pendingConversationIds?: QualifiedId[]};
  };
}

export type CoreDatabase = IDBPDatabase<CoreDBSchema>;

export async function openDB(dbName: string): Promise<CoreDatabase> {
  const db = await idbOpenDb<CoreDBSchema>(dbName, VERSION, {
    upgrade: (db, oldVersion) => {
      switch (oldVersion) {
        case 0:
          db.createObjectStore('prekeys');
        case 1:
          db.deleteObjectStore('prekeys');
          db.createObjectStore('pendingProposals');
        case recurringTasksMigrationVersion:
          db.createObjectStore('recurringTasks');
        case conversationBlacklistMigrationVersion:
          db.createObjectStore('conversationBlacklist');
        case subconversationsMigrationVersion:
          db.createObjectStore('subconversations');
        case enrollmentMigrationVersion:
          db.createObjectStore('pendingEnrollmentData');
        case mlsRecoveryMigrationVersion:
          db.createObjectStore('mlsConversationRecovery');
        case removeUnusedCrlsMigrationVersion: {
          // CRLs moved into CoreCrypto with V11. The store was never read, but older databases
          // still contain it, so drop it instead of leaving a dead object store behind.
          // The schema no longer contains `crls`, so this migration uses the untyped database view.
          const legacyDb = db as IDBPDatabase;
          if (legacyDb.objectStoreNames.contains('crls')) {
            legacyDb.deleteObjectStore('crls');
          }
        }
      }
    },
  });
  return db;
}

export async function deleteDB(db: CoreDatabase): Promise<void> {
  return idbDeleteDB(db.name);
}
