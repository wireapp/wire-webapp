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

import * as InviteActionCreator from './creator/InviteActionCreator';
import * as InviteSelector from '../selector/InviteSelector';
import * as selfSelector from '../selector/SelfSelector';
import * as languageSelector from '../selector/LanguageSelector';
import BackendError from './BackendError';

export function invite(invitation) {
  const params = [...arguments];
  return function(dispatch, getState, {apiClient}) {
    dispatch(InviteActionCreator.startAddInvite(params));
    const state = getState();
    const inviteList = InviteSelector.getInvites(state);
    const invitationEmail = invitation.email && invitation.email.toLowerCase();
    const alreadyInvited = inviteList.find(inviteItem => inviteItem.email.toLowerCase() === invitationEmail);
    if (alreadyInvited) {
      const error = new BackendError({
        code: 409,
        label: BackendError.LABEL.ALREADY_INVITED,
        message: 'This email has already been invited',
      });
      dispatch(InviteActionCreator.failedAddInvite(error));
      throw error;
    }

    invitation.locale = languageSelector.getLanguage(state);
    invitation.inviter_name = selfSelector.getSelfName(state);
    const teamId = selfSelector.getSelfTeamId(state);
    return Promise.resolve()
      .then(() => apiClient.teams.invitation.api.postInvitation(teamId, invitation))
      .then(createdInvite => dispatch(InviteActionCreator.successfulAddInvite(createdInvite)))
      .catch(error => {
        dispatch(InviteActionCreator.failedAddInvite(error));
        throw error;
      });
  };
}
