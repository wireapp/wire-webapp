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

export enum INVITATION_ACTION {
  INVITE_ADD_START = 'INVITE_ADD_START',
  INVITE_ADD_SUCCESS = 'INVITE_ADD_SUCCESS',
  INVITE_ADD_FAILED = 'INVITE_ADD_FAILED',

  INVITE_RESET_ERROR = 'INVITE_RESET_ERROR',
}

export type InvitationActions =
  | ReturnType<typeof InvitationActionCreator.startAddInvite>
  | ReturnType<typeof InvitationActionCreator.successfulAddInvite>
  | ReturnType<typeof InvitationActionCreator.failedAddInvite>
  | ReturnType<typeof InvitationActionCreator.resetError>
  ;

interface StartAddInvite {
  type: INVITATION_ACTION.INVITE_ADD_START;
  params: any;
}

interface SuccessfulAddInvite {
  type: INVITATION_ACTION.INVITE_ADD_SUCCESS;
  payload: { invite: any };
}

interface FailedAddInvite {
  type: INVITATION_ACTION.INVITE_ADD_FAILED;
  payload: Error;
}

interface ResetError {
  type: INVITATION_ACTION.INVITE_RESET_ERROR;
}

export class InvitationActionCreator {
  static startAddInvite = (params?: any): StartAddInvite => ({
    params,
    type: INVITATION_ACTION.INVITE_ADD_START,
  });

  static successfulAddInvite = (invite: any): SuccessfulAddInvite => ({
    payload: {invite},
    type: INVITATION_ACTION.INVITE_ADD_SUCCESS,
  });

  static failedAddInvite = (error: Error): FailedAddInvite => ({
    payload: error,
    type: INVITATION_ACTION.INVITE_ADD_FAILED,
  });

  static resetError = (): ResetError => ({
    type: INVITATION_ACTION.INVITE_RESET_ERROR,
  });
}
