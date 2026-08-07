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

import {createEventListenerService} from './eventListenerService';

describe('event listener service', () => {
  it('binds addEventListener to globalThis', () => {
    const originalAddEventListener = globalThis.addEventListener;
    const addEventListenerInvocationContexts: unknown[] = [];
    const addEventListenerArguments: unknown[][] = [];

    function addEventListenerStub(this: unknown, ...args: unknown[]) {
      addEventListenerInvocationContexts.push(this);
      addEventListenerArguments.push(args);
    }

    globalThis.addEventListener = addEventListenerStub as unknown as typeof globalThis.addEventListener;

    try {
      const eventListenerService = createEventListenerService();
      const listener: () => undefined = () => undefined;

      eventListenerService.addEventListener('click', listener);

      expect(addEventListenerInvocationContexts[0]).toBe(globalThis);
      expect(addEventListenerArguments[0]).toEqual(['click', listener, undefined]);
    } finally {
      globalThis.addEventListener = originalAddEventListener;
    }
  });

  it('binds removeEventListener to globalThis', () => {
    const originalRemoveEventListener = globalThis.removeEventListener;
    const removeEventListenerInvocationContexts: unknown[] = [];
    const removeEventListenerArguments: unknown[][] = [];

    function removeEventListenerStub(this: unknown, ...args: unknown[]) {
      removeEventListenerInvocationContexts.push(this);
      removeEventListenerArguments.push(args);
    }

    globalThis.removeEventListener = removeEventListenerStub as unknown as typeof globalThis.removeEventListener;

    try {
      const eventListenerService = createEventListenerService();
      const listener: () => undefined = () => undefined;

      eventListenerService.removeEventListener('click', listener);

      expect(removeEventListenerInvocationContexts[0]).toBe(globalThis);
      expect(removeEventListenerArguments[0]).toEqual(['click', listener, undefined]);
    } finally {
      globalThis.removeEventListener = originalRemoveEventListener;
    }
  });

  it('forwards options to addEventListener', () => {
    const originalAddEventListener = globalThis.addEventListener;
    const addEventListenerArguments: unknown[][] = [];

    function addEventListenerStub(this: unknown, ...args: unknown[]) {
      addEventListenerArguments.push(args);
    }

    globalThis.addEventListener = addEventListenerStub as unknown as typeof globalThis.addEventListener;

    try {
      const eventListenerService = createEventListenerService();
      const listener: () => undefined = () => undefined;
      const options: AddEventListenerOptions = {capture: true, once: true, passive: false};

      eventListenerService.addEventListener('keydown', listener, options);

      expect(addEventListenerArguments[0]).toEqual(['keydown', listener, options]);
    } finally {
      globalThis.addEventListener = originalAddEventListener;
    }
  });

  it('forwards options to removeEventListener', () => {
    const originalRemoveEventListener = globalThis.removeEventListener;
    const removeEventListenerArguments: unknown[][] = [];

    function removeEventListenerStub(this: unknown, ...args: unknown[]) {
      removeEventListenerArguments.push(args);
    }

    globalThis.removeEventListener = removeEventListenerStub as unknown as typeof globalThis.removeEventListener;

    try {
      const eventListenerService = createEventListenerService();
      const listener: () => undefined = () => undefined;

      eventListenerService.removeEventListener('keydown', listener, true);

      expect(removeEventListenerArguments[0]).toEqual(['keydown', listener, true]);
    } finally {
      globalThis.removeEventListener = originalRemoveEventListener;
    }
  });
});
