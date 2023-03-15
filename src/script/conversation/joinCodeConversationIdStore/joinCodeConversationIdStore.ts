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

const storageKey = 'joinCodeConversationIdStore';

const set = (conversationId: QualifiedId) => {
  localStorage.setItem(storageKey, JSON.stringify(conversationId));
};

const get = () => {
  const storedId = localStorage.getItem(storageKey);
  if (!storedId) {
    return null;
  }

  const parsedId = JSON.parse(storedId);

  if (!isQualifiedId(parsedId)) {
    throw new Error('Invalid conversation id stored in joinCodeConversationIdStore localstorage stored');
  }

  return parsedId;
};

const clear = () => localStorage.removeItem(storageKey);

export const joinCodeConversationIdStore = {set, get, clear};
