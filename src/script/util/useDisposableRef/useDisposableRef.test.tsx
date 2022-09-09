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

import {render} from '@testing-library/react';
import {useDisposableRef} from './useDisposableRef';

const Component: React.FC<{callback: (element: HTMLElement) => () => void; state?: number; otherState?: number}> = ({
  callback,
  state = 0,
  otherState = 0,
}) => {
  const disposableRef = useDisposableRef(callback);

  return (
    <div>
      <div ref={disposableRef}>{state}</div>
      <div>{otherState}</div>
    </div>
  );
};

describe('useDisposableRef', () => {
  it('initialize the function when the component is mounted', () => {
    const initFn = jest.fn();
    render(<Component callback={initFn} />);

    expect(initFn).toHaveBeenCalled();
  });

  it('runs the dispose function when component is unmounted', () => {
    const disposeFn = jest.fn();
    const initFunction = () => disposeFn;

    const {unmount} = render(<Component callback={initFunction} />);

    expect(disposeFn).not.toHaveBeenCalled();
    unmount();
    expect(disposeFn).toHaveBeenCalled();
  });

  it('runs the dispose and the init when element updates', () => {
    const disposeFn = jest.fn();
    const initFn = jest.fn(() => disposeFn);

    const {rerender} = render(<Component callback={initFn} state={0} />);

    expect(initFn).toHaveBeenCalledTimes(1);
    expect(disposeFn).not.toHaveBeenCalled();

    rerender(<Component callback={initFn} state={1} />);
    expect(disposeFn).toHaveBeenCalled();
    expect(initFn).toHaveBeenCalledTimes(2);
  });
});
