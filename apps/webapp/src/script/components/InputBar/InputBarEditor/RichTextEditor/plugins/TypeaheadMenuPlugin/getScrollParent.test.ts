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
 */

import {getScrollParent} from './TypeaheadMenuPlugin';

type ScrollParentTestFunction = () => void;
type ScrollParentTestCase = {
  readonly includeHidden: boolean;
  readonly expectedScrollParent: 'documentBody' | 'scrollContainer';
};
type ScrollContainerElements = {
  readonly scrollContainer: HTMLDivElement;
  readonly childElement: HTMLDivElement;
};

function withCleanDocumentBody(testFunction: ScrollParentTestFunction): ScrollParentTestFunction {
  return () => {
    try {
      testFunction();
    } finally {
      document.body.replaceChildren();
    }
  };
}

function withCleanDocumentBodyForTestCase<TestCase>(
  testFunction: (testCase: TestCase) => void,
): (testCase: TestCase) => void {
  return (testCase: TestCase): void => {
    try {
      testFunction(testCase);
    } finally {
      document.body.replaceChildren();
    }
  };
}

function appendScrollContainer(): ScrollContainerElements {
  const scrollContainer = document.createElement('div');
  const childElement = document.createElement('div');

  scrollContainer.append(childElement);
  document.body.append(scrollContainer);

  return {scrollContainer, childElement};
}

describe('getScrollParent', () => {
  it(
    'returns the document body for a fixed element',
    withCleanDocumentBody(() => {
      const {childElement} = appendScrollContainer();
      childElement.style.position = 'fixed';

      expect(getScrollParent(childElement, false)).toBe(document.body);
    }),
  );

  it(
    'returns the nearest parent with scroll overflow',
    withCleanDocumentBody(() => {
      const {scrollContainer, childElement} = appendScrollContainer();
      scrollContainer.style.overflow = 'auto';

      expect(getScrollParent(childElement, false)).toBe(scrollContainer);
    }),
  );

  const scrollParentTestCases: readonly ScrollParentTestCase[] = [
    {includeHidden: false, expectedScrollParent: 'documentBody'},
    {includeHidden: true, expectedScrollParent: 'scrollContainer'},
  ];

  it.each(scrollParentTestCases)(
    'includes hidden overflow only when requested: $includeHidden',
    withCleanDocumentBodyForTestCase<ScrollParentTestCase>(testCase => {
      const {scrollContainer, childElement} = appendScrollContainer();
      scrollContainer.style.overflow = 'hidden';

      const expectedScrollParent =
        testCase.expectedScrollParent === 'scrollContainer' ? scrollContainer : document.body;

      expect(getScrollParent(childElement, testCase.includeHidden)).toBe(expectedScrollParent);
    }),
  );

  it(
    'skips a static parent for an absolutely positioned element',
    withCleanDocumentBody(() => {
      const outerScrollContainer = document.createElement('div');
      const staticScrollContainer = document.createElement('div');
      const childElement = document.createElement('div');

      outerScrollContainer.style.overflow = 'auto';
      staticScrollContainer.style.overflow = 'auto';
      staticScrollContainer.style.position = 'static';
      childElement.style.position = 'absolute';

      staticScrollContainer.append(childElement);
      outerScrollContainer.append(staticScrollContainer);
      document.body.append(outerScrollContainer);

      expect(getScrollParent(childElement, false)).toBe(outerScrollContainer);
    }),
  );
});
