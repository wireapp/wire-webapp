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

import {act, render, screen, waitFor} from '@testing-library/react';
import {noop} from 'noop-esm';

import {
  createRootContextValueForTest,
  createRootProviderWrapperForTest,
} from '../../../../../../page/testSupport/rootContextTestSupport';
import {translateForTest} from '../../../../../../util/test/translateForTest';

import {ChatPdfViewer} from './chatPdfViewer';

type ResizeCallback = ResizeObserverCallback;

// react-pdf is globally mocked without component exports in setupTests.
// eslint-disable-next-line jest/no-restricted-jest-methods
jest.mock('react-pdf', () => {
  const React = require('react');

  return {
    Document: ({children}: {children: React.ReactNode}) => {
      return React.createElement('div', {}, children);
    },
    Page: ({
      width,
      onLoadSuccess,
    }: {
      width?: number;
      onLoadSuccess: (page: {getViewport: () => {width: number}}) => void;
    }) => {
      const callbackRef = React.useRef(onLoadSuccess);
      React.useEffect(() => {
        callbackRef.current({
          getViewport: () => {
            return {width: 1920};
          },
        });
      }, []);

      return React.createElement('div', {'data-uie-name': 'pdf-page', 'data-width': width});
    },
  };
});

describe('ChatPdfViewer', () => {
  const wrapper = createRootProviderWrapperForTest(createRootContextValueForTest({translate: translateForTest}));
  let observedWidth = 400;
  let resizeCallback: ResizeCallback;
  let resizeTarget: Element;
  let resizeObserverInstance: ResizeObserver;

  beforeEach(() => {
    observedWidth = 400;
    window.ResizeObserver = class MockResizeObserver implements ResizeObserver {
      constructor(private readonly callback: ResizeCallback) {
        resizeCallback = callback;
        resizeObserverInstance = this;
      }
      observe = (target: Element): void => {
        resizeTarget = target;
        this.callback([{target, contentRect: {width: observedWidth, height: 600}} as ResizeObserverEntry], this);
      };
      unobserve = noop;
      disconnect = noop;
    } as unknown as typeof window.ResizeObserver;
  });

  it('fits wide PDF pages within the available viewer width', async () => {
    observedWidth = 400;
    render(<ChatPdfViewer src="blob:pdf" />, {wrapper});

    await waitFor(() => {
      expect(screen.getByTestId('pdf-page')).toHaveAttribute('data-width', '368');
    });
  });

  it('updates the page width when its container resizes', async () => {
    observedWidth = 320;
    render(<ChatPdfViewer src="blob:pdf" />, {wrapper});
    await waitFor(() => {
      expect(screen.getByTestId('pdf-page')).toHaveAttribute('data-width', '288');
    });

    observedWidth = 240;
    act(() => {
      resizeCallback(
        [{target: resizeTarget, contentRect: {width: observedWidth, height: 600}} as ResizeObserverEntry],
        resizeObserverInstance,
      );
    });

    await waitFor(() => {
      expect(screen.getByTestId('pdf-page')).toHaveAttribute('data-width', '208');
    });
  });
});
