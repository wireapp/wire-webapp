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

import {isCodeBlockNode} from './isCodeBlockNode';

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

describe('isCodeBlockNode', () => {
  it('returns false when node is null', () => {
    expect(isCodeBlockNode(null)).toBe(false);
  });

  it('returns false for a non-code node', () => {
    const textNode = createMockTextNode();
    expect(isCodeBlockNode(textNode)).toBe(false);
  });

  it('returns true for a code node', () => {
    const codeNode = createMockElementNode('code');
    expect(isCodeBlockNode(codeNode)).toBe(true);
  });

  it('returns true when a parent node is a code block', () => {
    const parentCodeNode = createMockElementNode('code');
    const childNode = createMockTextNode(parentCodeNode);
    expect(isCodeBlockNode(childNode)).toBe(true);
  });

  it('returns false when no code block is in the ancestor chain', () => {
    const nonCodeParent = createMockElementNode('paragraph');
    const childNode = createMockTextNode(nonCodeParent);
    expect(isCodeBlockNode(childNode)).toBe(false);
  });

  it('handles deeply nested parent code block nodes', () => {
    const grandparentCodeNode = createMockElementNode('code');
    const parentNode = createMockElementNode('paragraph', grandparentCodeNode);
    const childNode = createMockTextNode(parentNode);
    expect(isCodeBlockNode(childNode)).toBe(true);
  });
});
