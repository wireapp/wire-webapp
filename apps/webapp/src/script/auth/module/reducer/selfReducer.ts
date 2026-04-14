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

import type {Self} from '@wireapp/api-client/lib/self/';
import {UserType} from '@wireapp/api-client/lib/user';

import {AppActions, AUTH_ACTION, SELF_ACTION} from '../action/creator/';

export interface SelfState {
  consents: {[key: number]: number};
  error: Error | null;
  fetched: boolean;
  fetching: boolean;
  hasPassword: boolean;
  self: Self;
}

const unsetSelf: Self = {
  accent_id: undefined,
  assets: [],
  email: undefined,
  expires_at: undefined,
  handle: undefined,
  id: '',
  locale: '',
  name: '',
  qualified_id: {id: '', domain: ''},
  sso_id: undefined,
  team: undefined,
  type: UserType.REGULAR,
};

export const initialSelfState: SelfState = {
  consents: {},
  error: null,
  fetched: false,
  fetching: false,
  hasPassword: false,
  self: unsetSelf,
};

export function selfReducer(state: SelfState = initialSelfState, action: AppActions): SelfState {
  switch (action.type) {
    case SELF_ACTION.CONSENT_GET_START:
    case SELF_ACTION.HANDLE_SET_START:
    case SELF_ACTION.SELF_SET_PASSWORD_STATE_START:
    case SELF_ACTION.SELF_FETCH_START: {
      return {
        ...state,
        fetching: true,
      };
    }
    case SELF_ACTION.CONSENT_GET_FAILED:
    case SELF_ACTION.HANDLE_SET_FAILED:
    case SELF_ACTION.SELF_FETCH_FAILED: {
      return {
        ...state,
        error: action.error,
        fetching: false,
      };
    }
    case SELF_ACTION.HANDLE_SET_SUCCESS:
    case SELF_ACTION.SELF_FETCH_SUCCESS: {
      return {
        ...state,
        error: null,
        fetched: true,
        fetching: false,
        self: action.payload,
      };
    }
    case SELF_ACTION.CONSENT_GET_SUCCESS: {
      return {
        ...state,
        consents: action.payload.reduce<Record<number, number>>((consentAccumulator, consent) => {
          consentAccumulator[consent.type] = consent.value;
          return consentAccumulator;
        }, {}),
        error: null,
        fetched: true,
        fetching: false,
      };
    }
    case SELF_ACTION.SELF_SET_PASSWORD_STATE_SUCCESS: {
      return {
        ...state,
        hasPassword: action.payload,
      };
    }
    case SELF_ACTION.SELF_SET_PASSWORD_STATE_FAILED: {
      return {
        ...state,
        error: action.error,
        hasPassword: false,
      };
    }
    case SELF_ACTION.CONSENT_SET_SUCCESS: {
      return {
        ...state,
        consents: {...state.consents, [action.payload.type]: action.payload.value},
      };
    }
    case AUTH_ACTION.LOGOUT_SUCCESS: {
      return {
        ...initialSelfState,
      };
    }
    default: {
      return state;
    }
  }
}
