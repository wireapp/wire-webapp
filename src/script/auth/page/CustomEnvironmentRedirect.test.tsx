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

import {act} from '@testing-library/react';

import {CustomEnvironmentRedirect} from './CustomEnvironmentRedirect';

import {actionRoot} from '../module/action';
import {initialRootState} from '../module/reducer';
import {mockStoreFactory} from '../util/test/mockStoreFactory';
import {mountComponent} from '../util/test/TestUtil';

function createMockedURLSearchParams(value: string) {
  return class MockedURLSearchParams extends window.URLSearchParams {
    constructor() {
      super();
    }

    get() {
      return value;
    }
  };
}
describe('CustomEnvironmentRedirect', () => {
  it('redirects to the given url after some time', async () => {
    jest.useFakeTimers();

    const expectedHost = 'http://localhost:8080?test=true&clienttype=permanent&sso_auto_login=true';
    const originalURLSearchParams = window.URLSearchParams;
    window.URLSearchParams = createMockedURLSearchParams(expectedHost);
    spyOn(actionRoot.navigationAction, 'doNavigate').and.returnValue(() => {});
    mountComponent(<CustomEnvironmentRedirect />, mockStoreFactory()(initialRootState));

    act(() => {
      jest.advanceTimersByTime(1000);
    });
    expect(actionRoot.navigationAction.doNavigate).toHaveBeenCalledTimes(0);
    act(() => {
      jest.advanceTimersByTime(5000);
    });

    expect(actionRoot.navigationAction.doNavigate).toHaveBeenCalledWith(expectedHost);

    jest.useRealTimers();
    window.URLSearchParams = originalURLSearchParams;
  });
});
