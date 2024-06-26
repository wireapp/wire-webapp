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

import {fireEvent, waitFor} from '@testing-library/react';

import {SetHandle} from './SetHandle';

import {actionRoot} from '../module/action';
import {initialRootState} from '../module/reducer';
import {mockStoreFactory} from '../util/test/mockStoreFactory';
import {mountComponent} from '../util/test/TestUtil';

const handleInputId = 'enter-handle';
const setHandleButtonId = 'do-send-handle';

describe('SetHandle', () => {
  it('has disabled submit button as long as there is no input', async () => {
    spyOn(actionRoot.selfAction, 'doGetConsents').and.returnValue(() => Promise.resolve());
    spyOn(actionRoot.userAction, 'checkHandles').and.returnValue(() => Promise.resolve());
    const {getByTestId} = mountComponent(<SetHandle />, mockStoreFactory()(initialRootState));

    await waitFor(() => getByTestId(handleInputId));
    const handleInput = getByTestId(handleInputId);
    const setHandleButton = getByTestId(setHandleButtonId) as HTMLButtonElement;

    expect(setHandleButton.disabled).toBe(true);
    fireEvent.change(handleInput, {target: {value: 'e'}});

    expect(setHandleButton.disabled).toBe(false);
  });

  it('trims the handle', async () => {
    spyOn(actionRoot.userAction, 'checkHandles').and.returnValue(() => Promise.resolve());
    spyOn(actionRoot.selfAction, 'doGetConsents').and.returnValue(() => Promise.resolve());
    spyOn(actionRoot.selfAction, 'setHandle').and.returnValue(() => Promise.resolve());

    const handle = 'handle';

    const {getByTestId} = mountComponent(<SetHandle />, mockStoreFactory()(initialRootState));

    await waitFor(() => getByTestId(handleInputId));
    const handleInput = getByTestId(handleInputId);
    const setHandleButton = getByTestId(setHandleButtonId) as HTMLButtonElement;
    fireEvent.change(handleInput, {target: {value: ` ${handle} `}});

    fireEvent.click(setHandleButton);

    expect(actionRoot.selfAction.setHandle).toHaveBeenCalledWith(handle);
  });
});
