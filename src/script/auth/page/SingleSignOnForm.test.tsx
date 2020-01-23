/*
 * Wire
 * Copyright (C) 2020 Wire Swiss GmbH
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

import {ReactWrapper} from 'enzyme';
import {createMemoryHistory} from 'history';
import React from 'react';
import waitForExpect from 'wait-for-expect';
import {actionRoot} from '../module/action';
import {initialRootState} from '../module/reducer';
import {ROUTE} from '../route';
import {mockStoreFactory} from '../util/test/mockStoreFactory';
import {mountComponent} from '../util/test/TestUtil';
import SingleSignOnForm from './SingleSignOnForm';

describe('SingleSignOnForm', () => {
  let wrapper: ReactWrapper;

  it('successfully logs into account with initial code', async () => {
    const history = createMemoryHistory();
    const historyPushSpy = spyOn(history, 'push');
    const doLogin = jasmine.createSpy().and.returnValue((code: string) => Promise.resolve());
    const code = 'wire-cb6e4dfc-a4b0-4c59-a31d-303a7f5eb5ab';

    spyOn(actionRoot.authAction, 'validateSSOCode').and.returnValue(() => Promise.resolve());
    spyOn(actionRoot.authAction, 'doFinalizeSSOLogin').and.returnValue(() => Promise.resolve());
    spyOn(actionRoot.clientAction, 'doGetAllClients').and.returnValue(() => Promise.resolve([]));
    spyOn(actionRoot.authAction, 'resetAuthError').and.returnValue(() => Promise.resolve());

    wrapper = mountComponent(
      <SingleSignOnForm doLogin={doLogin} initialCode={code} />,
      mockStoreFactory()({
        ...initialRootState,
        runtimeState: {
          hasCookieSupport: true,
          hasIndexedDbSupport: true,
          isSupportedBrowser: true,
        },
      }),
      history,
    );

    expect(wrapper.find('input[data-uie-name="enter-code"]').exists())
      .withContext('Code input exists')
      .toBe(true);
    expect(wrapper.find('input[data-uie-name="enter-code"]').props().value)
      .withContext('Code input has initial code value')
      .toEqual(code);

    expect(actionRoot.authAction.validateSSOCode)
      .withContext('validateSSOCode function was called')
      .toHaveBeenCalledTimes(1);

    await waitForExpect(() => {
      expect(doLogin)
        .withContext('external login function was called')
        .toHaveBeenCalledTimes(1);
    });

    expect(actionRoot.authAction.doFinalizeSSOLogin)
      .withContext('doFinalizeSSOLogin function was called')
      .toHaveBeenCalledTimes(1);

    expect(historyPushSpy)
      .withContext('navigation to history page was triggered')
      .toHaveBeenCalledWith(ROUTE.HISTORY_INFO as any);
  });
});
