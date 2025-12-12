/*
 * Wire
 * Copyright (C) 2025 Wire Swiss GmbH
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

import {useLexicalComposerContext} from '@lexical/react/LexicalComposerContext';
import {$isQuoteNode} from '@lexical/rich-text';
import {
  COMMAND_PRIORITY_LOW,
  KEY_ENTER_COMMAND,
  $getSelection,
  $isRangeSelection,
  KEY_BACKSPACE_COMMAND,
  $isLineBreakNode,
  INSERT_PARAGRAPH_COMMAND,
  LexicalEditor,
  INSERT_LINE_BREAK_COMMAND,
} from 'lexical';

export const BlockquotePlugin = (): null => {
  const [editor] = useLexicalComposerContext();

  useEffect(() => {
    return registerBlockquoteEnterCommand(editor);
  }, [editor]);

  useEffect(() => {
    return registerBlockquoteBackspaceCommand(editor);
  }, [editor]);

  return null;
};

/**
 * Because we use a custom Shift + Enter command (see SendPlugin.tsx), we need to register a custom Shify + Enter command for the blockquote.
 * By default our Shift + Enter adds a new paragraph, which escapes the blockquote, prevents for adding multiline quotes.
 * This command will add a new line break instead of a new paragraph, which will keep the blockquote.
 */
const registerBlockquoteEnterCommand = (editor: LexicalEditor) => {
  return editor.registerCommand(
    KEY_ENTER_COMMAND,
    event => {
      if (!event) {
        return false;
      }

      const selection = $getSelection();

      if (!$isRangeSelection(selection)) {
        return false;
      }

      const anchorNode = selection.anchor.getNode();
      const quoteBlock = anchorNode.getParent();

      if (!$isQuoteNode(quoteBlock) && !$isQuoteNode(anchorNode)) {
        return false;
      }

      if (!event.shiftKey) {
        return false;
      }

      event.preventDefault();

      editor.update(() => {
        editor.dispatchCommand(INSERT_LINE_BREAK_COMMAND, false);
      });

      return true;
    },
    COMMAND_PRIORITY_LOW,
  );
};

/**
 * Because we use a custom Shift + Enter for the blockquotes, we no longer have an abilitiy to escape a blockquote by pressing Shift + Enter (cause the above command adds a new line break).
 * This command will remove the last line break in the blockquote and add a new paragraph, which will escape the blockquote.
 */
const registerBlockquoteBackspaceCommand = (editor: LexicalEditor) => {
  return editor.registerCommand(
    KEY_BACKSPACE_COMMAND,
    event => {
      const selection = $getSelection();

      if (!$isRangeSelection(selection)) {
        return false;
      }

      event.preventDefault();

      const anchorNode = selection.anchor.getNode();
      const quoteBlock = anchorNode.getParent();

      if (!$isQuoteNode(quoteBlock) && !$isQuoteNode(anchorNode)) {
        return false;
      }

      if (!('getChildren' in anchorNode)) {
        return false;
      }

      const children = anchorNode.getChildren();

      const lastChild = children?.[children.length - 1];

      const isLastChildLineBreakNode = $isLineBreakNode(lastChild);

      if (!isLastChildLineBreakNode) {
        return false;
      }

      editor.update(() => {
        lastChild.remove();
        // in markdown rendering, a line directly after a blockquote will be considered inside it
        // so we need to add a paragraph to escape the blockquote
        editor.dispatchCommand(INSERT_PARAGRAPH_COMMAND, undefined);
        editor.dispatchCommand(INSERT_PARAGRAPH_COMMAND, undefined);
      });

      return true;
    },
    COMMAND_PRIORITY_LOW,
  );
};
