/*
 * Wire
 * Copyright (C) 2023 Wire Swiss GmbH
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

import {fireEvent, renderHook} from '@testing-library/react';

import {useTypingIndicator} from './useTypingIndicator';

import {TYPING_TIMEOUT} from '../TypingIndicator';

describe('useTypingIndicator', () => {
  beforeAll(() => {
    jest.useFakeTimers();
  });

  afterAll(() => {
    jest.useRealTimers();
  });

  it('never calls the callback if user has not yet touched the keyboard', () => {
    const onTypingChange = jest.fn();
    const {rerender} = renderHook(useTypingIndicator, {
      initialProps: {text: '', isEnabled: true, onTypingChange},
    });

    expect(onTypingChange).not.toHaveBeenCalled();

    rerender({text: 'a', isEnabled: true, onTypingChange});
    expect(onTypingChange).not.toHaveBeenCalled();
  });

  it('never calls the callback if user has typed but indicator is disabled', () => {
    const onTypingChange = jest.fn();
    const {rerender} = renderHook(useTypingIndicator, {
      initialProps: {text: '', isEnabled: false, onTypingChange},
    });

    expect(onTypingChange).not.toHaveBeenCalled();

    fireEvent.keyDown(document);

    rerender({text: 'a', isEnabled: true, onTypingChange});
    expect(onTypingChange).not.toHaveBeenCalledWith();
  });

  it('calls the callback when user starts typing', () => {
    const onTypingChange = jest.fn();
    const {rerender} = renderHook(useTypingIndicator, {
      initialProps: {text: '', isEnabled: true, onTypingChange},
    });

    expect(onTypingChange).not.toHaveBeenCalled();

    fireEvent.keyDown(document);

    rerender({text: 'a', isEnabled: true, onTypingChange});
    expect(onTypingChange).toHaveBeenCalledWith(true);
  });

  it('calls the callback with false after user stops typing for a little while', () => {
    const onTypingChange = jest.fn();
    const {rerender} = renderHook(useTypingIndicator, {
      initialProps: {text: '', isEnabled: true, onTypingChange},
    });

    expect(onTypingChange).not.toHaveBeenCalled();

    fireEvent.keyDown(document);

    rerender({text: 'a', isEnabled: true, onTypingChange});

    jest.advanceTimersByTime(TYPING_TIMEOUT - 1);
    expect(onTypingChange).not.toHaveBeenCalledWith(false);

    jest.advanceTimersByTime(1);
    expect(onTypingChange).toHaveBeenCalledWith(false);
  });

  it('calls the callback with false if user deletes the text', () => {
    const onTypingChange = jest.fn();
    const {rerender} = renderHook(useTypingIndicator, {
      initialProps: {text: '', isEnabled: true, onTypingChange},
    });

    expect(onTypingChange).not.toHaveBeenCalled();

    fireEvent.keyDown(document);

    rerender({text: 'a', isEnabled: true, onTypingChange});

    expect(onTypingChange).toHaveBeenCalledWith(true);

    rerender({text: '', isEnabled: true, onTypingChange});
    expect(onTypingChange).toHaveBeenCalledWith(false);
  });

  it('calls the callback with false if component is unloaded', () => {
    const onTypingChange = jest.fn();
    const {rerender, unmount} = renderHook(useTypingIndicator, {
      initialProps: {text: '', isEnabled: true, onTypingChange},
    });

    expect(onTypingChange).not.toHaveBeenCalled();

    fireEvent.keyDown(document);

    rerender({text: 'a', isEnabled: true, onTypingChange});
    expect(onTypingChange).toHaveBeenCalledWith(true);

    unmount();
    expect(onTypingChange).toHaveBeenCalledWith(false);
  });

  it('calls the callback only once as user types', () => {
    const onTypingChange = jest.fn();
    const {rerender} = renderHook(useTypingIndicator, {
      initialProps: {text: '', isEnabled: true, onTypingChange},
    });

    expect(onTypingChange).not.toHaveBeenCalled();

    fireEvent.keyDown(document);

    rerender({text: 'a', isEnabled: true, onTypingChange});
    expect(onTypingChange).toHaveBeenCalledWith(true);

    rerender({text: 'ab', isEnabled: true, onTypingChange});
    expect(onTypingChange).toHaveBeenCalledTimes(1);

    rerender({text: 'abc', isEnabled: true, onTypingChange});
    expect(onTypingChange).toHaveBeenCalledTimes(1);

    jest.advanceTimersByTime(TYPING_TIMEOUT + 1);
    expect(onTypingChange).toHaveBeenCalledWith(false);

    rerender({text: 'abcd', isEnabled: true, onTypingChange});
    expect(onTypingChange).toHaveBeenCalledTimes(3);
  });

  it('does not call the callback with false on unmount when the user has not typed', () => {
    const onTypingChange = jest.fn();
    const {unmount} = renderHook(useTypingIndicator, {
      initialProps: {text: '', isEnabled: true, onTypingChange},
    });

    unmount();
    expect(onTypingChange).not.toHaveBeenCalledWith(false);
  });
});
