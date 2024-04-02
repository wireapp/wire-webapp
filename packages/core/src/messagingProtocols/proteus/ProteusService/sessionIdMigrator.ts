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

import {CRUDEngine} from '@wireapp/store-engine';

const sessionTableName = 'sessions';

type Session = {
  id: string;
  [key: string]: unknown;
};

/**
 * Will migrate all the session ids in the database to fully qualified ids (from 'user-id@device-id` to  `domain@user-id@device-id`)
 * Will only occur once for an instance of the webapp (a flag is stored in order not to re-do the migration at each loadtime)
 *
 * @param sessionTable The indexedDB table where the sessions are stored
 * @param defaultDomain The domain to add to the unqualified session ids
 */
export async function migrateToQualifiedSessionIds(storeEngine: CRUDEngine, defaultDomain: string) {
  const isFullyQualified = /^[^@]+@[A-F0-9-]+@/i;
  const updatedSessions = (await storeEngine.readAll<Session>(sessionTableName))
    .filter(session => !isFullyQualified.test(session.id))
    .reduce<{oldId: string; newSession: Session}[]>((acc, session) => {
      return acc.concat({
        oldId: session.id,
        newSession: {...session, id: `${defaultDomain}@${session.id}`},
      });
    }, []);

  for (const {oldId, newSession} of updatedSessions) {
    // In order to change primaryKeys, we need to first delete all the record and re-add them with the new key
    await storeEngine.delete(sessionTableName, oldId);
    await storeEngine.create(sessionTableName, newSession.id, newSession);
  }
}
