/*
 * Wire
 * Copyright (C) 2023 Wire Swiss GmbH
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

import {QualifiedId} from '@wireapp/api-client/lib/user';
import {isQualifiedId} from '@wireapp/core/lib/util';

// This module allows to finalise the join code flow by temporarily  storing the conversation id in localstorage
// We can access this conversation id once app (and services) is initialised and perform some actions on conversation user has just joined

const storageKey = 'joinCodeConversationIdStore';

const getConversationIdFromStore = () => {
  const storedId = localStorage.getItem(storageKey);
  if (!storedId) {
    return null;
  }

  const parsedId = JSON.parse(storedId);

  if (!isQualifiedId(parsedId)) {
    throw new Error('Invalid conversation id stored in joinCodeConversationIdStore localstorage store');
  }

  return parsedId;
};

/**
 * Will initialise finalisation of the join code flow by temporarily storing the conversation id in localstorage
 *
 * @param conversationId id of the conversation that was joined
 */
const init = (conversationId: QualifiedId) => {
  localStorage.setItem(storageKey, JSON.stringify(conversationId));
};

/**
 * Will finalise the join code flow by calling the callback with the conversation id that was received after the join code flow was initiated
 *
 * @param callback callback to be called with the conversation id
 */
const finalize = async (callback?: (conversationId: QualifiedId) => Promise<void>) => {
  const storedConversationId = getConversationIdFromStore();
  if (storedConversationId && callback) {
    await callback(storedConversationId);
  }
  localStorage.removeItem(storageKey);
};

export const joinCodeFlowFinalizer = {init, finalize};
