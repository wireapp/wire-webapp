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

import {type ReactElement, useRef} from 'react';

import {fireEvent, render, screen} from '@testing-library/react';

import {useCloseOnEscapeOrOutsidePress} from './useCloseOnEscapeOrOutsidePress';

interface OverlayProps {
  readonly isOpen: boolean;
  readonly captureEscapeWhenFocused: boolean;
  readonly onEscape: () => void;
  readonly onOutsidePress: () => void;
}

const Overlay = ({isOpen, captureEscapeWhenFocused, onEscape, onOutsidePress}: OverlayProps): ReactElement => {
  const rootRef = useRef<HTMLDivElement>(null);
  useCloseOnEscapeOrOutsidePress(rootRef, isOpen, onEscape, onOutsidePress, {captureEscapeWhenFocused});
  return (
    <div ref={rootRef}>
      <button type="button">inside</button>
    </div>
  );
};

const renderOverlay = (
  props: Partial<OverlayProps> = {},
): {onEscape: jest.Mock; onOutsidePress: jest.Mock; onPageKeyDown: jest.Mock} => {
  const onEscape = jest.fn();
  const onOutsidePress = jest.fn();
  const onPageKeyDown = jest.fn();
  render(
    <section onKeyDown={onPageKeyDown}>
      <Overlay isOpen captureEscapeWhenFocused={false} onEscape={onEscape} onOutsidePress={onOutsidePress} {...props} />
      <button type="button">outside</button>
    </section>,
  );
  return {onEscape, onOutsidePress, onPageKeyDown};
};

describe('useCloseOnEscapeOrOutsidePress', () => {
  it('closes on Escape and lets the key reach the page by default', () => {
    const {onEscape, onPageKeyDown} = renderOverlay();
    fireEvent.keyDown(screen.getByRole('button', {name: 'inside'}), {key: 'Escape'});

    expect(onEscape).toHaveBeenCalledTimes(1);
    expect(onPageKeyDown).toHaveBeenCalledTimes(1);
  });

  it('closes on a press outside, not on a press inside', () => {
    const {onOutsidePress} = renderOverlay();
    fireEvent.mouseDown(screen.getByRole('button', {name: 'inside'}));
    expect(onOutsidePress).not.toHaveBeenCalled();

    fireEvent.mouseDown(screen.getByRole('button', {name: 'outside'}));
    expect(onOutsidePress).toHaveBeenCalledTimes(1);
  });

  it('keeps Escape from the page while focus is inside, when asked to', () => {
    const {onEscape, onPageKeyDown} = renderOverlay({captureEscapeWhenFocused: true});
    const inside = screen.getByRole('button', {name: 'inside'});
    inside.focus();
    fireEvent.keyDown(inside, {key: 'Escape'});

    expect(onEscape).toHaveBeenCalledTimes(1);
    expect(onPageKeyDown).not.toHaveBeenCalled();
  });

  it('leaves Escape alone while focus is outside, even when asked to capture it', () => {
    const {onEscape, onPageKeyDown} = renderOverlay({captureEscapeWhenFocused: true});
    const outside = screen.getByRole('button', {name: 'outside'});
    outside.focus();
    fireEvent.keyDown(outside, {key: 'Escape'});

    expect(onEscape).not.toHaveBeenCalled();
    expect(onPageKeyDown).toHaveBeenCalledTimes(1);
  });

  it('listens to nothing while closed', () => {
    const {onEscape, onOutsidePress} = renderOverlay({isOpen: false});
    fireEvent.keyDown(screen.getByRole('button', {name: 'inside'}), {key: 'Escape'});
    fireEvent.mouseDown(screen.getByRole('button', {name: 'outside'}));

    expect(onEscape).not.toHaveBeenCalled();
    expect(onOutsidePress).not.toHaveBeenCalled();
  });
});
