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

import {Self} from '@wireapp/api-client/dist/commonjs/self';
import {AppActions, SELF_ACTION} from '../action/creator/';

export interface SelfState {
  consents: {[key: number]: number};
  error: Error;
  fetched: boolean;
  fetching: boolean;
  self: Self;
}

export const initialState: SelfState = {
  consents: {},
  error: null,
  fetched: false,
  fetching: false,
  self: {assets: [], id: null, locale: null, name: null, team: null},
};

export function selfReducer(state: SelfState = initialState, action: AppActions): SelfState {
  switch (action.type) {
    case SELF_ACTION.CONSENT_GET_START:
    case SELF_ACTION.HANDLE_SET_START:
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
        consents: action.payload.reduce((consentAccumulator, consent) => {
          return {...consentAccumulator, [consent.type]: consent.value};
        }, {}),
        error: null,
        fetched: true,
        fetching: false,
      };
    }
    case SELF_ACTION.CONSENT_SET_SUCCESS: {
      return {
        ...state,
        consents: {...state.consents, [action.payload.type]: action.payload.value},
      };
    }
    default: {
      return state;
    }
  }
}
