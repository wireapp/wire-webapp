/*
 * Wire
 * Copyright (C) 2019 Wire Swiss GmbH
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
import {container} from 'tsyringe';

import {CallState} from 'Repositories/calling/CallState';
import {captureModalFocusContext} from 'Util/ModalFocusUtil';

import {ChooseScreen} from './ChooseScreen';

jest.mock('Util/ModalFocusUtil', () => ({
  captureModalFocusContext: jest.fn(),
}));

describe('ChooseScreen', () => {
  const screens = [
    {
      id: 'screen:first',
      name: 'Screen 1',
      thumbnail: {toDataURL: () => 'first screen'} as HTMLCanvasElement,
      display_id: '',
    },
    {
      id: 'screen:second',
      name: 'Screen 2',
      thumbnail: {toDataURL: () => 'second screen'} as HTMLCanvasElement,
      display_id: '',
    },
  ];
  const windows = [
    {
      id: 'window:first',
      name: 'Window 1',
      thumbnail: {toDataURL: () => 'first window'} as HTMLCanvasElement,
      display_id: '',
    },
    {
      id: 'window:second',
      name: 'Window 2',
      thumbnail: {toDataURL: () => 'second window'} as HTMLCanvasElement,
      display_id: '',
    },
  ];

  const callState = container.resolve(CallState);

  const createFocusContext = () => {
    const restore = jest.fn();
    return {
      targetDocument: document,
      createFocusRestorationCallback: () => restore,
      restoreMock: restore,
    };
  };

  const setup = () => {
    callState.selectableScreens(screens);
    callState.selectableWindows(windows);

    const focusContext = createFocusContext();
    (captureModalFocusContext as jest.Mock).mockReturnValue(focusContext);

    const props = {choose: jest.fn()};
    const renderedComponent = render(<ChooseScreen {...props} />);

    return {props, focusContext, ...renderedComponent};
  };

  beforeEach(() => {
    jest.clearAllMocks();

    jest.spyOn(window, 'requestAnimationFrame').mockImplementation((cb: FrameRequestCallback) => {
      cb(0);
      return 0;
    });
  });

  afterEach(() => {
    (window.requestAnimationFrame as jest.Mock | undefined)?.mockRestore?.();
  });

  it('shows the available screens', () => {
    const {container} = setup();
    const screenItems = container.querySelectorAll('[data-uie-name="item-screen"]');
    const windowItems = container.querySelectorAll('[data-uie-name="item-window"]');

    expect(screenItems).toHaveLength(screens.length);
    expect(windowItems).toHaveLength(windows.length);
  });

  it('calls cancel on escape', () => {
    setup();

    fireEvent.keyDown(document, {code: 'Escape', key: 'Escape'});
    expect(callState.selectableScreens()).toEqual([]);
    expect(callState.selectableWindows()).toEqual([]);
  });

  it('calls cancel on cancel button click', () => {
    const {container} = setup();

    const cancelButton = container.querySelector('[data-uie-name="do-choose-screen-cancel"]');
    expect(cancelButton).not.toBeNull();

    fireEvent.click(cancelButton!);
    expect(callState.selectableScreens()).toEqual([]);
    expect(callState.selectableWindows()).toEqual([]);
  });

  it('chooses the correct screens on click', () => {
    const {container, props} = setup();

    const ids = [...screens, ...windows].map(({id}) => id);

    const screenItems = container.querySelectorAll('[data-uie-name="item-screen"]');
    const windowItems = container.querySelectorAll('[data-uie-name="item-window"]');

    const allItems = [...screenItems, ...windowItems];

    allItems.forEach((listItem, index) => {
      fireEvent.click(listItem);
      expect(props.choose).toHaveBeenCalledWith(ids[index]);
    });
  });

  it('renders as an aria-modal dialog with labelled title', () => {
    const {container} = setup();
    const dialog = container.querySelector('[role="dialog"]');
    expect(dialog).not.toBeNull();
    expect(dialog).toHaveAttribute('aria-modal', 'true');
    expect(dialog).toHaveAttribute('aria-labelledby', 'choose-screen-title');
    expect(container.querySelector('#choose-screen-title')).not.toBeNull();
  });

  it('focuses the first focusable element (first preview button) on mount', () => {
    const {container} = setup();
    const firstItem = container.querySelector<HTMLButtonElement>('[data-uie-name="item-screen"]');
    expect(firstItem).not.toBeNull();
    expect(document.activeElement).toBe(firstItem);
  });

  it('traps focus: Tab on last element cycles to first', () => {
    const {container} = setup();

    const buttons = Array.from(container.querySelectorAll<HTMLButtonElement>('button:not([disabled])'));
    expect(buttons.length).toBeGreaterThan(1);

    const first = buttons.at(0);
    const last = buttons.at(-1);

    last?.focus();
    expect(document.activeElement).toBe(last);

    fireEvent.keyDown(document, {key: 'Tab'});

    expect(document.activeElement).toBe(first);
  });

  it('traps focus: Shift+Tab on first element cycles to last', () => {
    const {container} = setup();

    const buttons = Array.from(container.querySelectorAll<HTMLButtonElement>('button:not([disabled])'));
    expect(buttons.length).toBeGreaterThan(1);

    const first = buttons[0];
    const last = buttons[buttons.length - 1];

    first.focus();
    expect(document.activeElement).toBe(first);

    fireEvent.keyDown(document, {key: 'Tab', shiftKey: true});

    expect(document.activeElement).toBe(last);
  });

  it('keeps focus in dialog on focusout (redirects to first focusable)', () => {
    const {container} = setup();

    const buttons = Array.from(container.querySelectorAll<HTMLButtonElement>('button:not([disabled])'));
    const first = buttons[0];

    // simulate focus leaving the dialog
    const dialog = container.querySelector<HTMLDivElement>('.choose-screen');
    expect(dialog).not.toBeNull();

    const outside = document.createElement('button');
    document.body.appendChild(outside);

    fireEvent.focusOut(dialog!, {relatedTarget: outside});

    expect(document.activeElement).toBe(first);

    document.body.removeChild(outside);
  });

  it('calls focus restoration callback on cancel (Escape)', () => {
    const {focusContext} = setup();

    fireEvent.keyDown(document, {key: 'Escape'});
    expect(focusContext.restoreMock).toHaveBeenCalled();
  });

  it('calls focus restoration callback on cancel button click', () => {
    const {container, focusContext} = setup();

    const cancelButton = container.querySelector('[data-uie-name="do-choose-screen-cancel"]')!;
    fireEvent.click(cancelButton);

    expect(focusContext.restoreMock).toHaveBeenCalled();
  });

  it('calls choose and restores focus when selecting a screen/window', () => {
    const {container, props, focusContext} = setup();

    const firstScreen = container.querySelector('[data-uie-name="item-screen"]')!;
    fireEvent.click(firstScreen);

    expect(props.choose).toHaveBeenCalledWith('screen:first');
    expect(focusContext.restoreMock).toHaveBeenCalled();
  });

  it('does not cancel when key is not Escape or Tab', () => {
    setup();

    fireEvent.keyDown(document, {key: 'Enter'});
    expect(callState.selectableScreens()).toHaveLength(screens.length);
    expect(callState.selectableWindows()).toHaveLength(windows.length);
  });
});
