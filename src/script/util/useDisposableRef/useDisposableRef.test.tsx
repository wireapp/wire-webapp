/*
 * Wire
 * Copyright (C) 2022 Wire Swiss GmbH
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

import {render, waitFor} from '@testing-library/react';

import {useDisposableRef} from './useDisposableRef';

interface ComponentProps {
  callback: (element: HTMLElement) => () => void;
  state?: number;
  otherState?: number;
}
const Component: React.FC<ComponentProps> = ({callback, state = 0}: ComponentProps) => {
  const disposableRef = useDisposableRef(callback, [state]);

  return (
    <div>
      <div ref={disposableRef}>{state}</div>
    </div>
  );
};

describe('useDisposableRef', () => {
  it('initialize the function when the component is mounted', async () => {
    const initFn = jest.fn();
    render(<Component callback={initFn} />);
    await waitFor(() => expect(initFn).toHaveBeenCalled());
  });

  it('runs the dispose function when component is unmounted', async () => {
    const disposeFn = jest.fn();
    const initFn = jest.fn(() => disposeFn);

    const {unmount} = render(<Component callback={initFn} />);
    await waitFor(() => expect(initFn).toHaveBeenCalled());

    expect(disposeFn).not.toHaveBeenCalled();
    unmount();
    expect(disposeFn).toHaveBeenCalled();
  });

  it('runs the dispose and the init when element updates', async () => {
    const disposeFn = jest.fn();
    const initFn = jest.fn(e => {
      return disposeFn;
    });

    const {rerender} = render(<Component callback={initFn} state={0} />);
    await waitFor(() => expect(initFn).toHaveBeenCalled());

    expect(initFn).toHaveBeenCalledTimes(1);
    expect(disposeFn).not.toHaveBeenCalled();

    rerender(<Component callback={initFn} state={1} />);
    expect(disposeFn).toHaveBeenCalled();
    expect(initFn).toHaveBeenCalledTimes(2);
  });

  it('does not re-run if component is rerendered but dependencies have not changed', () => {
    const disposeFn = jest.fn();
    const initFn = jest.fn(e => {
      return disposeFn;
    });

    const {rerender} = render(<Component callback={initFn} />);

    expect(initFn).toHaveBeenCalledTimes(1);
    expect(disposeFn).not.toHaveBeenCalled();

    rerender(<Component callback={initFn} />);
    expect(disposeFn).not.toHaveBeenCalled();
    expect(initFn).toHaveBeenCalledTimes(1);
  });
});
