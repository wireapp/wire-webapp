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

import {isHtmlElement, isUndefined} from '@sindresorhus/is';
import {act, cleanup, render} from '@testing-library/react';

import {InViewport} from './inViewport';

type IntersectionUpdateOptions = {
  element: HTMLElement;
  intersectionRatio: number;
  isIntersecting: boolean;
};

type MockViewportObserver = IntersectionObserver & {
  unobserve: jest.Mock<void, [target: Element]>;
};

function reportIntersection(options: IntersectionUpdateOptions): void {
  const intersectionObserverMock = IntersectionObserver as jest.MockedClass<typeof IntersectionObserver>;
  const intersectionObserverCalls = intersectionObserverMock.mock.calls;
  const viewportObserverArguments = intersectionObserverCalls[0];

  if (isUndefined(viewportObserverArguments)) {
    throw new Error('Expected the viewport observer to be initialized');
  }

  const [viewportObserverCallback] = viewportObserverArguments;

  act(() => {
    viewportObserverCallback(
      [
        {
          boundingClientRect: {} as DOMRectReadOnly,
          intersectionRect: {} as DOMRectReadOnly,
          intersectionRatio: options.intersectionRatio,
          isIntersecting: options.isIntersecting,
          rootBounds: null,
          target: options.element,
          time: 0,
        },
      ],
      {} as IntersectionObserver,
    );
  });
}

function getMockViewportObserver(): MockViewportObserver {
  const intersectionObserverMock = IntersectionObserver as jest.MockedClass<typeof IntersectionObserver>;
  const observerResult = intersectionObserverMock.mock.results[0];

  if (isUndefined(observerResult)) {
    throw new Error('Expected the viewport observer to be initialized');
  }

  if (observerResult.type !== 'return') {
    throw new Error('Expected the viewport observer constructor to return an instance');
  }

  return observerResult.value as MockViewportObserver;
}

