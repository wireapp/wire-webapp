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

import * as UserAction from './UserAction';
import * as UserActionCreator from './creator/UserActionCreator';
import {mockStore} from '../../util/TestUtil';

describe('UserAction', () => {
  describe('when activating an account', () => {
    it('triggers an action', done => {
      const code = 'code';
      const key = 'key';

      const expectedActions = [
        {params: [code, key], type: UserActionCreator.USER_ACTIVATION_START},
        {payload: undefined, type: UserActionCreator.USER_ACTIVATION_SUCCESS},
      ];

      const store = mockStore(undefined, {
        apiClient: {
          user: {
            api: {
              postActivation: ({dryrun}) => {
                expect(dryrun).toBe(false);
                return Promise.resolve();
              },
            },
          },
        },
      });

      return store.dispatch(UserAction.doActivateAccount(code, key)).then(() => {
        expect(store.getActions()).toEqual(expectedActions);
        done();
      });
    });
  });
});
