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

import {TeamInvitation} from '@wireapp/api-client/dist/commonjs/team';

export enum INVITATION_ACTION {
  INVITE_ADD_START = 'INVITE_ADD_START',
  INVITE_ADD_SUCCESS = 'INVITE_ADD_SUCCESS',
  INVITE_ADD_FAILED = 'INVITE_ADD_FAILED',

  INVITE_RESET_ERROR = 'INVITE_RESET_ERROR',
}

export type InvitationActions =
  | AddInviteStartAction
  | AddInviteSuccessAction
  | AddInviteFailedAction
  | ResetInviteErrorAction;

export interface AddInviteStartAction {
  type: INVITATION_ACTION.INVITE_ADD_START;
}
export interface AddInviteSuccessAction {
  type: INVITATION_ACTION.INVITE_ADD_SUCCESS;
  payload: {invite: TeamInvitation};
}
export interface AddInviteFailedAction {
  type: INVITATION_ACTION.INVITE_ADD_FAILED;
  error: Error;
}

export interface ResetInviteErrorAction {
  type: INVITATION_ACTION.INVITE_RESET_ERROR;
}

export class InvitationActionCreator {
  static startAddInvite = (): AddInviteStartAction => ({
    type: INVITATION_ACTION.INVITE_ADD_START,
  });
  static successfulAddInvite = (invite: any): AddInviteSuccessAction => ({
    payload: {invite},
    type: INVITATION_ACTION.INVITE_ADD_SUCCESS,
  });
  static failedAddInvite = (error: Error): AddInviteFailedAction => ({
    error,
    type: INVITATION_ACTION.INVITE_ADD_FAILED,
  });

  static resetError = (): ResetInviteErrorAction => ({
    type: INVITATION_ACTION.INVITE_RESET_ERROR,
  });
}
