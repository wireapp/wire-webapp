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

import {isListNode} from './isListNode';

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

describe('isListNode', () => {
  it('returns false when node is null', () => {
    expect(isListNode(null, 'ordered')).toBe(false);
  });

  it('returns false for a non-list node', () => {
    const textNode = createMockTextNode();

    expect(isListNode(textNode, 'ordered')).toBe(false);
  });

  it('returns true for an ordered list node', () => {
    const orderedListNode = createMockElementNode('list', 'ol');

    expect(isListNode(orderedListNode, 'ordered')).toBe(true);
  });

  it('returns false for an unordered list node when looking for ordered', () => {
    const unorderedListNode = createMockElementNode('list', 'ul');

    expect(isListNode(unorderedListNode, 'ordered')).toBe(false);
  });

  it('returns true for an unordered list node', () => {
    const unorderedListNode = createMockElementNode('list', 'ul');

    expect(isListNode(unorderedListNode, 'unordered')).toBe(true);
  });

  it('returns false for an ordered list node when looking for unordered', () => {
    const orderedListNode = createMockElementNode('list', 'ol');

    expect(isListNode(orderedListNode, 'unordered')).toBe(false);
  });

  it('returns true when a parent node is an ordered list', () => {
    const parentOrderedListNode = createMockElementNode('list', 'ol');
    const childNode = createMockTextNode(parentOrderedListNode);

    expect(isListNode(childNode, 'ordered')).toBe(true);
  });

  it('returns true when a parent node is an unordered list', () => {
    const parentUnorderedListNode = createMockElementNode('list', 'ul');
    const childNode = createMockTextNode(parentUnorderedListNode);

    expect(isListNode(childNode, 'unordered')).toBe(true);
  });

  it('returns false when no parent node matches the list type', () => {
    const childNode = createMockTextNode();

    expect(isListNode(childNode, 'ordered')).toBe(false);
  });

  it('handles deeply nested parent list nodes', () => {
    const grandparentOrderedListNode = createMockElementNode('list', 'ol');
    const parentUnorderedListNode = createMockElementNode('list', 'ul', grandparentOrderedListNode);
    const childNode = createMockTextNode(parentUnorderedListNode);

    expect(isListNode(childNode, 'ordered')).toBe(true);
  });
});
