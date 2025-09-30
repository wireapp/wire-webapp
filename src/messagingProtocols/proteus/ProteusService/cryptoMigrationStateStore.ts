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

function getLocalStorage() {
  try {
    return window.localStorage;
  } catch {
    return {setItem: () => {}, getItem: () => {}, removeItem: () => {}};
  }
}

const MIGRATION_READY_STATE = '1';

const getQualifiedSessionsReadyKey = (dbName: string) => `${dbName}-qualified-sessions-ready` as const;

const markMigrationReady = (getKey: (dbName: string) => string) => (dbName: string) => {
  const key = getKey(dbName);
  const localStorage = getLocalStorage();
  localStorage.setItem(key, MIGRATION_READY_STATE);
};

const isMigrationReady = (getKey: (dbName: string) => string) => (dbName: string) => {
  const key = getKey(dbName);
  const localStorage = getLocalStorage();
  const value = localStorage.getItem(key);
  return !!value && value === MIGRATION_READY_STATE;
};

export const cryptoMigrationStore = {
  qualifiedSessions: {
    isReady: isMigrationReady(getQualifiedSessionsReadyKey),
    markAsReady: markMigrationReady(getQualifiedSessionsReadyKey),
  },
};
