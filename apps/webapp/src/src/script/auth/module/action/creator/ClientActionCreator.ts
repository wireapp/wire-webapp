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

import type {RegisteredClient} from '@wireapp/api-client/lib/client/';

import type {AppAction} from './';

export enum CLIENT_ACTION {
  CLIENT_INIT_SUCCESS = 'CLIENT_INIT_SUCCESS',

  CLIENT_REMOVE_FAILED = 'CLIENT_REMOVE_FAILED',
  CLIENT_REMOVE_START = 'CLIENT_REMOVE_START',
  CLIENT_REMOVE_SUCCESS = 'CLIENT_REMOVE_SUCCESS',

  CLIENT_RESET_ERROR = 'CLIENT_RESET_ERROR',
  CLIENTS_FETCH_FAILED = 'CLIENTS_FETCH_FAILED',
  CLIENTS_FETCH_START = 'CLIENTS_FETCH_START',

  CLIENTS_FETCH_SUCCESS = 'CLIENTS_FETCH_SUCCESS',
}

export type ClientActions =
  | GetAllClientsStartAction
  | GetAllClientsSuccessAction
  | GetAllClientsFailedAction
  | RemoveClientStartAction
  | RemoveClientSuccessAction
  | RemoveClientFailedAction
  | InitializeClientSuccessAction
  | ResetClientErrorsAction;

export interface GetAllClientsStartAction extends AppAction {
  readonly type: CLIENT_ACTION.CLIENTS_FETCH_START;
}
export interface GetAllClientsSuccessAction extends AppAction {
  readonly payload: RegisteredClient[];
  readonly type: CLIENT_ACTION.CLIENTS_FETCH_SUCCESS;
}
export interface GetAllClientsFailedAction extends AppAction {
  readonly error: Error;
  readonly type: CLIENT_ACTION.CLIENTS_FETCH_FAILED;
}

export interface RemoveClientStartAction extends AppAction {
  readonly type: CLIENT_ACTION.CLIENT_REMOVE_START;
}
export interface RemoveClientSuccessAction extends AppAction {
  readonly payload: string;
  readonly type: CLIENT_ACTION.CLIENT_REMOVE_SUCCESS;
}
export interface RemoveClientFailedAction extends AppAction {
  readonly error: Error;
  readonly type: CLIENT_ACTION.CLIENT_REMOVE_FAILED;
}

export interface InitializeClientSuccessAction extends AppAction {
  readonly payload: {
    isNew: boolean;
    client: RegisteredClient;
  };
  readonly type: CLIENT_ACTION.CLIENT_INIT_SUCCESS;
}

export interface ResetClientErrorsAction extends AppAction {
  readonly type: CLIENT_ACTION.CLIENT_RESET_ERROR;
}

export class ClientActionCreator {
  static startGetAllClients = (): GetAllClientsStartAction => ({
    type: CLIENT_ACTION.CLIENTS_FETCH_START,
  });
  static successfulGetAllClients = (clients: RegisteredClient[]): GetAllClientsSuccessAction => ({
    payload: clients,
    type: CLIENT_ACTION.CLIENTS_FETCH_SUCCESS,
  });
  static failedGetAllClients = (error: Error): GetAllClientsFailedAction => ({
    error,
    type: CLIENT_ACTION.CLIENTS_FETCH_FAILED,
  });

  static startRemoveClient = (): RemoveClientStartAction => ({
    type: CLIENT_ACTION.CLIENT_REMOVE_START,
  });
  static successfulRemoveClient = (deletedClientId: string): RemoveClientSuccessAction => ({
    payload: deletedClientId,
    type: CLIENT_ACTION.CLIENT_REMOVE_SUCCESS,
  });
  static failedRemoveClient = (error: Error): RemoveClientFailedAction => ({
    error,
    type: CLIENT_ACTION.CLIENT_REMOVE_FAILED,
  });

  static successfulInitializeClient = (creationStatus: {
    isNew: boolean;
    client: RegisteredClient;
  }): InitializeClientSuccessAction => ({
    payload: creationStatus,
    type: CLIENT_ACTION.CLIENT_INIT_SUCCESS,
  });

  static resetError = (): ResetClientErrorsAction => ({
    type: CLIENT_ACTION.CLIENT_RESET_ERROR,
  });
}
