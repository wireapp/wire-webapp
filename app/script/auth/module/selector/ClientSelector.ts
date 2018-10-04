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

import {ClientType} from '@wireapp/api-client/dist/commonjs/client/index';
import {RootState} from '../reducer';

export const getClients = (state: RootState) => state.clientState.clients || [];
export const getPermanentClients = (state: RootState) =>
  getClients(state).filter(client => client.type === ClientType.PERMANENT) || [];
export const getTemporaryClients = (state: RootState) =>
  getClients(state).filter(client => client.type === ClientType.TEMPORARY) || [];
export const getError = (state: RootState) => state.clientState.error;
export const isFetching = (state: RootState) => state.clientState.fetching;
export const hasHistory = (state: RootState) => state.clientState.hasHistory;
