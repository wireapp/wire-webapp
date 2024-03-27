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

const serializeQualifiedId = ({id, domain}: QualifiedId) => `${id}@${domain}`;

const store = new Map<string, (() => void)[]>();

/**
 * will keep track of all the subscriptions that are made for a given call
 * @param conversationId the conversation in which the call is happening
 * @param unsubscribe the function to call to teardown the subscription once the call is terminated
 */
const addCall = (conversationId: QualifiedId, unsubscribe: () => void) => {
  const serializedId = serializeQualifiedId(conversationId);

  const existingCallbacks = store.get(serializedId) || [];
  store.set(serializedId, [...existingCallbacks, unsubscribe]);
};

/**
 * Will cleanly terminate all the subscriptions for a given call
 * @param conversationId the conversation in which the call is happening
 */
const removeCall = (conversationId: QualifiedId) => {
  const serializedId = serializeQualifiedId(conversationId);

  const existingCallbacks = store.get(serializedId);
  if (existingCallbacks) {
    existingCallbacks.forEach(unsubscribe => unsubscribe());
  }
  store.delete(serializedId);
};

export const callingSubscriptions = {addCall, removeCall};
