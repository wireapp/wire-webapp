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

import {ReactWrapper} from 'enzyme';
import {actionRoot} from '../module/action';
import {initialRootState, RootState, Api} from '../module/reducer';
import {mockStoreFactory} from '../util/test/mockStoreFactory';
import {mountComponent} from '../util/test/TestUtil';
import SetHandle from './SetHandle';
import {MockStoreEnhanced} from 'redux-mock-store';
import {ThunkDispatch} from 'redux-thunk';
import {AnyAction} from 'redux';
import {TypeUtil} from '@wireapp/commons';
import {History} from 'history';

jest.mock('../util/SVGProvider');

class SetHandlePage {
  private readonly driver: ReactWrapper;

  constructor(
    store: MockStoreEnhanced<TypeUtil.RecursivePartial<RootState>, ThunkDispatch<RootState, Api, AnyAction>>,
    history?: History<any>,
  ) {
    this.driver = mountComponent(<SetHandle />, store, history);
  }

  getHandleInput = () => this.driver.find('input[data-uie-name="enter-handle"]');
  getSetHandleButton = () => this.driver.find('button[data-uie-name="do-send-handle"]');
  getErrorMessage = (errorLabel?: string) =>
    this.driver.find(`[data-uie-name="error-message"]${errorLabel ? `[data-uie-value="${errorLabel}"]` : ''}`);

  clickSetHandleButton = () => this.getSetHandleButton().simulate('submit');

  enterHandle = (value: string) => this.getHandleInput().simulate('change', {target: {value}});
}

describe('SetHandle', () => {
  it('has disabled submit button as long as there is no input', () => {
    spyOn(actionRoot.selfAction, 'doGetConsents').and.returnValue(() => Promise.resolve());
    spyOn(actionRoot.userAction, 'checkHandles').and.returnValue(() => Promise.resolve());
    const setHandlePage = new SetHandlePage(
      mockStoreFactory()({
        ...initialRootState,
        runtimeState: {
          hasCookieSupport: true,
          hasIndexedDbSupport: true,
          isSupportedBrowser: true,
        },
      }),
    );

    expect(setHandlePage.getHandleInput().exists()).toBe(true);

    expect(setHandlePage.getSetHandleButton().exists()).toBe(true);

    expect(setHandlePage.getSetHandleButton().props().disabled).toBe(true);
    setHandlePage.enterHandle('e');

    expect(setHandlePage.getSetHandleButton().props().disabled).toBe(false);
  });

  it('trims the handle', () => {
    spyOn(actionRoot.userAction, 'checkHandles').and.returnValue(() => Promise.resolve());
    spyOn(actionRoot.selfAction, 'doGetConsents').and.returnValue(() => Promise.resolve());
    spyOn(actionRoot.selfAction, 'setHandle').and.returnValue(() => Promise.resolve());

    const handle = 'handle';

    const setHandlePage = new SetHandlePage(
      mockStoreFactory()({
        ...initialRootState,
        runtimeState: {
          hasCookieSupport: true,
          hasIndexedDbSupport: true,
          isSupportedBrowser: true,
        },
      }),
    );

    setHandlePage.getHandleInput().simulate('change', {target: {value: ` ${handle} `}});
    setHandlePage.clickSetHandleButton();

    expect(actionRoot.selfAction.setHandle).toHaveBeenCalledWith(handle);
  });
});
