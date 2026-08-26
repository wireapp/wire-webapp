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

import {useEffect} from 'react';

import {$getListDepth, $isListItemNode, $isListNode} from '@lexical/list';
import {useLexicalComposerContext} from '@lexical/react/LexicalComposerContext';
import type {ElementNode, RangeSelection} from 'lexical';
import {
  $getSelection,
  $isElementNode,
  $isRangeSelection,
  COMMAND_PRIORITY_CRITICAL,
  INDENT_CONTENT_COMMAND,
} from 'lexical';

const getElementNodesInSelection = (selection: RangeSelection): Set<ElementNode> => {
  const nodesInSelection = selection.getNodes();

  if (nodesInSelection.length === 0) {
    return new Set([selection.anchor.getNode().getParentOrThrow(), selection.focus.getNode().getParentOrThrow()]);
  }

  return new Set(nodesInSelection.map(node => ($isElementNode(node) ? node : node.getParentOrThrow())));
};

const $shouldPreventIndent = (maxDepth: number): boolean => {
  const selection = $getSelection();

  if (!$isRangeSelection(selection)) {
    return false;
  }

  const elementNodesInSelection: Set<ElementNode> = getElementNodesInSelection(selection);

  let totalDepth = 0;

  for (const elementNode of elementNodesInSelection) {
    if ($isListNode(elementNode)) {
      totalDepth = Math.max($getListDepth(elementNode) + 1, totalDepth);
    } else if ($isListItemNode(elementNode)) {
      const parent = elementNode.getParent();

      if (!$isListNode(parent)) {
        throw new Error('ListMaxIndentLevelPlugin: A ListItemNode must have a ListNode for a parent.');
      }

      totalDepth = Math.max($getListDepth(parent) + 1, totalDepth);
    }
  }

  return totalDepth > maxDepth;
};

export const ListMaxIndentLevelPlugin = ({maxDepth = 7}: {maxDepth?: number}): null => {
  const [editor] = useLexicalComposerContext();

  useEffect(() => {
    return editor.registerCommand(
      INDENT_CONTENT_COMMAND,
      () => $shouldPreventIndent(maxDepth),
      COMMAND_PRIORITY_CRITICAL,
    );
  }, [editor, maxDepth]);
  return null;
};
