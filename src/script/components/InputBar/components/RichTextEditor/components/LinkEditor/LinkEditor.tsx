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

import {$isLinkNode} from '@lexical/link';
import {useLexicalComposerContext} from '@lexical/react/LexicalComposerContext';
import {$getSelection, $isRangeSelection} from 'lexical';

import {EDIT_LINK_COMMAND} from '../../editorConfig';
import {LinkClickPlugin} from '../../plugins/LinkClickPlugin/LinkClickPlugin';

export function LinkEditor() {
  const [editor] = useLexicalComposerContext();

  const handleLinkClick = (linkNode: any) => {
    editor.update(() => {
      if ($isLinkNode(linkNode)) {
        const selection = $getSelection();
        if ($isRangeSelection(selection)) {
          selection.setTextNodeRange(
            linkNode.getFirstChild(),
            0,
            linkNode.getFirstChild(),
            linkNode.getTextContent().length,
          );
        }
        editor.dispatchCommand(EDIT_LINK_COMMAND, undefined);
      }
    });
  };

  return <LinkClickPlugin onLinkClick={handleLinkClick} />;
}
