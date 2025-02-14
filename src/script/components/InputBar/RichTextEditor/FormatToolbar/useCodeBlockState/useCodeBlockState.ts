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

import {$createCodeNode} from '@lexical/code';
import {useLexicalComposerContext} from '@lexical/react/LexicalComposerContext';
import {$setBlocksType} from '@lexical/selection';
import {$getSelection, $isRangeSelection, $createParagraphNode} from 'lexical';

import {isCodeBlockNode} from '../common/isCodeBlockNode/isCodeBlockNode';

export const useCodeBlockState = () => {
  const [editor] = useLexicalComposerContext();

  const formatCodeBlock = () => {
    editor.update(() => {
      const selection = $getSelection();

      if (!$isRangeSelection(selection)) {
        return;
      }

      const anchorNode = selection.anchor.getNode();
      const isCodeBlock = isCodeBlockNode(anchorNode);

      if (isCodeBlock) {
        $setBlocksType(selection, () => $createParagraphNode());
        return;
      }

      $setBlocksType(selection, () => $createCodeNode());
    });
  };

  return {formatCodeBlock};
};
