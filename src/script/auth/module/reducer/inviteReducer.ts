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

import type {TeamInvitation} from '@wireapp/api-client/lib/team/';

import {INVITATION_ACTION, InvitationActions} from '../action/creator/';

export interface InvitationState {
  error: Error;
  fetching: boolean;
  invites: TeamInvitation[];
}

export const initialInvitationState: InvitationState = {
  error: null,
  fetching: false,
  invites: [],
};

export function invitationReducer(
  state: InvitationState = initialInvitationState,
  action: InvitationActions,
): InvitationState {
  switch (action.type) {
    case INVITATION_ACTION.INVITE_ADD_START: {
      return {
        ...state,
        fetching: true,
      };
    }
    case INVITATION_ACTION.INVITE_ADD_SUCCESS: {
      return {
        error: null,
        fetching: false,
        invites: [...state.invites, action.payload.invite],
      };
    }
    case INVITATION_ACTION.INVITE_ADD_FAILED: {
      return {
        ...state,
        error: action.error,
        fetching: false,
      };
    }
    case INVITATION_ACTION.INVITE_RESET_ERROR: {
      return {...state, error: null};
    }
    default:
      return state;
  }
}
