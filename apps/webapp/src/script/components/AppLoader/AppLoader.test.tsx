/*
 * Wire
 * Copyright (C) 2021 Wire Swiss GmbH
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

import {act, render, waitFor} from '@testing-library/react';

import {User} from 'Repositories/entity/User';

import {AppLoader} from '.';

describe('AppLoader', () => {
  it('triggers loading of the app once mounted', async () => {
    jest.useFakeTimers();
    let nextStep: (message: string) => void = () => {};
    let done: () => void = () => {};
    const init = jest.fn(async (onProgress: (m: string) => void) => {
      nextStep = (message: string) => onProgress(message);
      return new Promise<User>(resolve => (done = () => resolve(new User())));
    });

    const {queryByText, getByText} = render(<AppLoader init={init}>{() => <div>LoadedApp</div>}</AppLoader>);

    act(() => nextStep('first'));
    expect(getByText('first')).not.toBe(null);
    expect(queryByText('LoadedApp')).toBe(null);
    act(() => nextStep('second'));
    expect(getByText('second')).not.toBe(null);
    expect(queryByText('LoadedApp')).toBe(null);
    done();
    await waitFor(() => expect(getByText('LoadedApp')).not.toBe(null));
  });
});
