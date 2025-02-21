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

import {useLexicalComposerContext} from '@lexical/react/LexicalComposerContext';
import {$isQuoteNode, $createQuoteNode} from '@lexical/rich-text';
import {$setBlocksType} from '@lexical/selection';
import {$createParagraphNode, $getSelection, $isRangeSelection} from 'lexical';

export const useBlockquoteState = () => {
  const [editor] = useLexicalComposerContext();

  const formatBlockquote = () => {
    editor.update(() => {
      const selection = $getSelection();

      if (!$isRangeSelection(selection)) {
        return;
      }

      const anchorNode = selection.anchor.getNode();
      const parent = anchorNode.getParent();

      const isBlockquote = $isQuoteNode(anchorNode) || $isQuoteNode(parent);

      if (isBlockquote) {
        $setBlocksType(selection, () => $createParagraphNode());
        return;
      }

      $setBlocksType(selection, () => $createQuoteNode());
    });
  };

  return {formatBlockquote};
};
