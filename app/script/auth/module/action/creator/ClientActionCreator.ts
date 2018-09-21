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

export enum CLIENT_ACTION {
  CLIENTS_FETCH_START = 'CLIENTS_FETCH_START',
  CLIENTS_FETCH_SUCCESS = 'CLIENTS_FETCH_SUCCESS',
  CLIENTS_FETCH_FAILED = 'CLIENTS_FETCH_FAILED',

  CLIENT_REMOVE_START = 'CLIENT_REMOVE_START',
  CLIENT_REMOVE_SUCCESS = 'CLIENT_REMOVE_SUCCESS',
  CLIENT_REMOVE_FAILED = 'CLIENT_REMOVE_FAILED',

  CLIENT_INIT_START = 'CLIENT_INIT_START',
  CLIENT_INIT_SUCCESS = 'CLIENT_INIT_SUCCESS',
  CLIENT_INIT_FAILED = 'CLIENT_INIT_FAILED',

  CLIENT_RESET_ERROR = 'CLIENT_RESET_ERROR',
}

export type ClientActions = any;

export class ClientActionCreator {
  static startGetAllClients = () => ({
    type: CLIENT_ACTION.CLIENTS_FETCH_START,
  });

  static successfulGetAllClients = clients => ({
    payload: clients,
    type: CLIENT_ACTION.CLIENTS_FETCH_SUCCESS,
  });

  static failedGetAllClients = (error?: any) => ({
    payload: error,
    type: CLIENT_ACTION.CLIENTS_FETCH_FAILED,
  });

  static startRemoveClient = (params?: any) => ({
    params,
    type: CLIENT_ACTION.CLIENT_REMOVE_START,
  });

  static successfulRemoveClient = deletedClientId => ({
    payload: deletedClientId,
    type: CLIENT_ACTION.CLIENT_REMOVE_SUCCESS,
  });

  static failedRemoveClient = (error?: any) => ({
    payload: error,
    type: CLIENT_ACTION.CLIENT_REMOVE_FAILED,
  });

  static startInitializeClient = (params?: any) => ({
    params,
    type: CLIENT_ACTION.CLIENT_INIT_START,
  });

  static successfulInitializeClient = creationStatus => ({
    payload: creationStatus,
    type: CLIENT_ACTION.CLIENT_INIT_SUCCESS,
  });

  static failedInitializeClient = (error?: any) => ({
    payload: error,
    type: CLIENT_ACTION.CLIENT_INIT_FAILED,
  });

  static resetError = () => ({
    type: CLIENT_ACTION.CLIENT_RESET_ERROR,
  });
}
