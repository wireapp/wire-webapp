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

import {MenuTextMatch} from '@lexical/react/LexicalTypeaheadMenuPlugin';
import {
  $createTextNode,
  $getSelection,
  $isParagraphNode,
  $isRangeSelection,
  $isTextNode,
  LexicalNode,
  TextNode,
  RangeSelection,
} from 'lexical';

import {$createBeautifulMentionNode} from '../nodes/MentionNode';

const PUNCTUATION = '\\.,\\*\\?\\$\\|#{}\\(\\)\\^\\[\\]\\\\/!%\'"~=<>_:;\\s';

// Strings that can trigger the mention menu.
export const TRIGGERS = (triggers: string[]) => `(?:${triggers.join('|')})`;

// Chars we expect to see in a mention (non-space, non-punctuation).
export const VALID_CHARS = (triggers: string[]) => `(?!${triggers.join('|')})[^${PUNCTUATION}]`;

// Non-standard series of chars. Each series must be preceded and followed by
// a valid char.
const VALID_JOINS =
  `(?:` +
  `\\.[ |$]|` + // E.g. "r. " in "Mr. Smith"
  `[${PUNCTUATION}]|` + // E.g. "-' in "Salier-Hellendag"
  `)`;

export const LENGTH_LIMIT = 75;

// Regex used to trigger the mention menu.
function createMentionsRegex(triggers: string[], allowSpaces: boolean) {
  return new RegExp(
    `(^|\\s|\\()(${TRIGGERS(triggers)}((?:${
      VALID_CHARS(triggers) + (allowSpaces ? VALID_JOINS : '')
    }){0,${LENGTH_LIMIT}})` + `)$`,
  );
}

export function checkForMentions(text: string, triggers: string[], allowSpaces: boolean): MenuTextMatch | null {
  const match = createMentionsRegex(triggers, allowSpaces).exec(text);
  if (match !== null) {
    // The strategy ignores leading whitespace but we need to know it's
    // length to add it to the leadOffset
    const maybeLeadingWhitespace = match[1];
    const matchingStringWithTrigger = match[2];
    const matchingString = match[3];
    if (matchingStringWithTrigger.length >= 1) {
      return {
        leadOffset: match.index + maybeLeadingWhitespace.length,
        matchingString: matchingString,
        replaceableString: matchingStringWithTrigger,
      };
    }
  }
  return null;
}

export function isWordChar(char: string, triggers: string[]) {
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

export function insertMention(triggers: string[], trigger: string, value?: string) {
  const selectionInfo = getSelectionInfo(triggers);
  if (!selectionInfo) {
    return false;
  }

  const {
    node,
    offset,
    selection,
    wordCharBeforeCursor,
    wordCharAfterCursor,
    cursorAtStartOfNode,
    cursorAtEndOfNode,
    prevNode,
    nextNode,
  } = selectionInfo;

  // Insert a mention node or a text node with the trigger to open the mention menu.
  const mentionNode = value ? $createBeautifulMentionNode(trigger, value) : $createTextNode(trigger);

  // Insert a mention with a leading space if the node at the cursor is not a text node.
  if (!($isParagraphNode(node) && offset === 0) && !$isTextNode(node)) {
    selection.insertNodes([$createTextNode(' '), mentionNode]);
    return true;
  }

  let spaceNode: TextNode | null = null;
  const nodes: LexicalNode[] = [];
  if (wordCharBeforeCursor || (cursorAtStartOfNode && prevNode !== null && !$isTextNode(prevNode))) {
    nodes.push($createTextNode(' '));
  }
  nodes.push(mentionNode);
  if (wordCharAfterCursor || (cursorAtEndOfNode && nextNode !== null && !$isTextNode(nextNode))) {
    spaceNode = $createTextNode(' ');
    nodes.push(spaceNode);
  }

  selection.insertNodes(nodes);

  if (nodes.length > 1) {
    if ($isTextNode(mentionNode)) {
      mentionNode.select();
    } else if (spaceNode) {
      spaceNode.selectPrevious();
    }
  }

  return true;
}

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
