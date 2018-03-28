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

import * as AuthActionCreator from '../action/creator/AuthActionCreator';
import * as ClientActionCreator from '../action/creator/ClientActionCreator';
import * as NotificationActionCreator from '../action/creator/NotificationActionCreator';

const initialState = {
  clients: [],
  error: null,
  fetching: false,
  hasHistory: null,
};

export default function clientReducer(state = initialState, action) {
  switch (action.type) {
    case ClientActionCreator.CLIENT_INIT_SUCCESS: {
      return {
        ...state,
        isNewClient: action.payload.isNewClient,
      };
    }
    case ClientActionCreator.CLIENTS_FETCH_START: {
      return {
        ...state,
        fetching: true,
      };
    }
    case ClientActionCreator.CLIENTS_FETCH_SUCCESS: {
      return {
        ...state,
        clients: action.payload,
        error: null,
        fetching: false,
      };
    }
    case ClientActionCreator.CLIENTS_FETCH_FAILED: {
      return {
        ...state,
        error: action.payload,
        fetching: false,
      };
    }
    case ClientActionCreator.CLIENT_REMOVE_START: {
      return {
        ...state,
        fetching: true,
      };
    }
    case ClientActionCreator.CLIENT_REMOVE_SUCCESS: {
      return {
        ...state,
        clients: [state.clients.filter(client => client.id === action.payload)],
        error: null,
        fetching: false,
      };
    }
    case ClientActionCreator.CLIENT_REMOVE_FAILED: {
      return {
        ...state,
        error: action.payload,
        fetching: false,
      };
    }
    case NotificationActionCreator.NOTIFICATION_CHECK_HISTORY_SUCCESS: {
      return {...state, hasHistory: action.payload};
    }
    case NotificationActionCreator.NOTIFICATION_CHECK_HISTORY_RESET: {
      return {...state, hasHistory: initialState.hasHistory};
    }
    case ClientActionCreator.CLIENT_RESET_ERROR: {
      return {...state, error: null};
    }
    case AuthActionCreator.LOGOUT_SUCCESS: {
      return {...initialState};
    }
    default:
      return state;
  }
}
