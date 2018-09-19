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

import * as SelfActionCreator from '../action/creator/SelfActionCreator';

export const initialState = {
  consents: {},
  error: null,
  fetched: false,
  fetching: false,
  self: {name: null, team: null},
};

export default function reducer(state = initialState, action) {
  switch (action.type) {
    case SelfActionCreator.CONSENT_GET_START:
    case SelfActionCreator.HANDLE_SET_START:
    case SelfActionCreator.SELF_FETCH_START: {
      return {
        ...state,
        fetching: true,
      };
    }
    case SelfActionCreator.CONSENT_GET_FAILED:
    case SelfActionCreator.HANDLE_SET_FAILED:
    case SelfActionCreator.SELF_FETCH_FAILED: {
      return {
        ...state,
        error: action.payload,
        fetching: false,
      };
    }
    case SelfActionCreator.HANDLE_SET_SUCCESS:
    case SelfActionCreator.SELF_FETCH_SUCCESS: {
      return {
        ...state,
        error: null,
        fetched: true,
        fetching: false,
        self: action.payload,
      };
    }
    case SelfActionCreator.CONSENT_GET_SUCCESS: {
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
    case SelfActionCreator.CONSENT_SET_SUCCESS: {
      return {
        ...state,
        consents: {...state.constents, [action.payload.type]: action.payload.value},
      };
    }
    default: {
      return state;
    }
  }
}
