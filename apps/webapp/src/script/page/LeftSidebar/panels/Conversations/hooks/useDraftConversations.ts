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

import {amplify} from 'amplify';
import {useDebouncedCallback} from 'use-debounce';

import {DRAFT_STATE_CHANGED_EVENT} from 'Components/InputBar/common/draftState/draftState';
import {Conversation} from 'Repositories/entity/Conversation';
import {StorageKey} from 'Repositories/storage';

import {conversationHasDraft} from '../utils/draftUtils';

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

      if (conversationHasDraft(conversation)) {
        conversationsWithDrafts.push(conversation);
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

    // Listen for draft changes in the current tab
    const handleDraftChange = () => {
      debouncedCheck();
    };

    // Listen for storage changes from other tabs
    const handleStorageChange = (event: StorageEvent) => {
      if (event.key?.includes(StorageKey.CONVERSATION.INPUT)) {
        debouncedCheck();
      }
    };

    // Listen for visibility changes to check when tab becomes active
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        checkForDrafts();
      }
    };

    amplify.subscribe(DRAFT_STATE_CHANGED_EVENT, handleDraftChange);
    window.addEventListener('storage', handleStorageChange);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      amplify.unsubscribe(DRAFT_STATE_CHANGED_EVENT, handleDraftChange);
      window.removeEventListener('storage', handleStorageChange);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      debouncedCheck.cancel();
    };
  }, [checkForDrafts, debouncedCheck]);

  return draftConversations;
};
