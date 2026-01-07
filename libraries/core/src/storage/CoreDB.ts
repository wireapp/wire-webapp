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

import {EnrollmentFlowData} from '../messagingProtocols/mls/E2EIdentityService/Storage/E2EIStorage.schema';
const VERSION = 6;

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
  crls: {
    key: string;
    value: {expiresAt: number; url: string};
  };
  pendingEnrollmentData: {
    key: string;
    value: EnrollmentFlowData;
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
        case 2:
          db.createObjectStore('recurringTasks');
        case 3:
          db.createObjectStore('conversationBlacklist');
        case 4:
          db.createObjectStore('subconversations');
        case 5:
          db.createObjectStore('crls');
        case 6:
          db.createObjectStore('pendingEnrollmentData');
      }
    },
  });
  return db;
}

export async function deleteDB(db: CoreDatabase): Promise<void> {
  return idbDeleteDB(db.name);
}
