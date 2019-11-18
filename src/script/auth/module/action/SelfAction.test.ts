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

import {Self} from '@wireapp/api-client/dist/commonjs/self';
import {actionRoot} from '.';
import {mockStoreFactory} from '../../util/test/mockStoreFactory';
import {SelfActionCreator} from './creator/';

describe('SelfAction', () => {
  it('fetches the self user', async () => {
    const selfUser = ({assets: [], id: 'selfUserId'} as unknown) as Self;
    const team = {teams: [{binding: true, id: 'team'}]};
    const expectedSelfUser = ({assets: [], id: 'selfUserId', team: 'team'} as unknown) as Self;
    const spies = {
      doCheckPasswordState: jasmine.createSpy().and.returnValue(() => Promise.resolve()),
    };
    const mockedActions = {
      selfAction: {
        doCheckPasswordState: spies.doCheckPasswordState,
      },
    };
    const mockedApiClient = {
      self: {
        api: {
          getSelf: () => Promise.resolve(selfUser),
        },
      },
      teams: {
        team: {
          api: {
            getTeams: () => Promise.resolve(team),
          },
        },
      },
    };
    const mockedCore = {};

    const store = mockStoreFactory({
      actions: mockedActions,
      apiClient: mockedApiClient,
      core: mockedCore,
    })({});
    await store.dispatch(actionRoot.selfAction.fetchSelf());
    expect(store.getActions()).toEqual([
      SelfActionCreator.startFetchSelf(),
      SelfActionCreator.successfulFetchSelf(expectedSelfUser),
    ]);
    expect(spies.doCheckPasswordState.calls.count()).toEqual(1);
  });
});
