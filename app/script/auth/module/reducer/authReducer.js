/*
 * Wire
 * Copyright (C) 2017 Wire Swiss GmbH
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
import * as UserActionCreator from '../action/creator/UserActionCreator';

export const initialState = {
  account: {
    accent_id: undefined,
    assets: undefined,
    email: undefined,
    email_code: undefined,
    invitation_code: undefined,
    label: undefined,
    locale: undefined,
    name: undefined,
    password: undefined,
    phone: undefined,
    phone_code: undefined,
    team: undefined,
  },
  error: null,
  fetched: false,
  fetching: false,
  isAuthenticated: false,
  isInTeamFlow: false,
};

export default function reducer(state = initialState, action) {
  switch (action.type) {
    case AuthActionCreator.LOGIN_START:
    case AuthActionCreator.REGISTER_JOIN_START:
    case AuthActionCreator.REGISTER_PERSONAL_START:
    case AuthActionCreator.REGISTER_TEAM_START: {
      return {
        ...state,
        error: null,
        fetching: true,
        isAuthenticated: false,
      };
    }
    case AuthActionCreator.REFRESH_START: {
      return {
        ...state,
        error: null,
        fetching: true,
      };
    }
    case AuthActionCreator.REFRESH_FAILED: {
      return {
        ...state,
        fetching: false,
        isAuthenticated: false,
      };
    }
    case AuthActionCreator.LOGIN_FAILED:
    case AuthActionCreator.REGISTER_JOIN_FAILED:
    case AuthActionCreator.REGISTER_PERSONAL_FAILED:
    case AuthActionCreator.REGISTER_TEAM_FAILED:
    case UserActionCreator.USER_SEND_ACTIVATION_CODE_FAILED: {
      return {
        ...state,
        error: action.payload,
        fetching: false,
        isAuthenticated: false,
      };
    }
    case AuthActionCreator.LOGIN_SUCCESS:
    case AuthActionCreator.REFRESH_SUCCESS:
    case AuthActionCreator.REGISTER_JOIN_SUCCESS:
    case AuthActionCreator.REGISTER_PERSONAL_SUCCESS:
    case AuthActionCreator.REGISTER_TEAM_SUCCESS: {
      return {
        ...state,
        account: {...initialState.account},
        error: null,
        fetched: true,
        fetching: false,
        isAuthenticated: true,
      };
    }
    case AuthActionCreator.REGISTER_PUSH_ACCOUNT_DATA: {
      return {...state, account: {...state.account, ...action.payload}, error: null};
    }
    case AuthActionCreator.REGISTER_RESET_ACCOUNT_DATA: {
      return {...state, account: {...initialState.account}, error: null};
    }
    case AuthActionCreator.LOGOUT_SUCCESS: {
      return {...initialState};
    }
    case AuthActionCreator.SILENT_LOGOUT_SUCCESS: {
      return {
        ...state,
        error: null,
        fetched: false,
        fetching: false,
        isAuthenticated: false,
      };
    }
    case AuthActionCreator.AUTH_RESET_ERROR: {
      return {...state, error: null};
    }
    case AuthActionCreator.ENTER_TEAM_CREATION_FLOW: {
      return {...state, isInTeamFlow: true};
    }
    case AuthActionCreator.ENTER_PERSONAL_CREATION_FLOW: {
      return {...state, isInTeamFlow: false};
    }
    default: {
      return state;
    }
  }
}
