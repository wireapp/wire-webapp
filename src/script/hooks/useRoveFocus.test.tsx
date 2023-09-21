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

import {render, fireEvent} from '@testing-library/react';

import {useRoveFocus} from './useRoveFocus';

const renderHTML = (currentFocus: number, handleKeyDown: (e: React.KeyboardEvent) => void) => {
  return (
    <div role="button" tabIndex={currentFocus} onKeyDown={handleKeyDown}>
      <div data-uie-name="current-focus">{currentFocus}</div>
    </div>
  );
};
describe('useRoveFocus', () => {
  it('should set the initial focus to the default value', () => {
    function TestComponent() {
      const {currentFocus} = useRoveFocus(3);
      return <div data-uie-name="current-focus">{currentFocus}</div>;
    }
    const {getByTestId} = render(<TestComponent />);
    expect(getByTestId('current-focus').textContent).toBe('0');
  });

  it('should set the initial focus to the specified value', () => {
    function TestComponent() {
      const {currentFocus} = useRoveFocus(3, 2);
      return <div data-uie-name="current-focus">{currentFocus}</div>;
    }
    const {getByTestId} = render(<TestComponent />);
    expect(getByTestId('current-focus').textContent).toBe('2');
  });

  it('should set the focus to the next item when the arrow down key is pressed', () => {
    const TestComponent = () => {
      const {currentFocus, handleKeyDown} = useRoveFocus(3);
      return renderHTML(currentFocus, handleKeyDown);
    };
    const {getByTestId} = render(<TestComponent />);
    fireEvent.keyDown(getByTestId('current-focus'), {key: 'ArrowDown'});
    expect(getByTestId('current-focus').textContent).toBe('1');
  });

  it('should set the focus to the previous item when the arrow up key is pressed', () => {
    const TestComponent = () => {
      const {currentFocus, handleKeyDown} = useRoveFocus(3, 1);
      return renderHTML(currentFocus, handleKeyDown);
    };
    const {getByTestId} = render(<TestComponent />);
    fireEvent.keyDown(getByTestId('current-focus'), {key: 'ArrowUp'});
    expect(getByTestId('current-focus').textContent).toBe('0');
  });

  it('should set the focus to the first item when the tab key is pressed', () => {
    const TestComponent = () => {
      const {currentFocus, handleKeyDown} = useRoveFocus(3, 1);
      return renderHTML(currentFocus, handleKeyDown);
    };
    const {getByTestId} = render(<TestComponent />);
    fireEvent.keyDown(getByTestId('current-focus'), {key: 'Tab'});
    expect(getByTestId('current-focus').textContent).toBe('0');
  });

  it('should not change the focus when an unsupported key is pressed', () => {
    const TestComponent = () => {
      const {currentFocus, handleKeyDown} = useRoveFocus(3);
      return renderHTML(currentFocus, handleKeyDown);
    };
    const {getByTestId} = render(<TestComponent />);
    fireEvent.keyDown(getByTestId('current-focus'), {key: 'UnsupportedKey'});
    expect(getByTestId('current-focus').textContent).toBe('0');
  });

  it('should wrap around to the first item when the last item is focused and the arrow down key is pressed (if infinite is set to true)', () => {
    const TestComponent = () => {
      const {currentFocus, handleKeyDown} = useRoveFocus(3, 2, true);
      return renderHTML(currentFocus, handleKeyDown);
    };
    const {getByTestId} = render(<TestComponent />);
    fireEvent.keyDown(getByTestId('current-focus'), {key: 'ArrowDown'});
    expect(getByTestId('current-focus').textContent).toBe('0');
  });

  it('should wrap around to the last item when the first item is focused and the arrow up key is pressed (if infinite is set to true)', () => {
    const TestComponent = () => {
      const {currentFocus, handleKeyDown} = useRoveFocus(3, 0, true);
      return renderHTML(currentFocus, handleKeyDown);
    };
    const {getByTestId} = render(<TestComponent />);
    fireEvent.keyDown(getByTestId('current-focus'), {key: 'ArrowUp'});
    expect(getByTestId('current-focus').textContent).toBe('2');
  });

  it('should not wrap around when the last item is focused and the arrow down key is pressed (if infinite is set to false)', () => {
    const TestComponent = () => {
      const {currentFocus, handleKeyDown} = useRoveFocus(3, 2, false);
      return renderHTML(currentFocus, handleKeyDown);
    };
    const {getByTestId} = render(<TestComponent />);
    fireEvent.keyDown(getByTestId('current-focus'), {key: 'ArrowDown'});
    expect(getByTestId('current-focus').textContent).not.toBe('0');
  });
});
