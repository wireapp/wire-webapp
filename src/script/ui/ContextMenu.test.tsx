/*
 * Wire
 * Copyright (C) 2025 Wire Swiss GmbH
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

import '@testing-library/jest-dom';
import {act, waitFor} from '@testing-library/react';

import {showContextMenu} from './ContextMenu';

import * as ActiveWindowMod from '../hooks/useActiveWindow';

beforeAll(() => {
  jest.spyOn(ActiveWindowMod, 'useActiveWindowState').mockImplementation(() => ({activeWindow: window}));
  (ActiveWindowMod.useActiveWindowState as any).getState = () => ({activeWindow: window});
});

const px = (n: number) => `${n}px`;
const queryMenu = () => document.querySelector('ul.ctx-menu') as HTMLUListElement | null;

const setMenuOffsetSize = (width: number, height: number) => {
  Object.defineProperty(HTMLElement.prototype, 'offsetWidth', {
    configurable: true,
    get() {
      return width;
    },
  });
  Object.defineProperty(HTMLElement.prototype, 'offsetHeight', {
    configurable: true,
    get() {
      return height;
    },
  });
};

const openMenu = async (args: Parameters<typeof showContextMenu>[0]) => {
  await act(async () => {
    showContextMenu(args);
  });
  await waitFor(() => expect(queryMenu()).toBeInTheDocument());
};

const closeMenu = async () => {
  if (!queryMenu()) {
    return;
  }
  await act(async () => {
    window.dispatchEvent(new KeyboardEvent('keydown', {key: 'Escape'}));
  });
  await waitFor(() => expect(queryMenu()).not.toBeInTheDocument());
};

describe('ContextMenu positioning', () => {
  beforeEach(() => {
    Object.defineProperty(window, 'innerWidth', {configurable: true, value: 1024});
    Object.defineProperty(window, 'innerHeight', {configurable: true, value: 768});
  });

  afterEach(async () => {
    await closeMenu();
  });

  it('anchor-based placement: bottom-end', async () => {
    setMenuOffsetSize(20, 10);

    const entries = [{label: 'First', identifier: 'first-id', click: jest.fn()}, {label: 'Second'}];

    const anchor = document.createElement('button');
    document.body.appendChild(anchor);
    jest.spyOn(anchor, 'getBoundingClientRect').mockReturnValue({
      left: 100,
      top: 100,
      right: 140,
      bottom: 120,
      width: 40,
      height: 20,
      x: 100,
      y: 100,
      toJSON: () => ({}),
    } as DOMRect);

    await openMenu({
      event: new MouseEvent('click', {clientX: 0, clientY: 0}),
      entries,
      identifier: 'message-options-menu',
      anchor,
      placement: 'bottom-end',
      offset: 10,
    });

    const menu = queryMenu()!;
    expect(menu.style.left).toBe(px(120)); // 140 - 20
    expect(menu.style.top).toBe(px(130)); // 120 + 10
    expect(menu.style.position).toBe('fixed');
  });

  it('falls back to cursor position when no anchor is provided', async () => {
    setMenuOffsetSize(20, 10);

    const entries = [{label: 'A', click: jest.fn()}];

    await openMenu({
      event: new MouseEvent('contextmenu', {clientX: 300, clientY: 400}),
      entries,
      identifier: 'message-options-menu',
    });

    const menu = queryMenu()!;
    expect(menu.style.left).toBe(px(300));
    expect(menu.style.top).toBe(px(400));
  });

  it('clamps within viewport near edges (cursor fallback)', async () => {
    Object.defineProperty(window, 'innerWidth', {configurable: true, value: 300});
    Object.defineProperty(window, 'innerHeight', {configurable: true, value: 200});
    setMenuOffsetSize(60, 40);

    const entries = [{label: 'Edge', click: jest.fn()}];

    await openMenu({
      event: new MouseEvent('contextmenu', {clientX: 290, clientY: 195}),
      entries,
      identifier: 'message-options-menu',
    });

    const menu = queryMenu()!;
    expect(menu.style.left).toBe(px(230)); // 290 - 60
    expect(menu.style.top).toBe(px(155)); // 195 - 40

    expect(parseInt(menu.style.left, 10)).toBeGreaterThanOrEqual(0);
    expect(parseInt(menu.style.top, 10)).toBeGreaterThanOrEqual(0);
    expect(parseInt(menu.style.left, 10)).toBeLessThanOrEqual(300 - 60);
    expect(parseInt(menu.style.top, 10)).toBeLessThanOrEqual(200 - 40);
  });

  it('Enter triggers the selected item click and closes cleanly', async () => {
    setMenuOffsetSize(10, 10);
    const clickSpy = jest.fn();
    const entries = [{label: 'Click me', click: clickSpy}];

    const focusTrap = document.createElement('button');
    document.body.appendChild(focusTrap);
    focusTrap.focus();

    await openMenu({
      event: new MouseEvent('click', {clientX: 10, clientY: 10}),
      entries,
      identifier: 'message-options-menu',
    });

    await act(async () => {
      window.dispatchEvent(new KeyboardEvent('keydown', {key: 'Enter'}));
    });

    await waitFor(() => expect(clickSpy).toHaveBeenCalledTimes(1));
  });
});
