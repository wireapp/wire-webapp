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

import {$isListItemNode} from '@lexical/list';
import {useLexicalComposerContext} from '@lexical/react/LexicalComposerContext';
import type {ElementNode, LexicalCommand, LexicalEditor, LexicalNode, RangeSelection} from 'lexical';
import {
  $getSelection,
  $isRangeSelection,
  COMMAND_PRIORITY_EDITOR,
  INDENT_CONTENT_COMMAND,
  KEY_TAB_COMMAND,
  OUTDENT_CONTENT_COMMAND,
} from 'lexical';

const $shouldIndentListItem = (selection: RangeSelection): boolean => {
  const nodes = selection.getNodes();

  // If no nodes or any node is not in a list item, return false

  if (nodes.length === 0) {
    return false;
  }

  return nodes.every(node => {
    // Traverse up to find if the node is inside a list item
    let currentNode: ElementNode | LexicalNode | null = node;
    while (currentNode) {
      if ($isListItemNode(currentNode)) {
        return true;
      }
      currentNode = currentNode.getParent();
    }
    return false;
  });
};

export const registerListItemTabIndentation = (editor: LexicalEditor) => {
  return editor.registerCommand<KeyboardEvent>(
    KEY_TAB_COMMAND,
    event => {
      const selection = $getSelection();
      if (!$isRangeSelection(selection)) {
        return false;
      }

      // Only proceed if selection is entirely within list items
      if (!$shouldIndentListItem(selection)) {
        return false;
      }

      event.preventDefault();
      const command: LexicalCommand<void> = event.shiftKey ? OUTDENT_CONTENT_COMMAND : INDENT_CONTENT_COMMAND;

      return editor.dispatchCommand(command, undefined);
    },
    COMMAND_PRIORITY_EDITOR,
  );
};

/**
 * This plugin adds the ability to indent list items using the tab key.
 * It ONLY works when the selection is completely within list items.
 */
export const ListItemTabIndentationPlugin = (): null => {
  const [editor] = useLexicalComposerContext();
  useEffect(() => {
    return registerListItemTabIndentation(editor);
  }, [editor]);

  return null;
};
