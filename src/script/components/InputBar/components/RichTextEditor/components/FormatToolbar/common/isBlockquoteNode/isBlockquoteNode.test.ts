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

import {isBlockquoteNode} from './isBlockquoteNode';

const createMockElementNode = (type: string, parent: ElementNode | null = null): ElementNode => {
  return {
    getType: () => type,
    getParent: () => parent,
  } as unknown as ElementNode;
};

const createMockTextNode = (parent: ElementNode | null = null): TextNode => {
  return {
    getType: () => 'text',
    getParent: () => parent,
  } as unknown as TextNode;
};

describe('isBlockquoteNode', () => {
  it('returns false when node is null', () => {
    expect(isBlockquoteNode(null)).toBe(false);
  });

  it('returns false for a non-blockquote node', () => {
    const textNode = createMockTextNode();
    expect(isBlockquoteNode(textNode)).toBe(false);
  });

  it('returns true for a blockquote node', () => {
    const blockquoteNode = createMockElementNode('quote');
    expect(isBlockquoteNode(blockquoteNode)).toBe(true);
  });

  it('returns true when a parent node is a blockquote', () => {
    const parentBlockquoteNode = createMockElementNode('quote');
    const childNode = createMockTextNode(parentBlockquoteNode);
    expect(isBlockquoteNode(childNode)).toBe(true);
  });

  it('returns false when no blockquote is in the ancestor chain', () => {
    const nonBlockquoteParent = createMockElementNode('paragraph');
    const childNode = createMockTextNode(nonBlockquoteParent);
    expect(isBlockquoteNode(childNode)).toBe(false);
  });

  it('handles deeply nested parent blockquote nodes', () => {
    const grandparentBlockquoteNode = createMockElementNode('quote');
    const parentNode = createMockElementNode('paragraph', grandparentBlockquoteNode);
    const childNode = createMockTextNode(parentNode);
    expect(isBlockquoteNode(childNode)).toBe(true);
  });
});
