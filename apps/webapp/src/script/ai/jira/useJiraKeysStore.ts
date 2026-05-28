/*
 * Wire
 * Copyright (C) 2026 Wire Swiss GmbH
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

import {liveQuery} from 'dexie';
import {create} from 'zustand';

import {getLogger} from 'Util/logger';

import type {JiraStorageRepository} from './JiraStorageRepository';

const log = getLogger('AI/JiraKeysStore');

interface JiraKeysState {
  known_keys: Set<string>;
}

/**
 * Single Zustand store for the set of known Jira ticket keys.
 *
 * One Dexie liveQuery subscription feeds this store; all UI consumers (including one per
 * rendered message) read from this shared store via useKnownJiraKeys() without creating
 * their own subscriptions.
 */
const useJiraKeysStore = create<JiraKeysState>(() => ({
  known_keys: new Set<string>(),
}));

let subscription: {unsubscribe: () => void} | null = null;

/**
 * Starts a single Dexie liveQuery subscription that pushes known Jira keys into the store.
 * Call once after bootstrapAi() resolves. Safe to call again (replaces the previous subscription).
 */
export const bootstrapJiraKeysStore = (jira_storage: JiraStorageRepository): void => {
  subscription?.unsubscribe();

  subscription = liveQuery(() => jira_storage.getStoredKeys()).subscribe({
    next: keys => {
      useJiraKeysStore.setState({known_keys: keys});
    },
    error: err => {
      log.warn('Failed to subscribe to Jira key updates — linkification disabled', err);
    },
  });
};

/** Returns the reactive set of known Jira ticket keys from the shared store. */
export const useKnownJiraKeys = (): Set<string> => useJiraKeysStore(state => state.known_keys);
