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

import {useCallback, useEffect, useState} from 'react';

import {useLexicalComposerContext} from '@lexical/react/LexicalComposerContext';
import {$getSelection, $isRangeSelection} from 'lexical';

import {isNodeBlockquote} from '../common/isNodeBlockquote/isNodeBlockquote';
import {isNodeHeading} from '../common/isNodeHeading/isNodeHeading';
import {isNodeList} from '../common/isNodeList/isNodeList';

type FormatTypes =
  | 'bold'
  | 'italic'
  | 'strikethrough'
  | 'code'
  | 'unorderedList'
  | 'orderedList'
  | 'heading'
  | 'blockquote';

export const useToolbarState = () => {
  const [editor] = useLexicalComposerContext();

  const [activeFormats, setActiveFormats] = useState<FormatTypes[]>([]);

  const updateToolbar = useCallback(() => {
    editor.update(() => {
      const selection = $getSelection();
      if (!$isRangeSelection(selection)) {
        return;
      }

      const node = selection.anchor.getNode();

      const formatChecks: Array<{format: FormatTypes; check: () => boolean}> = [
        {format: 'bold', check: () => selection.hasFormat('bold')},
        {format: 'italic', check: () => selection.hasFormat('italic')},
        {format: 'strikethrough', check: () => selection.hasFormat('strikethrough')},
        {format: 'code', check: () => selection.hasFormat('code')},
        {format: 'unorderedList', check: () => isNodeList(node, 'unordered')},
        {format: 'orderedList', check: () => isNodeList(node, 'ordered')},
        {format: 'heading', check: () => isNodeHeading(node)},
        {format: 'blockquote', check: () => isNodeBlockquote(node)},
      ];

      const activeFormats = formatChecks.filter(({check}) => check()).map(({format}) => format);

      setActiveFormats(prevFormats => {
        if (
          prevFormats.length !== activeFormats.length ||
          !prevFormats.every(format => activeFormats.includes(format))
        ) {
          return activeFormats;
        }
        return prevFormats;
      });
    });
  }, [editor]);

  useEffect(() => {
    return editor.registerUpdateListener(({editorState}) => {
      editorState.read(() => {
        updateToolbar();
      });
    });
  }, [editor, updateToolbar]);

  return {activeFormats};
};
