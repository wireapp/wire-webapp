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

import {waitForDocumentContentLoaded} from './waitForDocumentContentLoaded';

describe('waitForDocumentContentLoaded', () => {
  it('waits for DOMContentLoaded while the document is loading', async () => {
    const documentEvents = new EventTarget();
    const readMonotonicMicroseconds = jest.fn(() => {
      return 100n;
    });
    const documentContentLoaded = waitForDocumentContentLoaded({
      readDocumentReadyState() {
        return 'loading';
      },
      readMonotonicMicroseconds,
      subscribeToDocumentContentLoaded(listener) {
        documentEvents.addEventListener('DOMContentLoaded', listener, {once: true});
      },
    });

    expect(readMonotonicMicroseconds).not.toHaveBeenCalled();

    documentEvents.dispatchEvent(new Event('DOMContentLoaded'));

    await expect(documentContentLoaded).resolves.toBe(100n);
    expect(readMonotonicMicroseconds).toHaveBeenCalledTimes(1);
  });

  it('resolves immediately for an interactive document without waiting for another DOM event', async () => {
    const subscribeToDocumentContentLoaded = jest.fn();
    const documentContentLoaded = waitForDocumentContentLoaded({
      readDocumentReadyState() {
        return 'interactive';
      },
      readMonotonicMicroseconds() {
        return 100n;
      },
      subscribeToDocumentContentLoaded,
    });

    await expect(documentContentLoaded).resolves.toBe(100n);
    expect(subscribeToDocumentContentLoaded).not.toHaveBeenCalled();
  });

  it('resolves immediately for a complete document without waiting for another DOM event', async () => {
    const subscribeToDocumentContentLoaded = jest.fn();
    const documentContentLoaded = waitForDocumentContentLoaded({
      readDocumentReadyState() {
        return 'complete';
      },
      readMonotonicMicroseconds() {
        return 100n;
      },
      subscribeToDocumentContentLoaded,
    });

    await expect(documentContentLoaded).resolves.toBe(100n);
    expect(subscribeToDocumentContentLoaded).not.toHaveBeenCalled();
  });

  it('retains the DOM event timestamp when other startup work finishes later', async () => {
    const documentEvents = new EventTarget();
    let currentMonotonicMicroseconds = 100n;
    const documentContentLoaded = waitForDocumentContentLoaded({
      readDocumentReadyState() {
        return 'loading';
      },
      readMonotonicMicroseconds() {
        return currentMonotonicMicroseconds;
      },
      subscribeToDocumentContentLoaded(listener) {
        documentEvents.addEventListener('DOMContentLoaded', listener, {once: true});
      },
    });

    documentEvents.dispatchEvent(new Event('DOMContentLoaded'));
    currentMonotonicMicroseconds = 200n;

    await expect(documentContentLoaded).resolves.toBe(100n);
  });
});
