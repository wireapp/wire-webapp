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

import {RegisteredClient} from '@wireapp/api-client/dist/commonjs/client/index';
import {AUTH_ACTION, AppActions, CLIENT_ACTION, NOTIFICATION_ACTION} from '../action/creator/';

export interface ClientState {
  clients: RegisteredClient[];
  error: Error;
  fetching: boolean;
  hasHistory: boolean;
  isNewClient: boolean;
}

const initialState: ClientState = {
  clients: [],
  error: null,
  fetching: false,
  hasHistory: null,
  isNewClient: null,
};

export function clientReducer(state: ClientState = initialState, action: AppActions): ClientState {
  switch (action.type) {
    case CLIENT_ACTION.CLIENT_INIT_SUCCESS: {
      return {
        ...state,
        isNewClient: action.payload.isNewClient,
      };
    }
    case CLIENT_ACTION.CLIENTS_FETCH_START: {
      return {
        ...state,
        fetching: true,
      };
    }
    case CLIENT_ACTION.CLIENTS_FETCH_SUCCESS: {
      return {
        ...state,
        clients: action.payload,
        error: null,
        fetching: false,
      };
    }
    case CLIENT_ACTION.CLIENTS_FETCH_FAILED: {
      return {
        ...state,
        error: action.error,
        fetching: false,
      };
    }
    case CLIENT_ACTION.CLIENT_REMOVE_START: {
      return {
        ...state,
        fetching: true,
      };
    }
    case CLIENT_ACTION.CLIENT_REMOVE_SUCCESS: {
      return {
        ...state,
        clients: [...state.clients.filter(client => client.id === action.payload)],
        error: null,
        fetching: false,
      };
    }
    case CLIENT_ACTION.CLIENT_REMOVE_FAILED: {
      return {
        ...state,
        error: action.error,
        fetching: false,
      };
    }
    case NOTIFICATION_ACTION.NOTIFICATION_CHECK_HISTORY_SUCCESS: {
      return {...state, hasHistory: action.payload};
    }
    case NOTIFICATION_ACTION.NOTIFICATION_CHECK_HISTORY_RESET: {
      return {...state, hasHistory: initialState.hasHistory};
    }
    case CLIENT_ACTION.CLIENT_RESET_ERROR: {
      return {...state, error: null};
    }
    case AUTH_ACTION.LOGOUT_SUCCESS: {
      return {...initialState};
    }
    default:
      return state;
  }
}
