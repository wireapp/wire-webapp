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

import type {SSOSettings} from '@wireapp/api-client/src/account/SSOSettings';
import type {LoginData} from '@wireapp/api-client/src/auth';
import {ClientType} from '@wireapp/api-client/src/client';
import type {TeamData} from '@wireapp/api-client/src/team';
import type {UserAsset} from '@wireapp/api-client/src/user';

import {Config} from '../../../Config';
import {AUTH_ACTION, AppActions, USER_ACTION} from '../action/creator/';
import {REGISTER_FLOW} from '../selector/AuthSelector';

export interface RegistrationDataState {
  accent_id: number;
  assets: UserAsset[];
  email: string;
  email_code: string;
  invitation_code: string;
  label: string;
  locale: string;
  name: string;
  password: string;
  phone: string;
  phone_code: string;
  team: TeamData;
  termsAccepted: boolean;
}

export type AuthState = {
  readonly account: RegistrationDataState;
  readonly currentFlow: string;
  readonly error: Error;
  readonly fetched: boolean;
  readonly fetching: boolean;
  readonly fetchingSSOSettings: boolean;
  readonly isAuthenticated: boolean;
  readonly loginData: Partial<LoginData>;
  readonly ssoSettings?: SSOSettings;
};

export const initialAuthState: AuthState = {
  account: {
    accent_id: null,
    assets: null,
    email: null,
    email_code: null,
    invitation_code: null,
    label: null,
    locale: null,
    name: null,
    password: null,
    phone: null,
    phone_code: null,
    team: null,
    termsAccepted: false,
  },
  currentFlow: null,
  error: null,
  fetched: false,
  fetching: false,
  fetchingSSOSettings: true,
  isAuthenticated: false,
  loginData: {
    clientType: Config.getConfig().FEATURE.DEFAULT_LOGIN_TEMPORARY_CLIENT ? ClientType.TEMPORARY : ClientType.PERMANENT,
  },
  ssoSettings: {
    default_sso_code: undefined,
  },
};

export function authReducer(state: AuthState = initialAuthState, action: AppActions): AuthState {
  switch (action.type) {
    case AUTH_ACTION.LOGIN_START:
    case AUTH_ACTION.REGISTER_JOIN_START:
    case AUTH_ACTION.REGISTER_PERSONAL_START:
    case AUTH_ACTION.REGISTER_TEAM_START:
    case USER_ACTION.USER_SEND_ACTIVATION_CODE_START: {
      return {
        ...state,
        error: null,
        fetching: true,
        isAuthenticated: false,
      };
    }
    case AUTH_ACTION.REFRESH_START: {
      return {
        ...state,
        error: null,
        fetching: true,
      };
    }
    case AUTH_ACTION.REFRESH_FAILED: {
      return {
        ...state,
        fetching: false,
        isAuthenticated: false,
      };
    }
    case AUTH_ACTION.LOGIN_FAILED:
    case AUTH_ACTION.REGISTER_JOIN_FAILED:
    case AUTH_ACTION.REGISTER_PERSONAL_FAILED:
    case AUTH_ACTION.REGISTER_TEAM_FAILED:
    case USER_ACTION.USER_SEND_ACTIVATION_CODE_FAILED: {
      return {
        ...state,
        error: action.error,
        fetching: false,
        isAuthenticated: false,
      };
    }
    case AUTH_ACTION.LOGIN_SUCCESS:
    case AUTH_ACTION.REFRESH_SUCCESS:
    case AUTH_ACTION.REGISTER_JOIN_SUCCESS:
    case AUTH_ACTION.REGISTER_PERSONAL_SUCCESS:
    case AUTH_ACTION.REGISTER_TEAM_SUCCESS: {
      return {
        ...state,
        account: {...initialAuthState.account},
        error: null,
        fetched: true,
        fetching: false,
        isAuthenticated: true,
      };
    }
    case AUTH_ACTION.GET_SSO_SETTINGS_START: {
      return {
        ...state,
        fetchingSSOSettings: true,
      };
    }
    case AUTH_ACTION.GET_SSO_SETTINGS_SUCCESS: {
      return {
        ...state,
        fetchingSSOSettings: false,
        ssoSettings: action.payload,
      };
    }
    case AUTH_ACTION.GET_SSO_SETTINGS_FAILED: {
      return {
        ...state,
        fetchingSSOSettings: false,
      };
    }
    case AUTH_ACTION.REGISTER_PUSH_ACCOUNT_DATA: {
      return {...state, account: {...state.account, ...action.payload}, error: null};
    }
    case AUTH_ACTION.REGISTER_RESET_ACCOUNT_DATA: {
      return {...state, account: {...initialAuthState.account}, error: null};
    }
    case AUTH_ACTION.PUSH_LOGIN_DATA: {
      return {...state, error: null, loginData: {...state.loginData, ...action.payload}};
    }
    case AUTH_ACTION.RESET_LOGIN_DATA: {
      return {...state, error: null, loginData: {...initialAuthState.loginData}};
    }
    case AUTH_ACTION.LOGOUT_SUCCESS: {
      return {...initialAuthState, fetchingSSOSettings: false};
    }
    case AUTH_ACTION.SILENT_LOGOUT_SUCCESS: {
      return {
        ...state,
        error: null,
        isAuthenticated: false,
      };
    }
    case AUTH_ACTION.AUTH_RESET_ERROR: {
      return {...state, error: null};
    }
    case AUTH_ACTION.ENTER_TEAM_CREATION_FLOW: {
      return {...state, currentFlow: REGISTER_FLOW.TEAM};
    }
    case AUTH_ACTION.ENTER_PERSONAL_CREATION_FLOW: {
      return {...state, currentFlow: REGISTER_FLOW.PERSONAL};
    }
    case AUTH_ACTION.ENTER_GENERIC_INVITATION_FLOW: {
      return {...state, currentFlow: REGISTER_FLOW.GENERIC_INVITATION};
    }
    case USER_ACTION.USER_SEND_ACTIVATION_CODE_SUCCESS: {
      return {
        ...state,
        fetching: false,
      };
    }
    default: {
      return state;
    }
  }
}
