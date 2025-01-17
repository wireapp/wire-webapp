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

import {$isLinkNode} from '@lexical/link';
import {useLexicalComposerContext} from '@lexical/react/LexicalComposerContext';
import {$findMatchingParent} from '@lexical/utils';
import {$getSelection, $isRangeSelection, COMMAND_PRIORITY_LOW, CLICK_COMMAND} from 'lexical';

import {getSelectedNode} from '../../utils/getSelectedNode';

export function LinkClickPlugin({onLinkClick}: {onLinkClick: (node: any) => void}) {
  const [editor] = useLexicalComposerContext();

  useEffect(() => {
    return editor.registerCommand(
      CLICK_COMMAND,
      event => {
        const linkDomNode = (event.target as HTMLElement).closest('a');
        if (linkDomNode) {
          event.preventDefault();

          editor.getEditorState().read(() => {
            const selection = $getSelection();
            if ($isRangeSelection(selection)) {
              const node = getSelectedNode(selection);
              const linkNode = $findMatchingParent(node, $isLinkNode);
              if (linkNode) {
                onLinkClick(linkNode);
              }
            }
          });
        }
        return false;
      },
      COMMAND_PRIORITY_LOW,
    );
  }, [editor, onLinkClick]);

  return null;
}
