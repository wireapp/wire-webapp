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

import type {SSOSettings} from '@wireapp/api-client/lib/account/SSOSettings';
import {LoginData} from '@wireapp/api-client/lib/auth';
import {ClientType} from '@wireapp/api-client/lib/client/';
import {OAuthClient} from '@wireapp/api-client/lib/oauth/OAuthClient';
import type {TeamData} from '@wireapp/api-client/lib/team/';
import type {UserAsset} from '@wireapp/api-client/lib/user/';

import {Config} from '../../../Config';
import {AUTH_ACTION, AppActions, USER_ACTION} from '../action/creator/';

export interface RegistrationDataState {
  accent_id?: number;
  assets: UserAsset[] | [];
  email?: string;
  email_code: string | null;
  invitation_code?: string;
  label?: string;
  locale?: string;
  name: string;
  password?: string;
  team?: TeamData;
  termsAccepted: boolean;
  privacyPolicyAccepted: boolean;
  customBackendURL: string;
  accountCreationEnabled: boolean;
  shouldDisplayWarning: boolean;
}

export type LoginDataState = Pick<LoginData, 'clientType'>;

export type AuthState = {
  readonly account: RegistrationDataState;
  readonly currentFlow: string | null;
  readonly entropy?: Uint8Array;
  readonly error: Error | null;
  readonly fetched: boolean;
  readonly fetching: boolean;
  readonly fetchingSSOSettings: boolean;
  readonly isAuthenticated: boolean;
  readonly isSendingTwoFactorCode: boolean;
  readonly loginData: LoginDataState;
  readonly oAuthApp?: OAuthClient;
  readonly ssoSettings?: SSOSettings;
};

export const initialAuthState: AuthState = {
  account: {
    assets: [],
    email_code: null,
    termsAccepted: false,
    customBackendURL: '',
    accountCreationEnabled: false,
    shouldDisplayWarning: false,
    privacyPolicyAccepted: false,
    name: '',
  },
  currentFlow: null,
  error: null,
  fetched: false,
  fetching: false,
  fetchingSSOSettings: true,
  isAuthenticated: false,
  isSendingTwoFactorCode: false,
  loginData: {
    clientType: Config.getConfig().FEATURE.DEFAULT_LOGIN_TEMPORARY_CLIENT ? ClientType.TEMPORARY : ClientType.PERMANENT,
  },
  oAuthApp: undefined,
  ssoSettings: {
    default_sso_code: '',
  },
};

export function authReducer(state: AuthState = initialAuthState, action: AppActions): AuthState {
  switch (action.type) {
    case AUTH_ACTION.LOGIN_START:
    case AUTH_ACTION.REGISTER_JOIN_START:
    case AUTH_ACTION.REGISTER_WIRELESS_START:
    case AUTH_ACTION.REGISTER_PERSONAL_START:
    case USER_ACTION.USER_SEND_ACTIVATION_CODE_START: {
      return {
        ...state,
        error: null,
        fetching: true,
        isAuthenticated: false,
      };
    }
    case AUTH_ACTION.SEND_TWO_FACTOR_CODE_START: {
      return {
        ...state,
        isSendingTwoFactorCode: true,
      };
    }
    case AUTH_ACTION.SEND_TWO_FACTOR_CODE_SUCCESS: {
      return {
        ...state,
        isSendingTwoFactorCode: false,
      };
    }
    case AUTH_ACTION.SEND_TWO_FACTOR_CODE_FAILED: {
      return {
        ...state,
        error: action.error,
        isSendingTwoFactorCode: false,
      };
    }
    case AUTH_ACTION.FETCH_OAUTH_APP_START:
    case AUTH_ACTION.FETCH_TEAM_START:
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
    case AUTH_ACTION.REGISTER_WIRELESS_FAILED:
    case USER_ACTION.USER_SEND_ACTIVATION_CODE_FAILED: {
      return {
        ...state,
        error: action.error,
        fetching: false,
        isAuthenticated: false,
      };
    }
    case AUTH_ACTION.FETCH_OAUTH_APP_FAILED:
    case AUTH_ACTION.FETCH_TEAM_FAILED: {
      return {
        ...state,
        error: action.error,
        fetching: false,
      };
    }
    case AUTH_ACTION.LOGIN_SUCCESS:
    case AUTH_ACTION.REFRESH_SUCCESS:
    case AUTH_ACTION.REGISTER_JOIN_SUCCESS:
    case AUTH_ACTION.REGISTER_WIRELESS_SUCCESS:
    case AUTH_ACTION.REGISTER_PERSONAL_SUCCESS: {
      return {
        ...state,
        account: {...initialAuthState.account},
        error: null,
        fetched: true,
        fetching: false,
        isAuthenticated: true,
      };
    }
    case AUTH_ACTION.FETCH_TEAM_SUCCESS: {
      return {
        ...state,
        account: {...state.account, team: action.payload},
        error: null,
        fetched: true,
        fetching: false,
      };
    }
    case AUTH_ACTION.FETCH_OAUTH_APP_SUCCESS: {
      return {
        ...state,
        oAuthApp: action.payload,
        error: null,
        fetched: true,
        fetching: false,
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
    case AUTH_ACTION.REGISTER_PUSH_ENTROPY_DATA: {
      return {...state, entropy: action.payload, error: null};
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
