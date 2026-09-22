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

import {$createParagraphNode, $createTextNode, $getRoot, $getSelection, $isRangeSelection, TextNode} from 'lexical';
import assert from 'node:assert';

import {createWireLexicalEditorTestHarness} from '../../../testSupport/createWireLexicalEditorTestHarness';
import {getSelectedNode} from './getSelectedNode';

type TextNodeName = 'first' | 'second';

type SelectionPoint = {
  readonly textNodeName: TextNodeName;
  readonly offset: number;
};

type SelectionCharacterizationTestCase = {
  readonly description: string;
  readonly anchor: SelectionPoint;
  readonly focus: SelectionPoint;
};

const sameNodeSelectionCharacterizationTestCase: SelectionCharacterizationTestCase = {
  description: 'returns the shared text node for a selection within one node',
  anchor: {textNodeName: 'first', offset: 1},
  focus: {textNodeName: 'first', offset: 4},
};

const crossNodeSelectionCharacterizationTestCases: readonly SelectionCharacterizationTestCase[] = [
  {
    description: 'throws for a forward selection that starts inside the anchor node',
    anchor: {textNodeName: 'first', offset: 1},
    focus: {textNodeName: 'second', offset: 2},
  },
  {
    description: 'throws for a forward selection that starts at the anchor end',
    anchor: {textNodeName: 'first', offset: 5},
    focus: {textNodeName: 'second', offset: 2},
  },
  {
    description: 'throws for a backward selection whose focus is inside the focus node',
    anchor: {textNodeName: 'second', offset: 2},
    focus: {textNodeName: 'first', offset: 1},
  },
  {
    description: 'throws for a backward selection whose focus is at the focus node end',
    anchor: {textNodeName: 'second', offset: 2},
    focus: {textNodeName: 'first', offset: 5},
  },
];

function readSelectedNodeName(selectionTestCase: SelectionCharacterizationTestCase): TextNodeName {
  const harness = createWireLexicalEditorTestHarness();
  let actualSelectedNodeName: TextNodeName | undefined;

  harness.editor.update(
    () => {
      const paragraphNode = $createParagraphNode();
      const firstTextNode = $createTextNode('first');
      const secondTextNode = $createTextNode('second');
      secondTextNode.setFormat('bold');
      paragraphNode.append(firstTextNode, secondTextNode);
      $getRoot().clear().append(paragraphNode);

      const textNodes: Record<TextNodeName, TextNode> = {
        first: firstTextNode,
        second: secondTextNode,
      };
      firstTextNode.select(0, 0);
      const selection = $getSelection();
      assert($isRangeSelection(selection));
      selection.setTextNodeRange(
        textNodes[selectionTestCase.anchor.textNodeName],
        selectionTestCase.anchor.offset,
        textNodes[selectionTestCase.focus.textNodeName],
        selectionTestCase.focus.offset,
      );
      const selectedNodeKey = getSelectedNode(selection).getKey();
      if (selectedNodeKey === firstTextNode.getKey()) {
        actualSelectedNodeName = 'first';
      } else if (selectedNodeKey === secondTextNode.getKey()) {
        actualSelectedNodeName = 'second';
      }
    },
    {discrete: true},
  );

  assert(actualSelectedNodeName !== undefined);

  return actualSelectedNodeName;
}

describe('getSelectedNode', () => {
  it('returns the shared text node for a selection within one node', () => {
    const actualSelectedNodeName = readSelectedNodeName(sameNodeSelectionCharacterizationTestCase);

    expect(actualSelectedNodeName).toBe('first');
  });

  it.each(crossNodeSelectionCharacterizationTestCases)('$description', selectionTestCase => {
    expect(() => {
      return readSelectedNodeName(selectionTestCase);
    }).toThrow(TypeError);
  });
});
