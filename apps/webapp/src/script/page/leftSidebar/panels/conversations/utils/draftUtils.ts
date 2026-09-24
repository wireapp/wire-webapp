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

import {isEmptyString, isNan, isNonEmptyString, isNullOrUndefined} from '@sindresorhus/is';

import {Conversation} from 'Repositories/entity/Conversation';
import {StorageKey} from 'Repositories/storage';
import {getLogger} from 'Util/logger';

const logger = getLogger('draftUtils');

interface DraftData {
  editorState?: unknown;
  plainMessage?: string;
}

interface AmplifyWrapper {
  data?: DraftData;
  expires?: number | null;
}

/**
 * Checks if a conversation has a draft message
 * @param conversation - The conversation to check
 * @returns true if the conversation has a draft with content
 */
export const conversationHasDraft = (conversation: Conversation): boolean => {
  const storageKeyPrefix = `__amplify__${StorageKey.CONVERSATION.INPUT}|`;
  const storageKey = `${storageKeyPrefix}${conversation.id}`;
  const draftData = localStorage.getItem(storageKey);

  if (isNullOrUndefined(draftData) || isEmptyString(draftData)) {
    return false;
  }

  try {
    const amplifyData: AmplifyWrapper | DraftData = JSON.parse(draftData);
    // Amplify wraps the data in an object with 'data' and 'expires' properties
    const wrappedDraft = (amplifyData as AmplifyWrapper).data;
    const draft = isNullOrUndefined(wrappedDraft) ? (amplifyData as DraftData) : wrappedDraft;

    if (isNullOrUndefined(draft)) {
      return false;
    }

    // Check plainMessage for actual content (not just whitespace)
    const plainMessage = isNonEmptyString(draft.plainMessage) ? draft.plainMessage : '';
    const hasTextContent = plainMessage.trim().length > 0;
    const hasEditorStateContent =
      !isNullOrUndefined(draft.editorState) &&
      draft.editorState !== false &&
      draft.editorState !== 0 &&
      !isNan(draft.editorState) &&
      !isEmptyString(draft.editorState);

    return hasTextContent || hasEditorStateContent;
  } catch (error: unknown) {
    // Only log error type, not the actual error to avoid exposing draft content
    logger.warn(
      `Failed to parse draft data for conversation ${conversation.id}: ${
        error instanceof Error ? error.name : 'Unknown error'
      }`,
    );
    return false;
  }
};
