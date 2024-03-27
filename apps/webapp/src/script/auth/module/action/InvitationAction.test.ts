/*
 * Wire
 * Copyright (C) 2019 Wire Swiss GmbH
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

import {InvitationActionCreator} from './creator';

import {mockStoreFactory} from '../../util/test/mockStoreFactory';
import {initialInvitationState} from '../reducer/inviteReducer';
import {initialLanguageState} from '../reducer/languageReducer';
import {initialSelfState} from '../reducer/selfReducer';

import {actionRoot} from '.';

describe('InvitationAction', () => {
  it('invites by email', async () => {
    const email = 'mail@mail.com';
    const expectedInvitation = 'invite';
    const mockedActions = {};
    const mockedApiClient = {
      api: {
        teams: {
          invitation: {postInvitation: () => Promise.resolve('invite')},
        },
      },
    };

    const store = mockStoreFactory({
      actions: mockedActions,
      apiClient: mockedApiClient,
    })({
      inviteState: {...initialInvitationState},
      languageState: {...initialLanguageState},
      selfState: {...initialSelfState},
    });
    await store.dispatch(actionRoot.invitationAction.invite({email}));

    expect(store.getActions()).toEqual([
      InvitationActionCreator.startAddInvite(),
      InvitationActionCreator.successfulAddInvite(expectedInvitation),
    ]);
  });

  it('handles failed invite by email', async () => {
    const error = new Error('test error');
    const email = 'mail@mail.com';
    const mockedActions = {};
    const mockedApiClient = {
      api: {
        teams: {
          invitation: {postInvitation: () => Promise.reject(error)},
        },
      },
    };

    const store = mockStoreFactory({
      actions: mockedActions,
      apiClient: mockedApiClient,
    })({
      inviteState: {...initialInvitationState},
      languageState: {...initialLanguageState},
      selfState: {...initialSelfState},
    });
    await expect(store.dispatch(actionRoot.invitationAction.invite({email}))).rejects.toThrow();
    expect(store.getActions()).toEqual([
      InvitationActionCreator.startAddInvite(),
      InvitationActionCreator.failedAddInvite(error),
    ]);
  });
});
