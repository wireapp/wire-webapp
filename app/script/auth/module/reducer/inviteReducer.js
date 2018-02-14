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

import * as InviteActionCreator from '../action/creator/InviteActionCreator';

const initialState = {
  error: null,
  fetching: false,
  invites: [],
};

export default function inviteReducer(state = initialState, action) {
  switch (action.type) {
    case InviteActionCreator.INVITE_ADD_START: {
      return {
        ...state,
        fetching: true,
      };
    }
    case InviteActionCreator.INVITE_ADD_SUCCESS: {
      return {
        error: null,
        fetching: false,
        invites: [...state.invites, action.payload.invite],
      };
    }
    case InviteActionCreator.INVITE_ADD_FAILED: {
      return {
        ...state,
        error: action.payload,
        fetching: false,
      };
    }
    case InviteActionCreator.INVITE_RESET_ERROR: {
      return {...state, error: null};
    }
    default:
      return state;
  }
}
