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
import {noop} from 'noop-esm';

import {User} from 'Repositories/entity/user';

import {AppLoader} from '.';
import {translateForTest} from 'Util/test/translateForTest';

describe('AppLoader', () => {
  it('triggers loading of the app once mounted', async () => {
    jest.useFakeTimers();
    let nextStep: (message: string) => void = noop;
    let done: () => void = noop;
    const init = jest.fn(async (onProgress: (m: string) => void) => {
      nextStep = (message: string) => {
        return onProgress(message);
      };
      return new Promise<User>(resolve => {
        return (done = () => {
          return resolve(new User('', '', translateForTest));
        });
      });
    });

    const {queryByText, getByText} = render(
      <AppLoader init={init}>
        {() => {
          return <div>LoadedApp</div>;
        }}
      </AppLoader>,
    );

    act(() => {
      return nextStep('first');
    });
    expect(getByText('first')).not.toBe(null);
    expect(queryByText('LoadedApp')).toBe(null);
    act(() => {
      return nextStep('second');
    });
    expect(getByText('second')).not.toBe(null);
    expect(queryByText('LoadedApp')).toBe(null);
    done();
    await waitFor(() => {
      return expect(getByText('LoadedApp')).not.toBe(null);
    });
  });
});