describe('InViewport', () => {
  const originalElementFromPoint = document.elementFromPoint;
  let elementAtPoint: Element | null;
  let elementFromPointMock: jest.Mock<Element | null>;

  beforeEach(() => {
    jest.useFakeTimers();
    elementAtPoint = null;
    elementFromPointMock = jest.fn(() => {
      return elementAtPoint;
    });
    document.elementFromPoint = elementFromPointMock;
  });

  afterEach(() => {
    cleanup();
    document.elementFromPoint = originalElementFromPoint;
    jest.clearAllTimers();
    jest.useRealTimers();
  });

  it('does not check overlays for an off-screen element', () => {
    const onVisible = jest.fn();
    const onVisibilityLost = jest.fn();
    const renderedElement = render(
      <InViewport checkOverlay onVisible={onVisible} onVisibilityLost={onVisibilityLost} />,
    ).container.firstElementChild;

    if (!isHtmlElement(renderedElement)) {
      throw new Error('Expected InViewport to render an element');
    }

    reportIntersection({element: renderedElement, intersectionRatio: 0, isIntersecting: false});

    expect(onVisible).not.toHaveBeenCalled();
    expect(onVisibilityLost).toHaveBeenCalledTimes(1);
    expect(elementFromPointMock).not.toHaveBeenCalled();

    act(() => {
      jest.advanceTimersByTime(1200);
    });

    expect(elementFromPointMock).not.toHaveBeenCalled();
  });

  it('starts overlay checks when an element intersects and removes them after becoming visible', () => {
    const onVisible = jest.fn();
    const renderedElement = render(<InViewport checkOverlay onVisible={onVisible} requireFullyInView />).container
      .firstElementChild;

    if (!isHtmlElement(renderedElement)) {
      throw new Error('Expected InViewport to render an element');
    }

    elementAtPoint = renderedElement;
    expect(elementFromPointMock).not.toHaveBeenCalled();

    reportIntersection({element: renderedElement, intersectionRatio: 0.5, isIntersecting: true});

    expect(elementFromPointMock).toHaveBeenCalledTimes(1);
    expect(onVisible).not.toHaveBeenCalled();

    reportIntersection({element: renderedElement, intersectionRatio: 1, isIntersecting: true});

    expect(onVisible).toHaveBeenCalledTimes(1);

    const geometryChecksAfterVisibility = elementFromPointMock.mock.calls.length;

    act(() => {
      jest.advanceTimersByTime(1200);
    });

    expect(elementFromPointMock).toHaveBeenCalledTimes(geometryChecksAfterVisibility);
  });

  it('unobserves once when an uncovered element first enters fully into view', () => {
    const onVisible = jest.fn();
    const viewportObserver = getMockViewportObserver();
    const unobserveCallsBeforeEntry = viewportObserver.unobserve.mock.calls.length;
    const renderedElement = render(<InViewport checkOverlay onVisible={onVisible} />).container.firstElementChild;

    if (!isHtmlElement(renderedElement)) {
      throw new Error('Expected InViewport to render an element');
    }

    elementAtPoint = renderedElement;
    reportIntersection({element: renderedElement, intersectionRatio: 1, isIntersecting: true});

    expect(onVisible).toHaveBeenCalledTimes(1);
    expect(viewportObserver.unobserve).toHaveBeenCalledTimes(unobserveCallsBeforeEntry + 1);
    expect(elementFromPointMock).toHaveBeenCalledTimes(1);
  });

  it('keeps a covered element pending until it is uncovered', () => {
    const onVisible = jest.fn();
    const onVisibilityLost = jest.fn();
    const overlay = document.createElement('div');
    elementAtPoint = overlay;
    const renderedElement = render(
      <InViewport checkOverlay onVisible={onVisible} onVisibilityLost={onVisibilityLost} />,
    ).container.firstElementChild;

    if (!isHtmlElement(renderedElement)) {
      throw new Error('Expected InViewport to render an element');
    }

    reportIntersection({element: renderedElement, intersectionRatio: 1, isIntersecting: true});

    expect(onVisible).not.toHaveBeenCalled();
    expect(onVisibilityLost).not.toHaveBeenCalled();

    elementAtPoint = renderedElement;
    act(() => {
      jest.advanceTimersByTime(300);
    });

    expect(onVisible).toHaveBeenCalledTimes(1);
    expect(onVisibilityLost).not.toHaveBeenCalled();
  });

  it('stops overlay checks on exit, restarts them on entry, and cleans up on unmount', () => {
    const onVisible = jest.fn();
    const onVisibilityLost = jest.fn();
    const rendered = render(
      <InViewport callVisibilityLostOnUnmount checkOverlay onVisible={onVisible} onVisibilityLost={onVisibilityLost} />,
    );
    const renderedElement = rendered.container.firstElementChild;

    if (!isHtmlElement(renderedElement)) {
      throw new Error('Expected InViewport to render an element');
    }

    elementAtPoint = renderedElement;
    reportIntersection({element: renderedElement, intersectionRatio: 1, isIntersecting: true});

    expect(onVisible).toHaveBeenCalledTimes(1);

    reportIntersection({element: renderedElement, intersectionRatio: 0, isIntersecting: false});

    expect(onVisibilityLost).toHaveBeenCalledTimes(1);

    const geometryChecksAfterExit = elementFromPointMock.mock.calls.length;
    act(() => {
      jest.advanceTimersByTime(900);
    });
    expect(elementFromPointMock).toHaveBeenCalledTimes(geometryChecksAfterExit);

    reportIntersection({element: renderedElement, intersectionRatio: 1, isIntersecting: true});

    expect(onVisible).toHaveBeenCalledTimes(2);

    const viewportObserver = getMockViewportObserver();
    const unobserveCallsBeforeUnmount = viewportObserver.unobserve.mock.calls.length;
    rendered.unmount();

    expect(viewportObserver.unobserve).toHaveBeenCalledTimes(unobserveCallsBeforeUnmount + 1);

    reportIntersection({element: renderedElement, intersectionRatio: 1, isIntersecting: true});

    expect(onVisible).toHaveBeenCalledTimes(2);

    const geometryChecksAfterUnmount = elementFromPointMock.mock.calls.length;
    act(() => {
      jest.advanceTimersByTime(900);
    });

    expect(elementFromPointMock).toHaveBeenCalledTimes(geometryChecksAfterUnmount);
    expect(onVisibilityLost).toHaveBeenCalledTimes(2);
  });
});
