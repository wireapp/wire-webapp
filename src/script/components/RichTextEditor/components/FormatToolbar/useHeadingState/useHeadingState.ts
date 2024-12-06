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

import {useLexicalComposerContext} from '@lexical/react/LexicalComposerContext';
import {$getSelection, $isRangeSelection, $createParagraphNode, createCommand} from 'lexical';

import {headingCommand} from './headingCommand';

import {isNodeHeading} from '../common/isNodeHeading/isNodeHeading';

const INSERT_HEADING_COMMAND = createCommand();

export const useHeadingState = () => {
  const [editor] = useLexicalComposerContext();

  useEffect(() => {
    return editor.registerCommand(INSERT_HEADING_COMMAND, headingCommand, 0);
  }, [editor]);

  const toggleHeading = () => {
    editor.update(() => {
      const selection = $getSelection();

      if (!$isRangeSelection(selection)) {
        return;
      }

      const anchorNode = selection.anchor.getNode();
      const isHeading = isNodeHeading(anchorNode);

      if (!isHeading) {
        editor.dispatchCommand(INSERT_HEADING_COMMAND, {});
        return;
      }

      const paragraphNode = $createParagraphNode();
      const headingNode = anchorNode.getParent();

      if (!headingNode) {
        return;
      }

      headingNode.replace(paragraphNode);
      paragraphNode.append(...headingNode.getChildren());
    });
  };

  return {toggleHeading};
};
