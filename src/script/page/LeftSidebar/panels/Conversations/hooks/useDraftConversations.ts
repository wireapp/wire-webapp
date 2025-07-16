/*
 * Wire
 * Copyright (C) 2025 Wire Swiss GmbH
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

import {useEffect, useState, useRef, useCallback} from 'react';

import {useDebouncedCallback} from 'use-debounce';

import {Conversation} from 'src/script/entity/Conversation';
import {StorageKey} from 'src/script/storage/StorageKey';

export const useDraftConversations = (conversations: Conversation[]): Conversation[] => {
  const [draftConversations, setDraftConversations] = useState<Conversation[]>([]);
  const conversationsRef = useRef(conversations);
  const lastCheckRef = useRef<{[key: string]: string}>({});

  // Update ref when conversations change
  useEffect(() => {
    conversationsRef.current = conversations;
  }, [conversations]);

  const checkForDrafts = useCallback(() => {
    const storageKeyPrefix = `__amplify__${StorageKey.CONVERSATION.INPUT}|`;
    const conversationsWithDrafts: Conversation[] = [];
    const currentCheck: {[key: string]: string} = {};
    let hasChanged = false;

    conversationsRef.current.forEach(conversation => {
      const storageKey = `${storageKeyPrefix}${conversation.id}`;
      const draftData = localStorage.getItem(storageKey);

      // Track current state
      currentCheck[conversation.id] = draftData || '';

      // Check if this conversation's draft state changed
      if (lastCheckRef.current[conversation.id] !== currentCheck[conversation.id]) {
        hasChanged = true;
      }

      if (draftData) {
        try {
          const amplifyData = JSON.parse(draftData);
          // Amplify wraps the data in an object with 'data' and 'expires' properties
          const draft = amplifyData.data || amplifyData;

          // Check if draft has content (editorState or plainMessage)
          if (draft && (draft.editorState || draft.plainMessage)) {
            conversationsWithDrafts.push(conversation);
          }
        } catch (error) {
          // Ignore parsing errors
        }
      }
    });

    // Only update state if something changed
    if (hasChanged || Object.keys(lastCheckRef.current).length === 0) {
      lastCheckRef.current = currentCheck;
      setDraftConversations(conversationsWithDrafts);
    }
  }, []);

  // Debounce the check to avoid too frequent updates
  const debouncedCheck = useDebouncedCallback(checkForDrafts, 200);

  useEffect(() => {
    // Initial check
    checkForDrafts();

    // Listen for storage changes from other tabs
    const handleStorageChange = (event: StorageEvent) => {
      if (event.key && event.key.includes(StorageKey.CONVERSATION.INPUT)) {
        checkForDrafts();
      }
    };

    // Check periodically but less frequently
    // This matches the draft save debounce of 800ms
    const interval = setInterval(debouncedCheck, 1000);

    window.addEventListener('storage', handleStorageChange);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      clearInterval(interval);
      debouncedCheck.cancel();
    };
  }, [checkForDrafts, debouncedCheck]);

  return draftConversations;
};
