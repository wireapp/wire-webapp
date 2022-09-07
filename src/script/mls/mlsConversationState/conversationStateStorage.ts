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

import {MLSConversationState} from './mlsConversationState';

const storageKey = 'mlsConversationsState';

export const loadState = (): MLSConversationState => {
  const storedState = localStorage.getItem(storageKey);
  if (!storedState) {
    return {
      established: new Set(),
      pendingWelcome: new Set(),
    };
  }
  const parsedState = JSON.parse(storedState);
  return {
    established: new Set(parsedState.established),
    pendingWelcome: new Set(parsedState.pendingWelcome),
  };
};

export const saveState = ({established, pendingWelcome}: MLSConversationState) => {
  localStorage.setItem(
    storageKey,
    JSON.stringify({established: [...established], pendingWelcome: [...pendingWelcome]}),
  );
};
