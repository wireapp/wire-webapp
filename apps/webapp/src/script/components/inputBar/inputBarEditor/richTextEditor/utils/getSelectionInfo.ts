/*
 * Wire
 * Copyright (C) 2023 Wire Swiss GmbH
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

import {$getSelection, $isRangeSelection, $isTextNode, LexicalNode, RangeSelection} from 'lexical';

const PUNCTUATION = '\\.,\\*\\?\\$\\|#{}\\(\\)\\^\\[\\]\\\\/!%\'"~=<>_:;\\s';

const VALID_CHARS = (triggers: string[]) => `(?!${triggers.join('|')})[^${PUNCTUATION}]`;

export function getNextSibling(node: LexicalNode) {
  let nextSibling = node.getNextSibling();

  while (nextSibling !== null && nextSibling.getType() === 'zeroWidth') {
    nextSibling = nextSibling.getNextSibling();
  }

  return nextSibling;
}

export function getPreviousSibling(node: LexicalNode) {
  let previousSibling = node.getPreviousSibling();

  while (previousSibling !== null && previousSibling.getType() === 'zeroWidth') {
    previousSibling = previousSibling.getPreviousSibling();
  }

  return previousSibling;
}

function isWordChar(char: string, triggers: string[]) {
  return new RegExp(VALID_CHARS(triggers)).test(char);
}

type SelectionInfo = {
  node: LexicalNode;
  offset: number;
  isTextNode: boolean;
  textContent: string;
  selection: RangeSelection;
  prevNode: LexicalNode | null;
  nextNode: LexicalNode | null;
  cursorAtStartOfNode: boolean;
  cursorAtEndOfNode: boolean;
  wordCharBeforeCursor: boolean;
  wordCharAfterCursor: boolean;
};

export function getSelectionInfo(triggers: string[]): SelectionInfo | undefined {
  const selection = $getSelection();

  if (!selection || !$isRangeSelection(selection)) {
    return undefined;
  }

  const anchor = selection.anchor;
  const focus = selection.focus;
  const nodes = selection.getNodes();

  if (anchor.key !== focus.key || anchor.offset !== focus.offset || nodes.length === 0) {
    return undefined;
  }

  const [node] = nodes;
  const isTextNode = $isTextNode(node) && node.isSimpleText();
  const offset = anchor.type === 'text' ? anchor.offset : 0;
  const textContent = node.getTextContent();
  const cursorAtStartOfNode = offset === 0;
  const cursorAtEndOfNode = textContent.length === offset;
  const charBeforeCursor = textContent.charAt(offset - 1);
  const charAfterCursor = textContent.charAt(offset);
  const wordCharBeforeCursor = isWordChar(charBeforeCursor, triggers);
  const wordCharAfterCursor = isWordChar(charAfterCursor, triggers);
  const prevNode = getPreviousSibling(node);
  const nextNode = getNextSibling(node);

  return {
    node,
    offset,
    isTextNode,
    textContent,
    selection,
    prevNode,
    nextNode,
    cursorAtStartOfNode,
    cursorAtEndOfNode,
    wordCharBeforeCursor,
    wordCharAfterCursor,
  };
}
