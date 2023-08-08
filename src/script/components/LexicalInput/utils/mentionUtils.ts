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
import {$createTextNode, $isParagraphNode, $isTextNode, LexicalNode, TextNode} from 'lexical';

import {getSelectionInfo} from './getSelectionInfo';

import {$createMentionNode} from '../nodes/MentionNode';

export const TRIGGER = '@';

export function checkForMentions(text: string): MenuTextMatch | null {
  const match = new RegExp(`(^|[^\\w])(${TRIGGER}([\\w ]*))`).exec(text);

  if (match === null) {
    return null;
  }
  const search = match[2];
  const term = match[3];

  return {
    leadOffset: match.index,
    matchingString: term,
    replaceableString: search,
  };
}

export function insertMention(trigger: string, value?: string) {
  const selectionInfo = getSelectionInfo([TRIGGER]);

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
  const mentionNode = value ? $createMentionNode(trigger, value) : $createTextNode(trigger);

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
