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
import React from 'react';
import {Config as ReadOnlyConfig} from '../../Config';
import {actionRoot} from '../module/action';
import {initialRootState} from '../module/reducer';
import {mockStoreFactory} from '../util/test/mockStoreFactory';
import {mountComponent} from '../util/test/TestUtil';
import SetHandle from './SetHandle';

const Config = ReadOnlyConfig as any;

describe('"SetHandle"', () => {
  let wrapper: ReactWrapper;

  const handleInput = () => wrapper.find('input[data-uie-name="enter-handle"]').first();
  const setHandleButton = () => wrapper.find('button[data-uie-name="do-send-handle"]').first();

  beforeAll(() => {
    Config.FEATURE = {
      CHECK_CONSENT: false,
    };
  });

  it('has disabled submit button as long as there is no input', () => {
    wrapper = mountComponent(
      <SetHandle />,
      mockStoreFactory()({
        ...initialRootState,
        runtimeState: {
          hasCookieSupport: true,
          hasIndexedDbSupport: true,
          isSupportedBrowser: true,
        },
      }),
    );

    expect(handleInput().exists())
      .withContext('handle input should be present')
      .toBe(true);
    expect(setHandleButton().exists())
      .withContext('Submit button should be present')
      .toBe(true);

    expect(setHandleButton().props().disabled)
      .withContext('Submit button should be disabled')
      .toBe(true);
    handleInput().simulate('change', {target: {value: 'e'}});
    expect(setHandleButton().props().disabled)
      .withContext('Submit button should be enabled')
      .toBe(false);
  });

  it('trims the handle', () => {
    spyOn(actionRoot.selfAction, 'setHandle').and.returnValue(() => Promise.resolve());

    const handle = 'handle';

    wrapper = mountComponent(
      <SetHandle />,
      mockStoreFactory()({
        ...initialRootState,
        runtimeState: {
          hasCookieSupport: true,
          hasIndexedDbSupport: true,
          isSupportedBrowser: true,
        },
      }),
    );

    handleInput().simulate('change', {target: {value: ` ${handle} `}});
    setHandleButton().simulate('submit');

    expect(actionRoot.selfAction.setHandle)
      .withContext('action was called')
      .toHaveBeenCalledWith(handle);
  });
});
