/*
 * Wire
 * Copyright (C) 2026 Wire Swiss GmbH
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

import {act, render} from '@testing-library/react';

import {hasInputAlreadyFocused, useTextAreaFocus} from './AutoFocusPlugin';

const TextAreaFocusTestHarness = ({callback}: {callback: () => void}) => {
  useTextAreaFocus(callback);
  return null;
};

describe('AutoFocusPlugin', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
    document.body.innerHTML = '';
  });

  it('treats focused contenteditable elements as already-focused input', () => {
    const contentEditableElement = document.createElement('div');
    contentEditableElement.contentEditable = 'true';
    document.body.append(contentEditableElement);
    contentEditableElement.focus();

    expect(hasInputAlreadyFocused()).toBe(true);
  });

  it('does not trigger editor focus when a contenteditable is already focused', () => {
    const callback = jest.fn();
    const contentEditableElement = document.createElement('div');
    contentEditableElement.contentEditable = 'true';
    document.body.append(contentEditableElement);
    contentEditableElement.focus();

    render(<TextAreaFocusTestHarness callback={callback} />);

    act(() => {
      jest.runOnlyPendingTimers();
    });
    expect(callback).not.toHaveBeenCalled();

    act(() => {
      window.dispatchEvent(new KeyboardEvent('keydown', {key: 'a'}));
    });
    expect(callback).not.toHaveBeenCalled();
  });
});
