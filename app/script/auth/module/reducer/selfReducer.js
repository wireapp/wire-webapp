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

import * as SelfActionCreator from '../action/creator/SelfActionCreator';

export const initialState = {
  error: null,
  fetched: false,
  fetching: false,
  self: {name: null, team: null},
};

export default function reducer(state = initialState, action) {
  switch (action.type) {
    case SelfActionCreator.SELF_FETCH_START: {
      return {
        ...state,
        fetching: true,
      };
    }
    case SelfActionCreator.SELF_FETCH_FAILED: {
      return {
        ...state,
        error: action.payload,
        fetching: false,
      };
    }
    case SelfActionCreator.SELF_FETCH_SUCCESS: {
      return {
        ...state,
        error: null,
        fetched: true,
        fetching: false,
        self: action.payload,
      };
    }
    default: {
      return state;
    }
  }
}
