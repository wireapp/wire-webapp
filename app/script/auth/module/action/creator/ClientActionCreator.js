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

import BackendError from '../BackendError';

export const CLIENTS_FETCH_START = 'CLIENTS_FETCH_START';
export const CLIENTS_FETCH_SUCCESS = 'CLIENTS_FETCH_SUCCESS';
export const CLIENTS_FETCH_FAILED = 'CLIENTS_FETCH_FAILED';

export const CLIENT_REMOVE_START = 'CLIENT_REMOVE_START';
export const CLIENT_REMOVE_SUCCESS = 'CLIENT_REMOVE_SUCCESS';
export const CLIENT_REMOVE_FAILED = 'CLIENT_REMOVE_FAILED';

export const CLIENT_INIT_START = 'CLIENT_INIT_START';
export const CLIENT_INIT_SUCCESS = 'CLIENT_INIT_SUCCESS';
export const CLIENT_INIT_FAILED = 'CLIENT_INIT_FAILED';

export const CLIENT_RESET_ERROR = 'CLIENT_RESET_ERROR';

export const startGetAllClients = () => ({
  type: CLIENTS_FETCH_START,
});

export const successfulGetAllClients = clients => ({
  payload: clients,
  type: CLIENTS_FETCH_SUCCESS,
});

export const failedGetAllClients = error => ({
  payload: BackendError.handle(error),
  type: CLIENTS_FETCH_FAILED,
});

export const startRemoveClient = params => ({
  params,
  type: CLIENT_REMOVE_START,
});

export const successfulRemoveClient = deletedClientId => ({
  payload: deletedClientId,
  type: CLIENT_REMOVE_SUCCESS,
});

export const failedRemoveClient = error => ({
  payload: BackendError.handle(error),
  type: CLIENT_REMOVE_FAILED,
});

export const startInitializeClient = params => ({
  params,
  type: CLIENT_INIT_START,
});

export const successfulInitializeClient = creationStatus => ({
  payload: creationStatus,
  type: CLIENT_INIT_SUCCESS,
});

export const failedInitializeClient = error => ({
  payload: BackendError.handle(error),
  type: CLIENT_INIT_FAILED,
});

export const resetError = () => ({
  type: CLIENT_RESET_ERROR,
});
