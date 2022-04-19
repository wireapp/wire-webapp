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
import {actionRoot} from '../module/action';
import {initialRootState, RootState, Api} from '../module/reducer';
import {mockStoreFactory} from '../util/test/mockStoreFactory';
import {mountComponent} from '../util/test/TestUtil';
import {TypeUtil} from '@wireapp/commons';
import {MockStoreEnhanced} from 'redux-mock-store';
import {ThunkDispatch} from 'redux-thunk';
import {AnyAction} from 'redux';
import {History} from 'history';
import CustomEnvironmentRedirect from './CustomEnvironmentRedirect';

jest.mock('../util/SVGProvider');

class CustomEnvironmentRedirectPage {
  private readonly driver: ReactWrapper;

  constructor(
    store: MockStoreEnhanced<TypeUtil.RecursivePartial<RootState>, ThunkDispatch<RootState, Api, AnyAction>>,
    history?: History,
  ) {
    this.driver = mountComponent(<CustomEnvironmentRedirect />, store, history);
  }

  update = () => this.driver.update();
}

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
    new CustomEnvironmentRedirectPage(
      mockStoreFactory()({
        ...initialRootState,
        runtimeState: {
          hasCookieSupport: true,
          hasIndexedDbSupport: true,
          isSupportedBrowser: true,
        },
      }),
    );

    jest.advanceTimersByTime(1000);
    expect(actionRoot.navigationAction.doNavigate).toHaveBeenCalledTimes(0);
    jest.advanceTimersByTime(5000);

    expect(actionRoot.navigationAction.doNavigate).toHaveBeenCalledWith(expectedHost);

    jest.useRealTimers();
    window.URLSearchParams = originalURLSearchParams;
  });
});
