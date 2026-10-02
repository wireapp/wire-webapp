/*
 * Wire
 * Copyright (C) 2018 Wire Swiss GmbH
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

import {ClientType, RegisteredClient} from '@wireapp/api-client/lib/client/';

import type {RootState} from '../reducer';

export const getClients = (state: RootState) => {
  return state.clientState.clients ?? [];
};
export const getCurrentSelfClient = (state: RootState): RegisteredClient | null => {
  return state.clientState.currentClient;
};
export const hasLoadedClients = (state: RootState) => {
  return state.clientState.clients !== null;
};
export const isNewCurrentSelfClient = (state: RootState): boolean => {
  return state.clientState.isNewClient;
};
export const getPermanentClients = (state: RootState) => {
  return getClients(state).filter(client => {
    return client.type === ClientType.PERMANENT;
  });
};
export const getError = (state: RootState) => {
  return state.clientState.error;
};
export const isFetching = (state: RootState) => {
  return state.clientState.fetching;
};
