/*
 * Wire
 * Copyright (C) 2024 Wire Swiss GmbH
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

import {ElementNode, TextNode} from 'lexical';

import {isHeadingNode} from './isHeadingNode';

const createMockElementNode = (type: string, tag: string, parent: ElementNode | null = null): ElementNode => {
  return {
    getType: () => type,
    getTag: () => tag,
    getParent: () => parent,
  } as unknown as ElementNode;
};

const createMockTextNode = (parent: ElementNode | null = null): TextNode => {
  return {
    getType: () => 'text',
    getTag: () => '',
    getParent: () => parent,
  } as unknown as TextNode;
};

describe('isHeadingNode', () => {
  it('returns false when node is null', () => {
    expect(isHeadingNode(null)).toBe(false);
  });

  it('returns false for a non-heading node', () => {
    const textNode = createMockTextNode();

    expect(isHeadingNode(textNode)).toBe(false);
  });

  it('returns true for a heading node with the default tag', () => {
    const headingNode = createMockElementNode('heading', 'h1');

    expect(isHeadingNode(headingNode)).toBe(true);
  });

  it('returns false for a heading node with a different tag', () => {
    const headingNode = createMockElementNode('heading', 'h2');

    expect(isHeadingNode(headingNode)).toBe(false);
  });

  it('returns true for a heading node with a specified matching tag', () => {
    const headingNode = createMockElementNode('heading', 'h3');

    expect(isHeadingNode(headingNode, 'h3')).toBe(true);
  });

  it('returns true when a parent node is a matching heading', () => {
    const parentHeadingNode = createMockElementNode('heading', 'h2');
    const childNode = createMockTextNode(parentHeadingNode);

    expect(isHeadingNode(childNode, 'h2')).toBe(true);
  });

  it('returns false when no parent node matches the heading tag', () => {
    const parentHeadingNode = createMockElementNode('heading', 'h3');
    const childNode = createMockTextNode(parentHeadingNode);

    expect(isHeadingNode(childNode, 'h1')).toBe(false);
  });

  it('handles deeply nested parent heading nodes', () => {
    const grandparentHeadingNode = createMockElementNode('heading', 'h4');
    const parentNode = createMockElementNode('heading', 'h3', grandparentHeadingNode);
    const childNode = createMockTextNode(parentNode);

    expect(isHeadingNode(childNode, 'h4')).toBe(true);
  });

  it('returns false when no heading is in the ancestor chain', () => {
    const nonHeadingParent = createMockElementNode('div', '');
    const childNode = createMockTextNode(nonHeadingParent);

    expect(isHeadingNode(childNode, 'h1')).toBe(false);
  });
});
